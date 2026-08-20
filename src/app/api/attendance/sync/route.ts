import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const records = Array.isArray(body.records) ? body.records : [];

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { data: admin } = await supabase
      .from('admin_users')
      .select('organization_id')
      .eq('id', userData.user.id)
      .single();

    if (!admin?.organization_id) return NextResponse.json({ error: 'no org found' }, { status: 403 });

    // Fetch members to resolve ids
    const { data: members } = await supabase
      .from('members')
      .select('id, phone')
      .eq('organization_id', admin.organization_id);

    const results = [];

    for (const record of records) {
      // Try to find member by phone (username in form)
      const member = members?.find(m => m.phone === record.username);
      
      if (!member) {
        results.push({ id: record.id, status: 'failed', reason: 'Member not found' });
        continue;
      }

      // We combine date + entryTime
      const checkInDate = new Date(`${record.date}T${record.entryTime || '00:00'}:00`);

      const { error } = await supabase.from('attendance').insert({
        organization_id: admin.organization_id,
        member_id: member.id,
        check_in_time: checkInDate.toISOString(),
        sync_status: 'synced',
        marked_by: 'qr'
      });

      if (error) {
        console.error('Attendance insert error', error);
        results.push({ id: record.id, status: 'failed', reason: error.message });
      } else {
        results.push({ id: record.id, status: 'synced' });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error('Sync error', err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
