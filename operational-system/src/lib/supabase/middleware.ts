import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/admin/accept-invite',
  '/admin/reset-password',
]);

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.has(pathname);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  if (isPublicAdminPath(request.nextUrl.pathname)) {
    return response;
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      return NextResponse.redirect(
        new URL('/admin/login?error=no_admin_configured', request.url)
      );
    }

    const email = user.email?.toLowerCase() || '';
    const role = user.user_metadata?.role;
    const isAdmin = adminEmails.includes(email) || role === 'admin';

    if (!isAdmin) {
      return NextResponse.redirect(
        new URL('/admin/login?error=unauthorized', request.url)
      );
    }
  }

  return response;
}
