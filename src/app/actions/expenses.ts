'use server'

import { createClient } from '@/utils/supabase/server';

export async function getExpenses() {
  const supabase = await createClient();
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
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

  const { data: admin } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!admin?.organization_id) return { error: 'No organization found' };

  const category = formData.get('category') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const expense_date = formData.get('expense_date') as string;
  const notes = formData.get('notes') as string;

  const { error } = await supabase
    .from('expenses')
    .insert([
      {
        organization_id: admin.organization_id,
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
