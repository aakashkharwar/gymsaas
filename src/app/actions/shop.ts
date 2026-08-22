'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { resolveOrgId } from '@/utils/supabase/org';

export async function recordShopSale(input: {
  memberId: string;
  productName: string;
  quantity: number;
  amount: number;
  paymentMode: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return { error: 'No organization found' };

  const memberId = String(input.memberId || '');
  const productName = String(input.productName || '').trim();
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 0));
  const amount = Number(input.amount);
  const paymentMode = String(input.paymentMode || 'Cash');

  if (!memberId) return { error: 'Select a member.' };
  if (!productName) return { error: 'Select a product.' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount looks invalid.' };

  const admin = await createPrivilegedClient();
  const { data: member } = await admin
    .from('members')
    .select('id, name')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!member) return { error: 'Member not found.' };

  const { error } = await admin.from('payments').insert({
    organization_id: orgId,
    member_id: memberId,
    amount,
    payment_mode: paymentMode,
    notes: `[SHOP] ${productName} × ${quantity}`,
    paid_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Shop sale insert failed', error);
    return { error: error.message };
  }

  return { success: true, memberName: member.name || 'Member' };
}

export async function getShopSales() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return [];

  const admin = await createPrivilegedClient();
  const { data, error } = await admin
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
    .like('notes', '[SHOP]%')
    .order('paid_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Shop sales fetch failed', error);
    return [];
  }
  return data || [];
}
