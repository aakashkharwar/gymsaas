import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendMembershipExpiryEmail, sendOwnerExpiryDigest } from '@/utils/email'

function isAuthorized(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  if (req.headers.get('x-vercel-cron') === '1') return true
  return false
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const today = new Date()
    const start = today.toISOString().split('T')[0]
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 3)
    const end = endDate.toISOString().split('T')[0]

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        due_date,
        status,
        organization_id,
        members ( id, name, email, phone )
      `)
      .in('status', ['pending', 'overdue', 'partial'])
      .gte('due_date', start)
      .lte('due_date', end)

    if (error) throw error

    const rows = invoices || []
    const orgIds = [...new Set(rows.map((row) => row.organization_id).filter(Boolean))]
    const { data: orgs } = orgIds.length
      ? await supabase.from('organizations').select('id, name, owner_email').in('id', orgIds)
      : { data: [] as Array<{ id: string; name: string; owner_email: string | null }> }

    const orgById = new Map((orgs || []).map((org) => [org.id, org]))
    let emailed = 0
    const byOwner = new Map<string, { gymName: string; ownerEmail: string; members: Array<{ name: string; dueDate: string; amount?: number; email?: string; phone?: string }> }>()

    for (const invoice of rows) {
      const memberRaw = invoice.members as { name?: string; email?: string; phone?: string } | { name?: string; email?: string; phone?: string }[] | null
      const member = Array.isArray(memberRaw) ? memberRaw[0] : memberRaw
      const org = orgById.get(invoice.organization_id)
      const gymName = org?.name || 'your gym'

      if (member?.email && member.name) {
        await sendMembershipExpiryEmail({
          memberEmail: member.email,
          memberName: member.name,
          gymName,
          dueDate: String(invoice.due_date ?? ''),
          amount: Number(invoice.amount),
        })
        emailed += 1
      }

      if (org?.owner_email) {
        const current = byOwner.get(org.owner_email) || {
          gymName,
          ownerEmail: org.owner_email,
          members: [] as Array<{ name: string; dueDate: string; amount?: number; email?: string; phone?: string }>,
        }
        current.members.push({
          name: member?.name ?? 'Unknown member',
          dueDate: String(invoice.due_date ?? ''),
          amount: Number(invoice.amount),
          email: member?.email ?? undefined,
          phone: member?.phone ?? undefined,
        })
        byOwner.set(org.owner_email, current)
      }
    }

    for (const digest of byOwner.values()) {
      await sendOwnerExpiryDigest({
        ownerEmail: digest.ownerEmail,
        gymName: digest.gymName,
        rows: digest.members,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Emailed ${emailed} members. Notified ${byOwner.size} owner${byOwner.size === 1 ? '' : 's'}.`,
    })
  } catch (error: unknown) {
    console.error('membership reminder cron failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
