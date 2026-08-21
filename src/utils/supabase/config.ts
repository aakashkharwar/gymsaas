function readSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

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
