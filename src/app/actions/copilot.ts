'use server'

import { createClient } from '@/utils/supabase/server'
import { createPrivilegedClient } from '@/utils/supabase/admin'
import { resolveOrgId } from '@/utils/supabase/org'
import {
  answerOwnerQuery,
  daysBetween,
  istDateParts,
  mergeTodayAttendance,
  groupLocalAttendance,
  type CopilotAnswer,
  type CopilotCheckIn,
  type CopilotInvoice,
  type CopilotMember,
  type CopilotQuiet,
  type CopilotSnapshot,
  type LocalAttendanceHint,
} from '@/lib/owner-copilot'

function asMember(raw: unknown): { id?: string; name?: string; phone?: string } | null {
  if (!raw) return null
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') return null
  return row as { id?: string; name?: string; phone?: string }
}

function clock(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

export async function askOwnerCopilot(
  message: string,
  localAttendance?: LocalAttendanceHint[]
): Promise<CopilotAnswer> {
  const text = (message || '').trim().slice(0, 280)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { reply: 'Login ke baad copilot chalega.', suggestions: [] }
  }

  const orgId = await resolveOrgId(supabase, user)
  if (!orgId) {
    return { reply: 'Gym account nahi mila. Onboarding complete karo.', suggestions: [] }
  }

  const db = await createPrivilegedClient()
  const ist = istDateParts()
  const inThreeDays = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(new Date(`${ist.date}T12:00:00+05:30`).getTime() + 3 * 24 * 60 * 60 * 1000))

  const [
    orgRes,
    membersRes,
    overdueRes,
    expiringRes,
    todayPayRes,
    monthPayRes,
    monthExpRes,
    todayAttRes,
    recentAttRes,
  ] = await Promise.all([
    db.from('organizations').select('name').eq('id', orgId).maybeSingle(),
    db.from('members').select('id, name, phone, status, enrollment_date').eq('organization_id', orgId),
    db
      .from('invoices')
      .select('id, amount, due_date, member_id, members ( id, name, phone )')
      .eq('organization_id', orgId)
      .lt('due_date', ist.date)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })
      .limit(50),
    db
      .from('invoices')
      .select('id, amount, due_date, member_id, members ( id, name, phone )')
      .eq('organization_id', orgId)
      .neq('status', 'paid')
      .gte('due_date', ist.date)
      .lte('due_date', inThreeDays)
      .order('due_date', { ascending: true })
      .limit(20),
    db
      .from('payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', ist.todayStartIso)
      .lte('paid_at', ist.todayEndIso),
    db
      .from('payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', ist.monthStartIso),
    db
      .from('expenses')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('expense_date', ist.monthStart),
    db
      .from('attendance')
      .select('member_id, check_in_time, members ( id, name )')
      .eq('organization_id', orgId)
      .gte('check_in_time', ist.todayStartIso)
      .lte('check_in_time', ist.todayEndIso)
      .order('check_in_time', { ascending: false }),
    db
      .from('attendance')
      .select('member_id, check_in_time')
      .eq('organization_id', orgId)
      .gte('check_in_time', ist.quietSinceIso),
  ])

  const members: CopilotMember[] = (membersRes.data || []).map((m) => ({
    id: m.id as string,
    name: (m.name as string) || 'Unknown',
    phone: (m.phone as string) || '',
    status: (m.status as string) || 'active',
    enrollmentDate: (m.enrollment_date as string) || null,
  }))

  const toInvoice = (row: {
    member_id?: string
    amount?: number
    due_date?: string
    members?: unknown
  }): CopilotInvoice => {
    const mem = asMember(row.members)
    return {
      memberId: (mem?.id || row.member_id || '') as string,
      name: mem?.name || 'Unknown member',
      phone: mem?.phone || '',
      amount: Number(row.amount || 0),
      dueDate: String(row.due_date || ''),
    }
  }

  const attendanceByDate = groupLocalAttendance(localAttendance, ist.date)
  const todayAttendance: CopilotCheckIn[] = mergeTodayAttendance(
    (todayAttRes.data || []).map((row) => {
      const mem = asMember(row.members)
      return {
        memberId: (mem?.id || row.member_id || '') as string,
        name: mem?.name || 'Unknown',
        time: clock(row.check_in_time as string),
        status: 'present' as const,
      }
    }),
    attendanceByDate[ist.date] || []
  )
  attendanceByDate[ist.date] = todayAttendance

  const lastSeen = new Map<string, string>()
  for (const row of recentAttRes.data || []) {
    const id = row.member_id as string
    const t = row.check_in_time as string
    const prev = lastSeen.get(id)
    if (!prev || t > prev) lastSeen.set(id, t)
  }
  for (const row of localAttendance || []) {
    const name = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ').trim() || row.name || ''
    const member = members.find((m) => m.name.toLowerCase() === name.toLowerCase())
    if (!member) continue
    const stamp = row.createdAt || (row.date ? `${row.date}T12:00:00+05:30` : '')
    if (!stamp) continue
    const prev = lastSeen.get(member.id)
    if (!prev || stamp > prev) lastSeen.set(member.id, stamp)
  }

  const quiet: CopilotQuiet[] = members
    .filter((m) => m.status === 'active')
    .map((m) => {
      const last = lastSeen.get(m.id)
      const from = last || (m.enrollmentDate ? `${m.enrollmentDate}T00:00:00+05:30` : null)
      if (!from) return null
      const days = daysBetween(from, ist.date)
      if (days < 7) return null
      return { memberId: m.id, name: m.name, phone: m.phone, days }
    })
    .filter((row): row is CopilotQuiet => Boolean(row))
    .sort((a, b) => b.days - a.days)
    .slice(0, 12)

  const snapshot: CopilotSnapshot = {
    gymName: (orgRes.data?.name as string) || 'Gym',
    today: ist.date,
    members,
    overdue: (overdueRes.data || []).map(toInvoice),
    expiring: (expiringRes.data || []).map(toInvoice),
    todayAttendance,
    attendanceByDate,
    todayCollection: (todayPayRes.data || []).reduce((s, p) => s + Number(p.amount || 0), 0),
    monthCollection: (monthPayRes.data || []).reduce((s, p) => s + Number(p.amount || 0), 0),
    monthExpenses: (monthExpRes.data || []).reduce((s, p) => s + Number(p.amount || 0), 0),
    quiet,
    hasAttendanceData:
      (recentAttRes.data || []).length > 0 ||
      Object.values(attendanceByDate).some((rows) => rows.length > 0),
  }

  return answerOwnerQuery(snapshot, text)
}
