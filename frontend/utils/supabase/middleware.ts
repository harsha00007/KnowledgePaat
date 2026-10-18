import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { sanitizeInternalRedirectUrl } from '@/lib/safeRedirect'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
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

  const pathname = request.nextUrl.pathname
  const isRootRoute = pathname === '/'
  const isAdminLoginRoute = pathname === '/admin/login'
  const isStudentAuthRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')
  const isStudentRoute = pathname.startsWith('/student')
  const isAdminRoute = pathname.startsWith('/admin') && !isAdminLoginRoute

  // 1. Not authenticated
  if (!user) {
    // Unauthenticated user trying to access protected admin routes
    if (isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // Unauthenticated user trying to access protected student routes
    if (isStudentRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Unauthenticated visitor trying to access protected customer eBook routes
    const isCustomerProtectedRoute = 
      pathname.startsWith('/my-books') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/read');

    if (isCustomerProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    // Allow public pages and /admin/login
    return supabaseResponse
  }

  // 2. User is authenticated: Verify role
  // Check via is_admin RPC first (immune to recursive profile RLS policy)
  const { data: isAdminRpc } = await supabase.rpc('is_admin');
  let role = isAdminRpc ? 'admin' : null;

  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role || 'student';
  }

  // Admin user routing
  if (role === 'admin') {
    // Admin trying to access public auth routes or root landing
    if (isRootRoute || isStudentAuthRoute || isAdminLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }

    // Admin trying to access student portal
    if (isStudentRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Student user routing (role === 'student' or default)
  if (isRootRoute || isStudentAuthRoute) {
    if (isStudentAuthRoute) {
      const rawRedirect = request.nextUrl.searchParams.get('redirectTo');
      if (rawRedirect) {
        const safeTarget = sanitizeInternalRedirectUrl(rawRedirect, '/student/dashboard');
        if (safeTarget !== '/student/dashboard') {
          const url = new URL(safeTarget, request.url);
          return NextResponse.redirect(url);
        }
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = '/student/dashboard';
    return NextResponse.redirect(url);
  }

  // Student trying to access admin portal or admin login
  if (isAdminRoute || isAdminLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/student/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
