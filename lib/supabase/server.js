import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env';

// 서버 컴포넌트·Server Action·route handler에서 쓰는 Supabase 클라이언트.
// 로그인 상태는 Supabase가 내려 준 쿠키(sb-...-auth-token)에 들어 있다.
export async function supabaseServer() {
  const store = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 갱신은 middleware.js가 맡는다.
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {}
      },
    },
  });
}
