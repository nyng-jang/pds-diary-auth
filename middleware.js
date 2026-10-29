import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseEnv } from '@/lib/supabase/env';

// 로그인 없이 열 수 있는 주소
const PUBLIC = ['/login', '/signup', '/api/health'];

// 모든 요청 앞에서: 1) 로그인 쿠키를 새로 고치고 2) 로그인하지 않았으면 로그인 화면으로 보낸다.
// 화면과 Server Action에서도 requireUser()로 한 번 더 확인한다 (middleware만 믿지 않는다).
export async function middleware(request) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.includes(pathname);

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: '로그인이 필요해요.' }, { status: 401 });
    }
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.search = '';
    return withCookies(NextResponse.redirect(to), response);
  }
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const to = request.nextUrl.clone();
    to.pathname = '/';
    to.search = '';
    return withCookies(NextResponse.redirect(to), response);
  }
  return response;
}

// 새로 고친 로그인 쿠키를 다른 응답(redirect)에도 옮겨 담는다
function withCookies(target, source) {
  for (const c of source.cookies.getAll()) target.cookies.set(c);
  return target;
}

export const config = {
  // 정적 파일은 건너뛴다
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
