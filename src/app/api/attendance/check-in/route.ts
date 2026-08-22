import { NextResponse } from 'next/server';
import { createAdminClient, tryCreateAdminClient } from '@/utils/supabase/admin';
import { hasUnpaidDueInvoice, MEMBERSHIP_EXPIRED_MESSAGE } from '@/lib/membership-access';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function digits(value: string) {
  return (value || '').replace(/\D/g, '');
}

function phoneCandidates(raw: string) {
  const all = digits(raw);
  const last10 = all.slice(-10);
  if (last10.length !== 10) return [];
  return Array.from(new Set([last10, `91${last10}`, `+91${last10}`, all]));
}

function istToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get('org') || '';
  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: 'Invalid gym QR' }, { status: 400 });
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Check-in is not configured' }, { status: 500 });
  }

  const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).maybeSingle();
  if (!org?.name) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  return NextResponse.json({ gymName: org.name });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orgId = String(body.org || '');
    const phone = String(body.phone || '');
    const variants = phoneCandidates(phone);

    if (!UUID_RE.test(orgId)) {
      return NextResponse.json({ error: 'Invalid gym QR. Ask reception for a new poster.' }, { status: 400 });
    }
    if (variants.length === 0) {
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: org } = await admin.from('organizations').select('id, name').eq('id', orgId).maybeSingle();
    if (!org) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    let { data: members } = await admin
      .from('members')
      .select('id, name, phone, status')
      .eq('organization_id', orgId)
      .in('phone', variants);

    if (!members?.length) {
      const last10 = variants[0];
      const fallback = await admin
        .from('members')
        .select('id, name, phone, status')
        .eq('organization_id', orgId)
        .like('phone', `%${last10}%`);
      members = fallback.data;
    }

    const member = members?.[0];
    if (!member) {
      return NextResponse.json({ error: 'This number is not registered at this gym. Ask reception to add you first.' }, { status: 404 });
    }
    if (member.status && member.status !== 'active') {
      return NextResponse.json({ error: 'Your membership is not active. Please contact reception.' }, { status: 403 });
    }

    const today = istToday();
    const { data: invoices } = await admin
      .from('invoices')
      .select('due_date, status')
      .eq('organization_id', orgId)
      .eq('member_id', member.id)
      .neq('status', 'paid');

    const membershipBlocked = hasUnpaidDueInvoice(invoices || [], today);
    type TodayRow = {
      id: string;
      check_in_time: string;
      marked_by: string | null;
      check_out_time?: string | null;
    };

    const firstToday = await admin
      .from('attendance')
      .select('id, check_in_time, check_out_time, marked_by')
      .eq('organization_id', orgId)
      .eq('member_id', member.id)
      .gte('check_in_time', `${today}T00:00:00+05:30`)
      .order('check_in_time', { ascending: false });

    let todayRows: TodayRow[] = (firstToday.data || []) as TodayRow[];

    if (firstToday.error && /check_out_time/i.test(firstToday.error.message)) {
      const fallbackToday = await admin
        .from('attendance')
        .select('id, check_in_time, marked_by')
        .eq('organization_id', orgId)
        .eq('member_id', member.id)
        .gte('check_in_time', `${today}T00:00:00+05:30`)
        .order('check_in_time', { ascending: false });
      todayRows = (fallbackToday.data || []) as TodayRow[];
    }

    const openSession = todayRows.find((row) => {
      if (row.marked_by === 'out') return false;
      if ('check_out_time' in row && row.check_out_time) return false;
      return !todayRows.some((candidate) => (
        candidate.marked_by === 'out' &&
        new Date(candidate.check_in_time).getTime() >= new Date(row.check_in_time).getTime()
      ));
    });
    const now = new Date().toISOString();

    if (!openSession && membershipBlocked) {
      return NextResponse.json({
        error: MEMBERSHIP_EXPIRED_MESSAGE,
        code: 'membership_expired',
      }, { status: 403 });
    }

    if (openSession) {
      const updated = await admin
        .from('attendance')
        .update({ check_out_time: now })
        .eq('id', openSession.id)
        .eq('organization_id', orgId);

      if (updated.error && /check_out_time/i.test(updated.error.message)) {
        const fallback = await admin.from('attendance').insert({
          organization_id: orgId,
          member_id: member.id,
          check_in_time: now,
          sync_status: 'synced',
          marked_by: 'out',
        });
        if (fallback.error) {
          console.error('Public checkout insert failed', fallback.error);
          return NextResponse.json({ error: 'Could not mark exit. Try again.' }, { status: 500 });
        }
      } else if (updated.error) {
        console.error('Public checkout update failed', updated.error);
        return NextResponse.json({ error: 'Could not mark exit. Try again.' }, { status: 500 });
      }

      const minutes = Math.max(0, Math.round((new Date(now).getTime() - new Date(openSession.check_in_time).getTime()) / 60000));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const duration = hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;

      return NextResponse.json({
        success: true,
        action: 'out',
        memberName: member.name,
        gymName: org.name,
        checkInTime: openSession.check_in_time,
        checkOutTime: now,
        duration,
      });
    }

    const { error } = await admin.from('attendance').insert({
      organization_id: orgId,
      member_id: member.id,
      check_in_time: now,
      sync_status: 'synced',
      marked_by: 'qr',
    });

    if (error) {
      console.error('Public check-in insert failed', error);
      return NextResponse.json({ error: 'Could not mark attendance. Try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'in',
      memberName: member.name,
      gymName: org.name,
      checkInTime: now,
    });
  } catch (err) {
    console.error('Public check-in error', err);
    return NextResponse.json({ error: 'Could not mark attendance. Try again.' }, { status: 500 });
  }
}
