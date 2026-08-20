'use server'

import { createClient } from '@/utils/supabase/server';
import { unstable_rethrow } from 'next/navigation';

export async function getGymName() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'GYM NAME';
    
    // Attempt 1: Using owner_email
    const { data: orgByEmail } = await supabase
      .from('organizations')
      .select('name')
      .eq('owner_email', user.email)
      .limit(1)
      .single();
      
    if (orgByEmail?.name) {
      return orgByEmail.name;
    }
    
    // Attempt 2: Direct query (if RLS allows)
    const { data: orgs, error: orgsErr } = await supabase
      .from('organizations')
      .select('name')
      .limit(1);
      
    if (orgs && orgs.length > 0) {
      return orgs[0].name;
    }
    
    // Attempt 3: Through admin_users mapping
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
      
    if (adminUser?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', adminUser.organization_id)
        .single();
      if (org) return org.name;
    }
    
    console.error("No org found. orgsErr:", orgsErr);
    return 'GYM NAME';
  } catch (err) {
    unstable_rethrow(err);
    console.error("Error in getGymName:", err);
    return 'GYM NAME';
  }
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { members: 0, overdue: 0, profit: 0, totalRevenue: 0, totalExpenses: 0, newMembers: 0, recentActivity: [] };

  // Fetch all members count
  const { count: memberCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });

  // Fetch overdue invoices count
  const today = new Date().toISOString().split('T')[0];
  const { count: overdueCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .lt('due_date', today)
    .neq('status', 'paid');

  // Calculate Monthly Profit (Current Month Payments - Expenses)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .gte('paid_at', startOfMonth.toISOString());

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', startOfMonth.toISOString());

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const profit = totalRevenue - totalExpenses;

  const { count: newMembersCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  return {
    members: memberCount || 0,
    overdue: overdueCount || 0,
    profit,
    totalRevenue,
    totalExpenses,
    newMembers: newMembersCount || 0
  };
}
