'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { resolveOrgId } from '@/utils/supabase/org';

export async function getExpenses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return [];

  const adminSupabase = await createPrivilegedClient();
  const { data: expenses, error } = await adminSupabase
    .from('expenses')
    .select('*')
    .eq('organization_id', orgId)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return expenses;
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return { error: 'No organization found' };

  const category = formData.get('category') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const expense_date = formData.get('expense_date') as string;
  const notes = formData.get('notes') as string;

  const adminSupabase = await createPrivilegedClient();
  const { error } = await adminSupabase
    .from('expenses')
    .insert([
      {
        organization_id: orgId,
        category,
        amount,
        expense_date,
        notes,
        recorded_by: user.id
      }
    ]);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
