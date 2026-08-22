import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfigOrNull } from './config'

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfigOrNull()
  if (!config) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    )
    return NextResponse.next({ request })
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      config.url,
      config.key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isServerAction = request.method !== 'GET' && request.headers.has('next-action')
    const url = request.nextUrl.clone()

    if (!isServerAction && request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user) {
        if (
          request.nextUrl.pathname.startsWith('/dashboard/attendance') &&
          request.nextUrl.searchParams.has('qr')
        ) {
          url.pathname = '/check-in'
          return NextResponse.redirect(url)
        }
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('updateSession error:', error)
    return NextResponse.next({ request })
  }
}
