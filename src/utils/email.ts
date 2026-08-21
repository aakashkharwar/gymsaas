import { Resend } from 'resend'
import { getSiteUrl } from '@/utils/supabase/config'

export type SendEmailResult =
  | { ok: true; skipped?: undefined }
  | { ok: true; skipped: 'no-recipient' | 'no-mailer' | 'empty' }
  | { ok: false; error: string }

function fromAddress(fromName?: string) {
  const configured = process.env.EMAIL_FROM?.trim()
  const mailbox =
    configured?.match(/<([^>]+)>/)?.[1]
    || (configured && !configured.includes('<') ? configured : '')
    || process.env.SMTP_USER?.trim()
    || 'onboarding@resend.dev'
  const name = (fromName || 'GymOS').replace(/[<>\r\n]/g, '').trim() || 'GymOS'
  return `${name} <${mailbox}>`
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT || 587)
  return { host, port, user, pass, secure: port === 465 }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function emailIsDelivered(result: SendEmailResult) {
  return result.ok && !result.skipped
}

export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  fromName?: string
}): Promise<SendEmailResult> {
  const recipients = (Array.isArray(options.to) ? options.to : [options.to])
    .map((email) => email.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    return { ok: true, skipped: 'no-recipient' }
  }

  const smtp = smtpConfig()
  if (smtp) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      })
      await transporter.sendMail({
        from: fromAddress(options.fromName),
        to: recipients.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      return { ok: true }
    } catch (err) {
      console.error('SMTP send failed:', err)
      return { ok: false, error: err instanceof Error ? err.message : 'SMTP send failed' }
    }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.info('[email skipped — add RESEND_API_KEY]', options.subject, recipients)
    return { ok: true, skipped: 'no-mailer' }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: fromAddress(options.fromName),
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    if (error) {
      console.error('Resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error('sendEmail failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

function brandedEmail(options: {
  eyebrow: string
  title: string
  bodyHtml: string
  buttonLabel: string
  buttonHref: string
  footer?: string
  sentBy?: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#4f46e5;padding:28px 32px;">
              <p style="margin:0;color:#c7d2fe;font-size:11px;letter-spacing:0.16em;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">${options.eyebrow}</p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-size:26px;line-height:1.25;font-family:Arial,Helvetica,sans-serif;">${options.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:1.65;">
              ${options.bodyHtml}
              <p style="margin:28px 0 0;">
                <a href="${options.buttonHref}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;">${options.buttonLabel}</a>
              </p>
              ${options.footer ? `<p style="margin:28px 0 0;color:#64748b;font-size:13px;">${options.footer}</p>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;font-family:Arial,Helvetica,sans-serif;">Sent by ${options.sentBy || 'GymOS'}</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function ownerWelcomeHtml(options: {
  ownerName?: string
  gymName?: string
  dashboardUrl: string
}) {
  const name = escapeHtml((options.ownerName || 'there').trim() || 'there')
  const gym = escapeHtml((options.gymName || '').trim())
  const gymLine = gym
    ? `Your gym <strong>${gym}</strong> is live on GymOS.`
    : 'Your gym workspace is live on GymOS.'

  return brandedEmail({
    eyebrow: 'GYMOS',
    title: gym ? `Welcome, ${name}` : 'Welcome to GymOS',
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${name},</p>
      <p style="margin:0 0 14px;">${gymLine} You can add members, collect fees, and track attendance from one dashboard.</p>
      <p style="margin:0;">Start with these:</p>
      <ul style="margin:10px 0 0;padding-left:18px;color:#475569;">
        <li>Add your first member</li>
        <li>Set a fee plan</li>
        <li>Mark attendance</li>
      </ul>
    `,
    buttonLabel: 'Open your dashboard',
    buttonHref: options.dashboardUrl,
    footer: "You're on a 14-day trial. This email is a welcome note — your account is already ready.",
  })
}

export async function sendOwnerWelcomeEmail(email: string, ownerName?: string, gymName?: string) {
  const site = getSiteUrl()
  const dashboardUrl = `${site}/dashboard`
  const name = (ownerName || 'there').trim() || 'there'
  const gym = (gymName || '').trim()

  return sendEmail({
    to: email,
    subject: gym ? `Welcome to GymOS — ${gym} is ready` : 'Welcome to GymOS',
    text: `Hi ${name}, ${gym ? `${gym} is live on GymOS.` : 'your GymOS account is ready.'} Open ${dashboardUrl} to add members, collect fees, and track attendance.`,
    html: ownerWelcomeHtml({ ownerName: name, gymName: gym, dashboardUrl }),
  })
}

export async function sendAdmissionEmail(options: {
  memberEmail: string
  memberName: string
  gymName: string
  phone?: string
}) {
  const gym = escapeHtml(options.gymName)
  const name = escapeHtml(options.memberName)
  return sendEmail({
    fromName: options.gymName,
    to: options.memberEmail,
    subject: `Welcome to ${options.gymName}`,
    text: `Hi ${options.memberName}, your admission at ${options.gymName} is confirmed.`,
    html: brandedEmail({
      eyebrow: gym.toUpperCase(),
      title: `Welcome to ${gym}`,
      bodyHtml: `<p style="margin:0 0 14px;">Hi ${name},</p><p style="margin:0;">Your gym admission is confirmed. Please carry a valid ID on your first visit and ask the front desk if you have any questions.</p>`,
      buttonLabel: 'See you at the gym',
      buttonHref: getSiteUrl(),
      footer: `This email was sent because you were admitted at ${gym}.`,
    }),
  })
}

export async function sendMembershipExpiryEmail(options: {
  memberEmail: string
  memberName: string
  gymName: string
  dueDate: string
  amount?: number
}) {
  const amountText = options.amount != null ? `₹${Number(options.amount).toLocaleString('en-IN')}` : ''
  const gym = escapeHtml(options.gymName)
  const name = escapeHtml(options.memberName)
  const due = escapeHtml(options.dueDate)
  return sendEmail({
    fromName: options.gymName,
    to: options.memberEmail,
    subject: `${options.gymName}: Your membership expires on ${options.dueDate}`,
    text: `Hi ${options.memberName}, your membership at ${options.gymName} expires on ${options.dueDate}. ${amountText ? `Amount due: ${amountText}. ` : ''}Kindly pay at the front desk to continue your membership.`,
    html: brandedEmail({
      eyebrow: gym.toUpperCase(),
      title: 'Membership expiring',
      bodyHtml: `<p style="margin:0 0 14px;">Hi ${name},</p>
        <p style="margin:0 0 14px;">Your membership at <strong>${gym}</strong> expires on <strong>${due}</strong>.</p>
        ${amountText ? `<p style="margin:0 0 14px;">Amount due: <strong>${amountText}</strong>.</p>` : ''}
        <p style="margin:0;">Kindly pay at the front desk to continue your membership.</p>`,
      buttonLabel: 'Contact the gym',
      buttonHref: getSiteUrl(),
      footer: `This reminder was sent by ${gym}.`,
      sentBy: gym,
    }),
  })
}

export async function sendOwnerExpiryDigest(options: {
  ownerEmail: string
  gymName: string
  rows: Array<{ name: string; dueDate: string; amount?: number; email?: string; phone?: string }>
}) {
  if (options.rows.length === 0) return { ok: true as const, skipped: 'empty' as const }

  const list = options.rows
    .map((row) => {
      const amount = row.amount != null ? ` · ₹${Number(row.amount).toLocaleString('en-IN')}` : ''
      const contact = [row.phone, row.email].filter(Boolean).join(' · ')
      return `<li style="margin:8px 0"><strong>${escapeHtml(row.name)}</strong> — expires ${escapeHtml(row.dueDate)}${amount}${contact ? `<br/><span style="color:#64748b">${escapeHtml(contact)}</span>` : ''}</li>`
    })
    .join('')

  return sendEmail({
    fromName: options.gymName,
    to: options.ownerEmail,
    subject: `${options.rows.length} membership${options.rows.length === 1 ? '' : 's'} expiring in 3 days — ${options.gymName}`,
    text: options.rows.map((row) => `${row.name} expires ${row.dueDate}`).join('\n'),
    html: brandedEmail({
      eyebrow: 'GYMOS',
      title: 'Memberships expiring soon',
      bodyHtml: `<p style="margin:0 0 14px;">These members at <strong>${escapeHtml(options.gymName)}</strong> expire within the next 3 days:</p><ul>${list}</ul>`,
      buttonLabel: 'Open dashboard',
      buttonHref: `${getSiteUrl()}/dashboard`,
    }),
  })
}

export function describeEmailFailure(result: SendEmailResult) {
  if (emailIsDelivered(result)) return null
  if ('skipped' in result && result.skipped === 'no-mailer') {
    return 'Custom GymOS email needs RESEND_API_KEY. A dashboard welcome email was sent instead.'
  }
  if ('skipped' in result && result.skipped) return null
  if (!result.ok) return `Welcome email failed: ${result.error}`
  return null
}
