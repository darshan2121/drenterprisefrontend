import { NextRequest, NextResponse } from 'next/server';

// Define protected routes
const PROTECTED_ROUTES = {
  admin: ['/admin'],
  manager: ['/manager'],
  employee: ['/employee'],
};

// Define public routes
const PUBLIC_ROUTES = ['/admin/login', '/login', '/'];

export function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for authentication token
  const adminToken = request.cookies.get('adminToken')?.value;
  const userToken = request.cookies.get('userToken')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  const isAuthenticated = !!(adminToken || userToken);

  // If not authenticated, redirect to appropriate login
  if (!isAuthenticated) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (pathname.startsWith('/manager')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Check role-based access
  if (userRole) {
    const allowedRoutes = PROTECTED_ROUTES[userRole as keyof typeof PROTECTED_ROUTES] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
      // Redirect to appropriate dashboard based on role
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (userRole === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get('adminToken');

  if (!adminToken && pathname.startsWith('/admin/dashboard')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard'],
};

// Helper function to set auth cookies
export function setAuthCookies(response: NextResponse, token: string, role: string, userData: any) {
  response.cookies.set('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  
  response.cookies.set('userRole', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

// Helper function to clear auth cookies
export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('adminToken');
  response.cookies.delete('userToken');
  response.cookies.delete('userRole');
  response.cookies.delete('adminData');
  response.cookies.delete('userData');

  return response;
} 