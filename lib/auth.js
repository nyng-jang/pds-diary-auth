import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';

// 지금 로그인한 사람. 없으면 null.
// getUser()는 쿠키 안의 토큰을 믿지 않고 매번 Supabase Auth 서버에 물어본다.
// 그래서 로그아웃으로 지워진 세션의 쿠키를 다시 보내면 여기서 null이 된다.
// (토큰 서명만 보는 getSession()/getClaims()는 로그아웃 뒤에도 만료 전까지 통과시킨다)
export const currentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email };
});

// 로그인한 사람만 통과. 화면과 Server Action 첫 줄에서 부른다.
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}
