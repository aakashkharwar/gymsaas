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

    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');

    let query = supabase
      .from('invoices')
      .select('*, members(name, phone), fee_plans(name)')
      .eq('organization_id', adminData.organization_id)
      .order('due_date', { ascending: false });

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    return NextResponse.json(invoices || [], { status: 200 });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { member_id, fee_plan_id, amount, due_date } = body;

    if (!member_id || amount === undefined || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: adminData.organization_id,
        member_id,
        fee_plan_id,
        amount,
        due_date,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: create a ledger entry for the charge (debit)
    await supabase.from('ledgers').insert({
        organization_id: adminData.organization_id,
        member_id,
        type: 'debit',
        amount: amount,
        balance_after: amount, // simplify for now, realistically needs a sum query
        reference_id: invoice.id
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
