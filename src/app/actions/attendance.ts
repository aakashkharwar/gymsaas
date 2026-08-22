'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { resolveOrgId } from '@/utils/supabase/org';
import { hasUnpaidDueInvoice, MEMBERSHIP_EXPIRED_MESSAGE } from '@/lib/membership-access';

function memberFromJoin(raw: unknown) {
  const member = Array.isArray(raw) ? raw[0] : raw;
  return (member || {}) as { id?: string; name?: string; phone?: string };
}

type AttendanceRow = {
  id: string;
  member_id: string;
  check_in_time: string;
  check_out_time?: string | null;
  sync_status?: string | null;
  marked_by?: string | null;
  members?: unknown;
};

function isMissingCheckoutColumn(message?: string | null) {
  const text = (message || '').toLowerCase();
  return text.includes('check_out_time') && (text.includes('schema cache') || text.includes('column'));
}

function pairSessions(rows: AttendanceRow[]) {
  const sorted = [...rows].sort((a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime());
  const usedOut = new Set<string>();
  const sessions: AttendanceRow[] = [];

  for (const row of sorted) {
    if (row.marked_by === 'out') continue;
    if (row.check_out_time) {
      sessions.push(row);
      continue;
    }
    const paired = sorted.find((candidate) => (
      candidate.marked_by === 'out' &&
      !usedOut.has(candidate.id) &&
      candidate.member_id === row.member_id &&
      new Date(candidate.check_in_time).getTime() >= new Date(row.check_in_time).getTime()
    ));
    if (paired) {
      usedOut.add(paired.id);
      sessions.push({ ...row, check_out_time: paired.check_in_time });
    } else {
      sessions.push(row);
    }
  }

  return sessions.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
}

export async function getTodayAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return [];

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const admin = await createPrivilegedClient();
  const query = () => admin
    .from('attendance')
    .select(`
      id,
      member_id,
      check_in_time,
      check_out_time,
      sync_status,
      marked_by,
      members ( id, name, phone )
    `)
    .eq('organization_id', orgId)
    .gte('check_in_time', since.toISOString())
    .order('check_in_time', { ascending: false });

  const first = await query();
  let rows = (first.data || []) as AttendanceRow[];
  let error = first.error;

  if (error && isMissingCheckoutColumn(error.message)) {
    const fallback = await admin
      .from('attendance')
      .select(`
        id,
        member_id,
        check_in_time,
        sync_status,
        marked_by,
        members ( id, name, phone )
      `)
      .eq('organization_id', orgId)
      .gte('check_in_time', since.toISOString())
      .order('check_in_time', { ascending: false });
    rows = (fallback.data || []) as AttendanceRow[];
    error = fallback.error;
  }

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  return pairSessions(rows).map((row) => ({
    ...row,
    members: memberFromJoin(row.members),
  }));
}

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

export async function markAttendanceByPhone(phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return { error: 'No organization found' };

  const variants = phoneCandidates(phone);
  if (variants.length === 0) return { error: 'Enter a valid 10-digit mobile number.' };

  const admin = await createPrivilegedClient();
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
  if (!member) return { error: 'This number is not registered. Add the member first.' };
  if (member.status && member.status !== 'active') return { error: 'This membership is not active.' };

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
  if (firstToday.error && isMissingCheckoutColumn(firstToday.error.message)) {
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
  const memberPhone = member.phone || variants[0];

  if (openSession) {
    const updated = await admin
      .from('attendance')
      .update({ check_out_time: now })
      .eq('id', openSession.id)
      .eq('organization_id', orgId);

    if (updated.error && isMissingCheckoutColumn(updated.error.message)) {
      const fallback = await admin.from('attendance').insert({
        organization_id: orgId,
        member_id: member.id,
        check_in_time: now,
        sync_status: 'synced',
        marked_by: 'out',
      });
      if (fallback.error) return { error: fallback.error.message };
    } else if (updated.error) {
      return { error: updated.error.message };
    }

    const minutes = Math.max(0, Math.round((new Date(now).getTime() - new Date(openSession.check_in_time).getTime()) / 60000));
    return {
      success: true as const,
      action: 'out' as const,
      memberName: member.name || 'Member',
      phone: memberPhone,
      checkInTime: openSession.check_in_time,
      checkOutTime: now,
      duration: formatMinutes(minutes),
    };
  }

  if (membershipBlocked) {
    return { error: MEMBERSHIP_EXPIRED_MESSAGE, code: 'membership_expired' as const };
  }

  const { error } = await admin.from('attendance').insert({
    organization_id: orgId,
    member_id: member.id,
    check_in_time: now,
    sync_status: 'synced',
    marked_by: 'desk',
  });
  if (error) return { error: error.message };

  return {
    success: true as const,
    action: 'in' as const,
    memberName: member.name || 'Member',
    phone: memberPhone,
    checkInTime: now,
  };
}

function formatMinutes(totalMins: number) {
  const mins = Math.max(0, totalMins);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export async function markAttendanceExit(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const orgId = await resolveOrgId(supabase, user);
  if (!orgId) return { error: 'No organization found' };

  const admin = await createPrivilegedClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('attendance')
    .update({ check_out_time: now })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error && isMissingCheckoutColumn(error.message)) {
    const { data: row } = await admin
      .from('attendance')
      .select('member_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!row?.member_id) return { error: 'Attendance record not found' };
    const insert = await admin.from('attendance').insert({
      organization_id: orgId,
      member_id: row.member_id,
      check_in_time: now,
      sync_status: 'synced',
      marked_by: 'out',
    });
    if (insert.error) return { error: insert.error.message };
    return { success: true, checkOutTime: now };
  }

  if (error) return { error: error.message };
  return { success: true, checkOutTime: now };
}
