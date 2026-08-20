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
      .from('ledgers')
      .select('*, members(name, phone)')
      .eq('organization_id', adminData.organization_id)
      .order('created_at', { ascending: false });

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data: ledgers, error } = await query;

    if (error) throw error;

    return NextResponse.json(ledgers || [], { status: 200 });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
