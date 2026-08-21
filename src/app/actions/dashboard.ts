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
  if (!user) return { members: 0, overdue: 0, profit: 0, totalRevenue: 0, totalExpenses: 0, newMembers: 0, recentActivity: [], expiring: [] };

  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startIso = startOfMonth.toISOString();
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const until = inThreeDays.toISOString().split('T')[0];

  const [
    { count: memberCount },
    { count: overdueCount },
    { data: payments },
    { data: expenses },
    { count: newMembersCount },
    { data: expiringInvoices },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'paid'),
    supabase.from('payments').select('amount').gte('paid_at', startIso),
    supabase.from('expenses').select('amount').gte('expense_date', startIso),
    supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', startIso),
    supabase
      .from('invoices')
      .select('id, amount, due_date, members ( name, phone, email )')
      .neq('status', 'paid')
      .gte('due_date', today)
      .lte('due_date', until)
      .order('due_date', { ascending: true })
      .limit(8),
  ]);

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const profit = totalRevenue - totalExpenses;

  const expiring = (expiringInvoices || []).map((invoice) => {
    const raw = invoice.members as { name?: string; phone?: string; email?: string } | { name?: string; phone?: string; email?: string }[] | null
    const member = Array.isArray(raw) ? raw[0] : raw
    return {
      id: invoice.id as string,
      name: member?.name || 'Unknown member',
      phone: member?.phone || '',
      email: member?.email || '',
      dueDate: invoice.due_date as string,
      amount: Number(invoice.amount || 0),
    }
  })

  return {
    members: memberCount || 0,
    overdue: overdueCount || 0,
    profit,
    totalRevenue,
    totalExpenses,
    newMembers: newMembersCount || 0,
    expiring,
  };
}
