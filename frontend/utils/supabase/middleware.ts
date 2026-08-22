import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Fetch the user session
  const { data: { user } } = await supabase.auth.getUser()

  const isRootRoute = request.nextUrl.pathname === '/'
  const isAuthRoute = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')
  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Not authenticated
  if (!user) {
    if (isStudentRoute || isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // User is authenticated. We need to check their role.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role || 'student'

  // Authenticated user trying to access root landing or login/register/auth routes
  if (isRootRoute || isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/admin/dashboard' : '/student/dashboard'
    return NextResponse.redirect(url)
  }

  // Student trying to access admin
  if (isAdminRoute && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/student/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin trying to access student (optional, but typical)
  if (isStudentRoute && role !== 'student') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
