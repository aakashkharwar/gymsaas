const FALLBACK_SUPABASE_URL = 'https://welpopxubwxffeyutrxj.supabase.co'
const FALLBACK_SUPABASE_KEY = 'sb_publishable_F9mPhK1l7qYU6Xy1jOeuTw_7_DoYgEY'

function readSupabaseConfig() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FALLBACK_SUPABASE_URL
  ).trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_KEY
  ).trim()

  if (!url || !key) return null
  return { url, key }
}

export function getSupabaseConfig() {
  const config = readSupabaseConfig()

  if (!config) {
    throw new Error(
      'Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in Vercel Project Settings > Environment Variables.'
    )
  }

  return config
}

export function getSupabaseConfigOrNull() {
  return readSupabaseConfig()
}

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL
  )?.trim()

  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, '')}`
  }

  return 'http://localhost:3000'
}
