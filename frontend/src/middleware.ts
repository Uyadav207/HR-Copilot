import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get token from cookie or localStorage (check cookie first, then we'll check localStorage on client side)
  const token = request.cookies.get('auth_token')?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if accessing API routes (we handle auth in API routes themselves)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // If user is on a protected route and doesn't have a token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user has a token, allow access to protected routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

