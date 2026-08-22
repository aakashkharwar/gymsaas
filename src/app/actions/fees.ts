'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { resolveOrgId } from '@/utils/supabase/org';
import { sendMemberReminder, sendOwnerSummary } from '@/utils/whatsapp';
import { sendMembershipExpiryEmail } from '@/utils/email';
import { dateOnly, invoiceDueOnOrBefore, istToday, nextInvoiceDueDate } from '@/lib/membership-access';

async function requireOrg() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, user: null as null, orgId: null as string | null };
  const orgId = await resolveOrgId(supabase, userData.user);
  return { supabase, user: userData.user, orgId };
}

export async function getFees() {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return [];
  const adminSupabase = await createPrivilegedClient();
  const { data: fees, error } = await adminSupabase
    .from('payments')
    .select(`
      id,
      amount,
      paid_at,
      payment_mode,
      notes,
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
  const adminSupabase = await createPrivilegedClient();
  const today = istToday();
  
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
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return [];

  const adminSupabase = await createPrivilegedClient();
  const { data } = await adminSupabase.from('fee_plans').select('*').eq('organization_id', orgId);
  return data || [];
}

export async function addFeePlan(formData: FormData) {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return { error: 'Unauthorized' };

  const name = String(formData.get('name'));
  const amount = Number(formData.get('amount'));
  const duration_months = Number(formData.get('duration_months'));

  const adminSupabase = await createPrivilegedClient();
  const { data, error } = await adminSupabase.from('fee_plans').insert({
    organization_id: orgId,
    name,
    amount,
    duration_months
  }).select('*').single();

  if (error) {
    console.error('Error adding fee plan:', error);
    return { error: error.message };
  }

  return { success: true, plan: data };
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
  const adminSupabase = await createPrivilegedClient();
  const today = istToday();
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
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return [];
  const adminSupabase = await createPrivilegedClient();
  const { data } = await adminSupabase.from('invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  return (data || []).map((row) => ({ ...row, due_date: dateOnly(row.due_date) }));
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
  const adminSupabase = await createPrivilegedClient();

  const member_id = String(formData.get('member_id'));
  const fee_plan_id = String(formData.get('fee_plan_id'));
  const due_date = String(formData.get('due_date'));

  const { data: plan } = await adminSupabase.from('fee_plans').select('amount').eq('id', fee_plan_id).single();
  if (!plan) return { error: 'Fee plan not found' };

  const { data: invoice, error } = await adminSupabase.from('invoices').insert({
    organization_id: orgId,
    member_id,
    fee_plan_id,
    amount: plan.amount,
    due_date,
    status: 'pending'
  }).select('*').single();

  if (error) {
    console.error('Error adding invoice:', error);
    return { error: error.message };
  }

  void Promise.all([
    adminSupabase.from('members').select('name, email').eq('id', member_id).maybeSingle(),
    adminSupabase.from('organizations').select('name').eq('id', orgId).maybeSingle(),
  ]).then(([{ data: member }, { data: org }]) => {
    if (!member?.email || !member.name) return;
    sendMembershipExpiryEmail({
      memberEmail: member.email,
      memberName: member.name,
      gymName: org?.name || 'the gym',
      dueDate: due_date,
      amount: Number(plan.amount),
    }).catch((err) => console.error('fee due email failed:', err));
  });

  return { success: true, invoice: { ...invoice, due_date: dateOnly(invoice.due_date) } };
}

export async function addPayment(formData: FormData) {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return { error: 'Unauthorized' };
  const adminSupabase = await createPrivilegedClient();

  const member_id = String(formData.get('member_id'));
  const invoice_id = formData.get('invoice_id') ? String(formData.get('invoice_id')) : null;
  const amount = Number(formData.get('amount'));
  const payment_mode = String(formData.get('payment_mode'));
  const receipt_no = formData.get('receipt_no') ? String(formData.get('receipt_no')) : null;
  const notes = formData.get('notes') ? String(formData.get('notes')) : null;
  const due_date = String(formData.get('due_date') ?? '').trim();

  if (!due_date) return { error: 'Due date is required.' };

  const [{ data: member }, { data: unpaid }] = await Promise.all([
    adminSupabase
      .from('members')
      .select('id, fee_plan_id, status')
      .eq('id', member_id)
      .eq('organization_id', orgId)
      .maybeSingle(),
    adminSupabase
      .from('invoices')
      .select('id, amount, due_date, status, fee_plan_id')
      .eq('organization_id', orgId)
      .eq('member_id', member_id)
      .in('status', ['pending', 'partial', 'overdue']),
  ]);
  if (!member) return { error: 'Member not found.' };

  const openInvoices = (unpaid || []).map((row) => ({ ...row, due_date: dateOnly(row.due_date) }))
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const selected = invoice_id
    ? openInvoices.find((row) => row.id === invoice_id) || openInvoices[0] || null
    : openInvoices[0] || null;

  let planAmount = amount;
  let durationMonths = 1;
  const planId = member.fee_plan_id || selected?.fee_plan_id || null;
  if (planId) {
    const { data: plan } = await adminSupabase
      .from('fee_plans')
      .select('id, amount, duration_months')
      .eq('id', planId)
      .maybeSingle();
    if (plan?.amount != null) planAmount = Number(plan.amount);
    if (plan?.duration_months) durationMonths = Number(plan.duration_months);
  }

  const paidStatus = selected && amount >= Number(selected.amount ?? amount) ? 'paid' : selected ? 'partial' : 'paid';
  const today = istToday();
  let saveDue = dateOnly(selected?.due_date || due_date);
  if (paidStatus === 'paid' && invoiceDueOnOrBefore(saveDue, today)) {
    saveDue = nextInvoiceDueDate(saveDue, durationMonths, today);
  }

  let paidInvoice: Record<string, unknown> | null = selected
    ? { ...selected, status: paidStatus, due_date: paidStatus === 'paid' ? saveDue : selected.due_date }
    : null;

  const invoiceWrite = selected
    ? adminSupabase
        .from('invoices')
        .update({
          status: paidStatus,
          ...(paidStatus === 'paid' ? { due_date: saveDue } : {}),
        })
        .eq('id', selected.id)
        .eq('organization_id', orgId)
    : adminSupabase.from('invoices').insert({
        organization_id: orgId,
        member_id,
        fee_plan_id: planId,
        amount: planAmount,
        due_date: saveDue,
        status: paidStatus,
      }).select('*').single();

  const [{ error: paymentError }, invoiceResult] = await Promise.all([
    adminSupabase.from('payments').insert({
      organization_id: orgId,
      member_id,
      invoice_id: selected?.id || null,
      amount,
      payment_mode,
      receipt_no,
      notes,
      paid_at: new Date().toISOString(),
    }),
    invoiceWrite,
  ]);
  if (paymentError) {
    console.error('Error adding payment:', paymentError);
    return { error: paymentError.message };
  }
  if (invoiceResult.error) {
    console.error('Error updating invoice after payment:', invoiceResult.error);
    return { error: invoiceResult.error.message };
  }

  if (!selected && 'data' in invoiceResult && invoiceResult.data) {
    paidInvoice = { ...invoiceResult.data, due_date: dateOnly(invoiceResult.data.due_date) };
  }

  if (paidStatus === 'paid') {
    await adminSupabase
      .from('members')
      .update({ status: 'active' })
      .eq('id', member_id)
      .eq('organization_id', orgId);
  }

  return {
    success: true,
    paidInvoiceId: String(paidInvoice?.id || selected?.id || ''),
    paidStatus,
    paidInvoice,
    nextDue: saveDue,
    memberId: member_id,
  };
}
export async function updateFeePlan(id: string, formData: FormData) {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return { error: 'Unauthorized' };

  const name = String(formData.get('name'));
  const amount = Number(formData.get('amount'));
  const duration_months = Number(formData.get('duration_months'));

  const adminSupabase = await createPrivilegedClient();
  const { error } = await adminSupabase.from('fee_plans').update({
    name,
    amount,
    duration_months
  }).eq('id', id).eq('organization_id', orgId);

  if (error) {
    console.error('Error updating fee plan:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteFeePlan(id: string) {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return { error: 'Unauthorized' };

  const adminSupabase = await createPrivilegedClient();
  const { error } = await adminSupabase.from('fee_plans').delete().eq('id', id).eq('organization_id', orgId);

  if (error) {
    console.error('Error deleting fee plan:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function getOrganizationDetails() {
  const { user, orgId } = await requireOrg();
  if (!user || !orgId) return null;
  const adminSupabase = await createPrivilegedClient();
  const { data } = await adminSupabase.from('organizations').select('name, address').eq('id', orgId).single();
  return data;
}

export async function triggerFeeReminders() {
  const { user, orgId } = await requireOrg();
  if (!user) return { error: 'Please log in to send reminders.' };
  if (!orgId) return { error: 'No organization found.' };

  const supabase = await createPrivilegedClient();
  const today = istToday();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, owner_phone')
    .eq('id', orgId)
    .maybeSingle();

  const { data: openInvoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      amount,
      due_date,
      status,
      members (
        id,
        name,
        phone,
        email
      )
    `)
    .eq('organization_id', orgId)
    .in('status', ['pending', 'partial', 'overdue']);

  if (error) return { error: error.message };

  const dueNow = (openInvoices || []).filter((row) => (
    row.status !== 'paid' && invoiceDueOnOrBefore(row.due_date, today)
  ));

  if (dueNow.length) {
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .in('id', dueNow.map((row) => row.id))
      .eq('organization_id', orgId);
  }

  if (!dueNow.length) {
    return { success: true, message: 'No pending or overdue invoices to remind.' };
  }

  let sent = 0;
  let totalAmount = 0;

  for (const invoice of dueNow) {
    const raw = invoice.members;
    const member = (Array.isArray(raw) ? raw[0] : raw) as { id?: string; name?: string; phone?: string; email?: string } | null;
    if (!member?.name) continue;

    if (member.email) {
      await sendMembershipExpiryEmail({
        memberEmail: member.email,
        memberName: member.name,
        gymName: org?.name || 'the gym',
        dueDate: invoice.due_date,
        amount: Number(invoice.amount),
      });
    }

    if (member.phone) {
      await sendMemberReminder(member.phone, member.name, org?.name || 'Gym', invoice.amount, invoice.due_date);
    }

    sent += 1;
    totalAmount += Number(invoice.amount);
  }

  if (sent > 0 && org?.owner_phone) {
    await sendOwnerSummary(org.owner_phone, org.name, sent, totalAmount);
  }

  return {
    success: true,
    message: `${dueNow.length} invoice${dueNow.length === 1 ? '' : 's'} marked overdue${sent ? `, ${sent} reminder${sent === 1 ? '' : 's'} sent` : ''}.`,
  };
}
