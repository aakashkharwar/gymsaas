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

    const { data: plans, error } = await supabase
      .from('fee_plans')
      .select('*')
      .eq('organization_id', adminData.organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(plans || [], { status: 200 });
  } catch (error) {
    console.error('Error fetching fee plans:', error);
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
    const { name, amount, duration_months, late_fee, description } = body;

    if (!name || amount === undefined || !duration_months) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from('fee_plans')
      .insert({
        organization_id: adminData.organization_id,
        name,
        amount,
        duration_months,
        late_fee: late_fee || 0,
        description: description || ''
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating fee plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
