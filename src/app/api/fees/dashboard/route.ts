import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!adminData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = adminData.organization_id;

    // 1. Total collected today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: paymentsToday } = await supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', startOfToday.toISOString());

    const totalCollectedToday = paymentsToday?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // 2. Pending dues (all pending or partial invoices)
    const { data: pendingInvoices } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'partial', 'overdue']);

    const totalPendingDues = pendingInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

    // 3. Overdue members count
    const { count: overdueCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('status', 'overdue');

    // 4. Monthly collection
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: paymentsMonthly } = await supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', startOfMonth.toISOString());

    const totalCollectedMonth = paymentsMonthly?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return NextResponse.json({
      totalCollectedToday,
      totalPendingDues,
      overdueCount: overdueCount || 0,
      totalCollectedMonth
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
