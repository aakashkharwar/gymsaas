export type CopilotMember = {
  id: string
  name: string
  phone: string
  status: string
  enrollmentDate?: string | null
}

export type CopilotInvoice = {
  memberId: string
  name: string
  phone: string
  amount: number
  dueDate: string
}

export type CopilotCheckIn = {
  memberId: string
  name: string
  time: string
  status?: 'present' | 'absent'
}

export type LocalAttendanceHint = {
  id?: string
  date?: string
  createdAt?: string
  firstName?: string
  middleName?: string
  lastName?: string
  name?: string
  status?: string
  entryTime?: string
}

export type CopilotQuiet = {
  memberId: string
  name: string
  phone: string
  days: number
}

export type CopilotSnapshot = {
  gymName: string
  today: string
  members: CopilotMember[]
  overdue: CopilotInvoice[]
  expiring: CopilotInvoice[]
  todayAttendance: CopilotCheckIn[]
  attendanceByDate: Record<string, CopilotCheckIn[]>
  todayCollection: number
  monthCollection: number
  monthExpenses: number
  quiet: CopilotQuiet[]
  hasAttendanceData: boolean
}

export type CopilotAnswer = {
  reply: string
  suggestions: string[]
}

const INR = new Intl.NumberFormat('en-IN')

const DEFAULT_SUGGESTIONS = [
  'Aaj kitne aaye?',
  'Aaj kaun absent hai?',
  'Kitna collection?',
  'Kaun pending hai?',
]

const STOP = new Set([
  'aaj', 'kal', 'kitna', 'kitne', 'kitni', 'hai', 'hain', 'ka', 'ki', 'ke', 'ko', 'se',
  'me', 'mein', 'mai', 'kya', 'kaun', 'kon', 'fee', 'fees', 'pending', 'overdue', 'due',
  'collection', 'collect', 'attendance', 'aaye', 'aya', 'aaya', 'gaya', 'gaye', 'gya',
  'member', 'members', 'profit', 'kharcha', 'kharch', 'munafa', 'expense', 'expenses',
  'revenue', 'payment', 'payments', 'paid', 'phone', 'number', 'call', 'status', 'plan',
  'the', 'is', 'are', 'of', 'for', 'how', 'many', 'much', 'who', 'what', 'today',
  'yesterday', 'month', 'this', 'my', 'gym', 'bhai', 'ji', 'wala', 'wali', 'batao',
  'bata', 'dikhao', 'show', 'tell', 'me', 'please', 'pls', 'rupee', 'rs', 'rupaye',
  'and', 'or', 'not', 'nahi', 'nhi', 'days', 'din', 'absent', 'quiet', 'chhod',
  'expire', 'expiring', 'expiry', 'brief', 'summary', 'report', 'hello', 'hi', 'hey',
  'namaste', 'help', 'total', 'list', 'sab', 'saare', 'saara', 'log', 'logo', 'wala',
  'checkin', 'check', 'in', 'scan', 'qr', 'profit', 'loss', 'p-l', 'pl',
])

function rupees(n: number) {
  return `₹${INR.format(Math.round(n || 0))}`
}

function hasDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text)
}

function normalize(q: string) {
  return q
    .toLowerCase()
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function foldHinglish(text: string) {
  return normalize(text)
    .replace(/\bhaii+\b/g, 'hai')
    .replace(/\baaj+\b/g, 'aaj')
    .replace(/\baj\b/g, 'aaj')
    .replace(/\bkon\b/g, 'kaun')
    .replace(/\bnhi\b/g, 'nahi')
    .replace(/\baayaa?\b/g, 'aaya')
    .replace(/\btodya\b/g, 'today')
    .replace(/\babsnt\b/g, 'absent')
}

function wantsHindi(q: string) {
  if (hasDevanagari(q)) return true
  const f = foldHinglish(q)
  return /\b(kitna|kitne|kitni|aaj|aaye|aaya|hai|hain|kaun|pending|kharcha|munafa|batao|nahi|namaste|fee|collection|absent)\b/i.test(f)
}

function shiftIstDate(date: string, days: number) {
  const t = new Date(`${date}T12:00:00+05:30`).getTime() + days * 24 * 60 * 60 * 1000
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(t))
}

function resolveQueryDate(q: string, today: string) {
  if (/\b(kal|yesterday)\b/.test(q)) return shiftIstDate(today, -1)
  const iso = q.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]
  const dmy = q.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const yearRaw = dmy[3]
    const year = !yearRaw ? today.slice(0, 4) : yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    return `${year}-${month}-${day}`
  }
  return today
}

function dayLabel(date: string, today: string, hindi: boolean) {
  if (date === today) return hindi ? 'Aaj' : 'Today'
  if (date === shiftIstDate(today, -1)) return hindi ? 'Kal' : 'Yesterday'
  return date
}

function rowsForDate(snapshot: CopilotSnapshot, date: string) {
  if (date === snapshot.today) return snapshot.todayAttendance
  return snapshot.attendanceByDate[date] || []
}

function nameCandidates(q: string) {
  return normalize(q)
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
}

function matchMembers(snapshot: CopilotSnapshot, q: string) {
  const digits = q.replace(/\D/g, '')
  if (digits.length >= 10) {
    const phoneHits = snapshot.members.filter((m) => m.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
    if (phoneHits.length) return phoneHits
  }

  const tokens = nameCandidates(q)
  if (!tokens.length) return []

  const scored = snapshot.members
    .map((m) => {
      const name = m.name.toLowerCase()
      const hit = tokens.find((t) => name.includes(t))
      return hit ? m : null
    })
    .filter((m): m is CopilotMember => Boolean(m))

  const unique = new Map(scored.map((m) => [m.id, m]))
  return [...unique.values()]
}

function lineOverdue(rows: CopilotInvoice[], hindi: boolean) {
  if (!rows.length) {
    return hindi ? 'Kisi ka fee pending nahi hai. Sab clear hai.' : 'No overdue fees. Everyone is clear.'
  }
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const list = rows
    .slice(0, 8)
    .map((r) => `${r.name} (${rupees(r.amount)}, due ${r.dueDate})`)
    .join('\n')
  const extra = rows.length > 8 ? `\n+${rows.length - 8} more` : ''
  if (hindi) {
    return `Pending fee — ${rows.length} log, total ${rupees(total)}:\n${list}${extra}`
  }
  return `Overdue — ${rows.length} members, total ${rupees(total)}:\n${list}${extra}`
}

function memberFee(snapshot: CopilotSnapshot, member: CopilotMember, hindi: boolean) {
  const dues = snapshot.overdue.filter((o) => o.memberId === member.id)
  const exp = snapshot.expiring.filter((o) => o.memberId === member.id)
  if (dues.length) {
    const total = dues.reduce((s, r) => s + r.amount, 0)
    return hindi
      ? `${member.name} ka ${rupees(total)} pending hai (due ${dues[0].dueDate}). Phone: ${member.phone || 'saved nahi'}.`
      : `${member.name} owes ${rupees(total)} (due ${dues[0].dueDate}). Phone: ${member.phone || 'not saved'}.`
  }
  if (exp.length) {
    return hindi
      ? `${member.name} ka fee abhi overdue nahi, lekin ${exp[0].dueDate} ko due hai — ${rupees(exp[0].amount)}.`
      : `${member.name} is not overdue, but ${rupees(exp[0].amount)} is due on ${exp[0].dueDate}.`
  }
  return hindi
    ? `${member.name} ka koi pending fee nahi dikh raha. Status: ${member.status}.`
    : `${member.name} has no pending fee. Status: ${member.status}.`
}

function memberAttendance(snapshot: CopilotSnapshot, member: CopilotMember, hindi: boolean) {
  const today = snapshot.todayAttendance.filter(
    (a) => a.memberId === member.id || a.name.toLowerCase() === member.name.toLowerCase()
  )
  const quiet = snapshot.quiet.find((q) => q.memberId === member.id)
  if (today.length) {
    const row = today[0]
    if (row.status === 'absent') {
      return hindi
        ? `${member.name} aaj absent mark hai.`
        : `${member.name} is marked absent today.`
    }
    return hindi
      ? `${member.name} aaj check-in ho chuke hain (${row.time}).`
      : `${member.name} already checked in today (${row.time}).`
  }
  if (quiet) {
    return hindi
      ? `${member.name} ${quiet.days} din se nahi aaye. Phone: ${member.phone || 'saved nahi'}. Abhi call karo.`
      : `${member.name} has not come in ${quiet.days} days. Phone: ${member.phone || 'not saved'}. Call them now.`
  }
  return hindi
    ? `${member.name} aaj abhi check-in nahi hua.`
    : `${member.name} has not checked in today.`
}

export function answerOwnerQuery(snapshot: CopilotSnapshot, raw: string): CopilotAnswer {
  const q = foldHinglish(raw)
  const hindi = wantsHindi(raw)
  const suggestions = DEFAULT_SUGGESTIONS
  const date = resolveQueryDate(q, snapshot.today)
  const label = dayLabel(date, snapshot.today, hindi)
  const dayRows = rowsForDate(snapshot, date)

  if (!q || /^(help|hello|hi|hey|namaste|menu|kya puch|kya kar)/i.test(q)) {
    return {
      reply: hindi
        ? `${snapshot.gymName} Copilot ready hai — koi bill nahi, ChatGPT nahi. Poochho:\n• Aaj kitne aaye?\n• Kitna collection?\n• Kaun pending hai?\n• Ravi ka fee?\n• Kaun nahi aaya?`
        : `${snapshot.gymName} Copilot is ready — no AI bill. Ask:\n• Who came today?\n• How much collection?\n• Who is pending?\n• Ravi's fee?\n• Who hasn't come?`,
      suggestions,
    }
  }

  const matched = matchMembers(snapshot, q)
  const asksFee = /\b(fee|fees|pending|overdue|due|payment|paisa|rupaye)\b/i.test(q) || /fee|pending|बकाया|फीस/.test(raw)
  const asksAttend = /\b(aaye|aaya|aya|attendance|check.?in|aaya kya|gaya)\b/i.test(q) || /आए|आया|हाजिरी/.test(raw)
  const asksPhone = /\b(phone|number|call|contact)\b/i.test(q)

  if (matched.length === 1) {
    const m = matched[0]
    if (asksPhone) {
      return {
        reply: hindi
          ? `${m.name}: ${m.phone || 'phone saved nahi hai'}`
          : `${m.name}: ${m.phone || 'no phone saved'}`,
        suggestions,
      }
    }
    if (asksAttend && !asksFee) {
      return { reply: memberAttendance(snapshot, m, hindi), suggestions }
    }
    return { reply: memberFee(snapshot, m, hindi), suggestions }
  }

  if (matched.length > 1) {
    const names = matched.map((m) => m.name).join(', ')
    return {
      reply: hindi
        ? `Kai members mile: ${names}. Poora naam likho.`
        : `Several members matched: ${names}. Use the full name.`,
      suggestions,
    }
  }

  if (/\b(pending|overdue|due|bakaya|baki|baaki)\b/i.test(q) || /बकाया|बाकी/.test(raw)) {
    return { reply: lineOverdue(snapshot.overdue, hindi), suggestions }
  }

  if (/\b(expir|khatam|khatam hone|3 din|teen din)\b/i.test(q)) {
    if (!snapshot.expiring.length) {
      return {
        reply: hindi ? 'Aglay 3 din mein koi expiry nahi.' : 'Nobody is expiring in the next 3 days.',
        suggestions,
      }
    }
    const list = snapshot.expiring
      .slice(0, 8)
      .map((r) => `${r.name} — ${rupees(r.amount)} on ${r.dueDate}`)
      .join('\n')
    return {
      reply: hindi ? `Jaldi due:\n${list}` : `Expiring soon:\n${list}`,
      suggestions,
    }
  }

  if (/\b(nahi aaya|nahi aaye|absent|gair|gairhazir)\b/.test(q) || /नहीं आए|गैर/.test(raw)) {
    const longMissing = /\b(7 din|saat din|last week|din se|missing|chhod|inactive|quiet)\b/.test(q)
    if (!longMissing) {
      const missing = absentToday(dayRows)
      if (!missing.length) {
        return {
          reply: hindi
            ? `${label} koi absent mark nahi hai.`
            : `${label}: nobody is marked absent.`,
          suggestions,
        }
      }
      const names = missing.map((a) => a.name).join(', ')
      return {
        reply: hindi
          ? `${label} absent: ${names} (${missing.length}).`
          : `Absent ${label.toLowerCase()}: ${names} (${missing.length}).`,
        suggestions,
      }
    }
    if (!snapshot.hasAttendanceData) {
      return {
        reply: hindi
          ? 'Attendance data abhi nahi hai. QR scan chalu karo, phir ye sawaal chalega.'
          : 'No attendance data yet. Start QR check-ins, then this question will work.',
        suggestions,
      }
    }
    if (!snapshot.quiet.length) {
      return {
        reply: hindi
          ? 'Koi active member 7 din se missing nahi hai.'
          : 'No active member has been missing for 7+ days.',
        suggestions,
      }
    }
    const list = snapshot.quiet
      .slice(0, 8)
      .map((r) => `${r.name} — ${r.days} din (${r.phone || 'no phone'})`)
      .join('\n')
    return {
      reply: hindi
        ? `Ye log 7+ din se nahi aaye. Abhi call karo, warna next month fee nikal sakti hai:\n${list}`
        : `These people have not come in 7+ days. Call now or next month’s fee may vanish:\n${list}`,
      suggestions,
    }
  }

  if (/\b(kitne aaye|kaun aaya|kaun aaye|attendance|check.?in|hajiri|haaziri|present)\b/.test(q) || /आज.*आए|हाजिरी/.test(raw)) {
    const present = presentToday(dayRows)
    const missing = absentToday(dayRows)
    if (!present.length && !missing.length) {
      return {
        reply: hindi
          ? `${label} 0 check-in. Koi record nahi mila.`
          : `${label}: 0 check-ins. No records found.`,
        suggestions,
      }
    }
    const presentNames = present.slice(0, 10).map((a) => a.name).join(', ')
    const absentNames = missing.slice(0, 8).map((a) => a.name).join(', ')
    const presentLine = hindi
      ? `${label} ${present.length} aaye${presentNames ? `: ${presentNames}` : ''}.`
      : `${label} ${present.length} present${presentNames ? `: ${presentNames}` : ''}.`
    const absentLine = missing.length
      ? ` ${missing.length} absent${absentNames ? `: ${absentNames}` : ''}.`
      : ''
    return { reply: presentLine + absentLine, suggestions }
  }

  if (/\b(collection|collect|kamaya|kamai|revenue|kitna aaya|payment)\b/i.test(q) || /कलेक्शन|कमाई/.test(raw)) {
    const todayish = /\b(aaj|today)\b/i.test(q) || /आज/.test(raw)
    if (todayish) {
      return {
        reply: hindi
          ? `Aaj collection ${rupees(snapshot.todayCollection)}.`
          : `Today’s collection is ${rupees(snapshot.todayCollection)}.`,
        suggestions,
      }
    }
    return {
      reply: hindi
        ? `Is mahine collection ${rupees(snapshot.monthCollection)}. Aaj ${rupees(snapshot.todayCollection)}.`
        : `This month’s collection is ${rupees(snapshot.monthCollection)}. Today ${rupees(snapshot.todayCollection)}.`,
      suggestions,
    }
  }

  if (/\b(profit|munafa|kharcha|kharch|expense|p&l|pl)\b/i.test(q) || /मुनाफा|खर्च/.test(raw)) {
    const profit = snapshot.monthCollection - snapshot.monthExpenses
    return {
      reply: hindi
        ? `Is mahine: collection ${rupees(snapshot.monthCollection)}, kharcha ${rupees(snapshot.monthExpenses)}, munafa ${rupees(profit)}.`
        : `This month: collection ${rupees(snapshot.monthCollection)}, expenses ${rupees(snapshot.monthExpenses)}, profit ${rupees(profit)}.`,
      suggestions,
    }
  }

  if (/\b(member|members|kitne member|total member)\b/i.test(q) || /मेंबर|सदस्य/.test(raw)) {
    const active = snapshot.members.filter((m) => m.status === 'active').length
    return {
      reply: hindi
        ? `Total ${snapshot.members.length} members, ${active} active.`
        : `${snapshot.members.length} members total, ${active} active.`,
      suggestions,
    }
  }

  const briefPresent = presentToday(snapshot.todayAttendance)
  const briefAbsent = absentToday(snapshot.todayAttendance)
  const brief = hindi
    ? `${snapshot.gymName} — aaj ${briefPresent.length} aaye, ${briefAbsent.length} absent, collection ${rupees(snapshot.todayCollection)}, pending ${snapshot.overdue.length} log (${rupees(snapshot.overdue.reduce((s, r) => s + r.amount, 0))}).`
    : `${snapshot.gymName} — today ${briefPresent.length} present, ${briefAbsent.length} absent, collection ${rupees(snapshot.todayCollection)}, ${snapshot.overdue.length} overdue (${rupees(snapshot.overdue.reduce((s, r) => s + r.amount, 0))}).`

  return {
    reply: `${brief}\n\n${hindi ? 'Aur poochho: pending, collection, attendance, ya kisi member ka naam.' : 'Also try: pending, collection, attendance, or a member name.'}`,
    suggestions,
  }
}

export function istDateParts(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const [year, month] = date.split('-')
  const monthStart = `${year}-${month}-01`
  const todayStart = new Date(`${date}T00:00:00+05:30`)
  const todayEnd = new Date(`${date}T23:59:59.999+05:30`)
  const monthStartDt = new Date(`${monthStart}T00:00:00+05:30`)
  const quietSince = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

  return {
    date,
    monthStart,
    todayStartIso: todayStart.toISOString(),
    todayEndIso: todayEnd.toISOString(),
    monthStartIso: monthStartDt.toISOString(),
    quietSinceIso: quietSince.toISOString(),
  }
}

export function daysBetween(fromIso: string, todayDate: string) {
  const from = new Date(fromIso)
  const to = new Date(`${todayDate}T12:00:00+05:30`)
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)))
}

function fullLocalName(row: LocalAttendanceHint) {
  const joined = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ').trim()
  return joined || (row.name || '').trim() || 'Unknown'
}

function localRowDate(row: LocalAttendanceHint, today: string) {
  if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) return row.date
  if (row.date && /^\d{2}-\d{2}-\d{4}$/.test(row.date)) {
    const [day, month, year] = row.date.split('-')
    return `${year}-${month}-${day}`
  }
  if (row.createdAt) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(row.createdAt))
  }
  return today
}

export function localAttendanceForToday(rows: LocalAttendanceHint[] | undefined, today: string): CopilotCheckIn[] {
  return groupLocalAttendance(rows, today)[today] || []
}

export function groupLocalAttendance(rows: LocalAttendanceHint[] | undefined, today: string): Record<string, CopilotCheckIn[]> {
  const out: Record<string, CopilotCheckIn[]> = {}
  if (!rows?.length) return out
  for (const row of rows) {
    const date = localRowDate(row, today)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const item: CopilotCheckIn = {
      memberId: String(row.id || fullLocalName(row).toLowerCase()),
      name: fullLocalName(row),
      time: row.entryTime || '--:--',
      status: String(row.status || 'present').toLowerCase() === 'absent' ? 'absent' : 'present',
    }
    const list = out[date] || (out[date] = [])
    const existing = list.find((r) => r.name.toLowerCase() === item.name.toLowerCase())
    if (existing) {
      existing.status = item.status
      existing.time = item.time
    } else {
      list.push(item)
    }
  }
  return out
}

export function mergeTodayAttendance(fromDb: CopilotCheckIn[], fromLocal: CopilotCheckIn[]) {
  const byName = new Map<string, CopilotCheckIn>()
  for (const row of fromDb) {
    byName.set(row.name.toLowerCase(), { ...row, status: row.status || 'present' })
  }
  for (const row of fromLocal) {
    const key = row.name.toLowerCase()
    const existing = byName.get(key)
    if (existing) {
      existing.status = row.status || existing.status
      existing.time = row.time || existing.time
    } else {
      byName.set(key, row)
    }
  }
  return [...byName.values()]
}

export function presentToday(rows: CopilotCheckIn[]) {
  return rows.filter((r) => r.status !== 'absent')
}

export function absentToday(rows: CopilotCheckIn[]) {
  return rows.filter((r) => r.status === 'absent')
}
