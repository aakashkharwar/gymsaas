'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getFees() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return [];
  const adminSupabase = createAdminClient();
  const { data: fees, error } = await adminSupabase
    .from('payments')
    .select(`
      id,
      amount,
      paid_at,
      payment_mode,
      members ( id, name, phone )
    `)
    .eq('organization_id', orgId)
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('Error fetching fees:', error);
    return [];
  }
  return fees;
}

export async function getOverdueMembers() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return [];
  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data: overdue, error } = await adminSupabase
    .from('invoices')
    .select(`
      id,
      amount,
      due_date,
      members ( id, name, phone )
    `)
    .lt('due_date', today)
    .neq('status', 'paid')
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching overdue fees:', error);
    return [];
  }
  return overdue;
}

export async function getFeePlans() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', user.id).single();
  if (admin?.organization_id) {
    orgId = admin.organization_id;
  } else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return [];

  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase.from('fee_plans').select('*').eq('organization_id', orgId);
  return data || [];
}

export async function addFeePlan(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Unauthorized' };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) {
    orgId = admin.organization_id;
  } else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };

  const name = String(formData.get('name'));
  const amount = Number(formData.get('amount'));
  const duration_months = Number(formData.get('duration_months'));

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('fee_plans').insert({
    organization_id: orgId,
    name,
    amount,
    duration_months
  });

  if (error) {
    console.error('Error adding fee plan:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/fees');
  return { success: true };
}

export async function getFeeDashboardStats() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { totalCollectedToday: 0, totalCollectedMonth: 0, totalPendingDues: 0, overdueCount: 0 };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { totalCollectedToday: 0, totalCollectedMonth: 0, totalPendingDues: 0, overdueCount: 0 };
  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);
  const monthStr = startOfMonth.toISOString();
  
  const { data: payments } = await adminSupabase.from('payments').select('amount, paid_at').gte('paid_at', monthStr).eq('organization_id', orgId);
  const totalMonth = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalToday = payments?.filter(p => p.paid_at.startsWith(today)).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  const { data: invoices } = await adminSupabase.from('invoices').select('amount, status, due_date').neq('status', 'paid').eq('organization_id', orgId);
  const pendingInvoices = invoices?.filter(i => i.status === 'pending' || i.status === 'partial') || [];
  const overdueInvoices = invoices?.filter(i => i.status === 'overdue' || (i.due_date && i.due_date < today)) || [];
  const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0) + overdueInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  
  return { totalCollectedToday: totalToday, totalCollectedMonth: totalMonth, totalPendingDues: totalPending, overdueCount: overdueInvoices.length };
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return [];
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase.from('invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  return data || [];
}

export async function addInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Unauthorized' };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };
  const adminSupabase = createAdminClient();

  const member_id = String(formData.get('member_id'));
  const fee_plan_id = String(formData.get('fee_plan_id'));
  const due_date = String(formData.get('due_date'));

  const { data: plan } = await adminSupabase.from('fee_plans').select('amount').eq('id', fee_plan_id).single();
  if (!plan) return { error: 'Fee plan not found' };

  const { error } = await adminSupabase.from('invoices').insert({
    organization_id: orgId,
    member_id,
    fee_plan_id,
    amount: plan.amount,
    due_date,
    status: 'pending'
  });

  if (error) {
    console.error('Error adding invoice:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/fees');
  revalidatePath('/dashboard/fees/invoices');
  return { success: true };
}

export async function addPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Unauthorized' };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };
  const adminSupabase = createAdminClient();

  const member_id = String(formData.get('member_id'));
  const invoice_id = formData.get('invoice_id') ? String(formData.get('invoice_id')) : null;
  const amount = Number(formData.get('amount'));
  const payment_mode = String(formData.get('payment_mode'));
  const receipt_no = formData.get('receipt_no') ? String(formData.get('receipt_no')) : null;
  const notes = formData.get('notes') ? String(formData.get('notes')) : null;

  const { error } = await adminSupabase.from('payments').insert({
    organization_id: orgId,
    member_id,
    invoice_id,
    amount,
    payment_mode,
    receipt_no,
    notes,
    paid_at: new Date().toISOString()
  });

  if (error) {
    console.error('Error adding payment:', error);
    return { error: error.message };
  }

  if (invoice_id) {
    const { data: inv } = await adminSupabase.from('invoices').select('amount').eq('id', invoice_id).single();
    if (inv) {
      const newStatus = amount >= inv.amount ? 'paid' : 'partial';
      await adminSupabase.from('invoices').update({ status: newStatus }).eq('id', invoice_id);
    }
  }

  revalidatePath('/dashboard/fees');
  revalidatePath('/dashboard/fees/collections');
  return { success: true };
}
export async function updateFeePlan(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Unauthorized' };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };

  const name = String(formData.get('name'));
  const amount = Number(formData.get('amount'));
  const duration_months = Number(formData.get('duration_months'));

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('fee_plans').update({
    name,
    amount,
    duration_months
  }).eq('id', id).eq('organization_id', orgId);

  if (error) {
    console.error('Error updating fee plan:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/fees/plans');
  return { success: true };
}

export async function deleteFeePlan(id: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Unauthorized' };

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from('fee_plans').delete().eq('id', id).eq('organization_id', orgId);

  if (error) {
    console.error('Error deleting fee plan:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/fees/plans');
  return { success: true };
}

export async function getOrganizationDetails() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  let orgId = null;
  const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', userData.user.id).single();
  if (admin?.organization_id) orgId = admin.organization_id;
  else {
    const { data: orgByEmail } = await supabase.from('organizations').select('id').eq('owner_email', userData.user.email).limit(1).single();
    if (orgByEmail?.id) orgId = orgByEmail.id;
    else {
      const { data: anyOrg } = await supabase.from('organizations').select('id').limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return null;
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase.from('organizations').select('name, address').eq('id', orgId).single();
  return data;
}
