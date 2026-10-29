'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 이메일이 없을 때와 비밀번호만 틀렸을 때 같은 문구를 쓴다 (어느 쪽인지 알려 주면 가입 여부가 새어 나간다)
const LOGIN_FAILED = '이메일 또는 비밀번호가 맞지 않아요.';

function readForm(formData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function signUpAction(_prev, formData) {
  const { email, password } = readForm(formData);
  const confirm = String(formData.get('password_confirm') ?? '');
  if (!EMAIL_RE.test(email)) return { error: '이메일 주소를 확인해 주세요.', email };
  if (password.length < 8) return { error: '비밀번호는 8자 이상으로 정해 주세요.', email };
  if (password.length > 72) return { error: '비밀번호는 72자까지 쓸 수 있어요.', email };
  if (password !== confirm) return { error: '비밀번호 확인이 같지 않아요.', email };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      return { error: '이미 가입된 이메일이에요. 로그인해 주세요.', email };
    }
    if (error.code === 'weak_password') return { error: '더 어려운 비밀번호로 정해 주세요.', email };
    if (error.status === 429) return { error: '잠시 뒤 다시 시도해 주세요.', email };
    console.error('signUp failed', error.code ?? error.status);
    return { error: '가입하지 못했어요. 잠시 뒤 다시 시도해 주세요.', email };
  }
  // 이메일 확인이 꺼져 있으면 가입과 동시에 로그인된다(session이 있다).
  // 이메일 확인이 켜져 있으면 Supabase는 이미 있는 이메일에도 성공처럼 답하고 session을 주지 않는다.
  if (!data.session) return { info: '가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.', email };
  redirect('/');
}

export async function signInAction(_prev, formData) {
  const { email, password } = readForm(formData);
  if (!email || !password) return { error: LOGIN_FAILED, email };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: '로그인 시도가 너무 많아요. 잠시 뒤 다시 시도해 주세요.', email };
    // invalid_credentials(없는 이메일·틀린 비밀번호)와 그 밖의 실패를 구분해 알려 주지 않는다
    return { error: LOGIN_FAILED, email };
  }
  redirect('/');
}

export async function signOutAction() {
  const supabase = await supabaseServer();
  // 이 브라우저의 세션을 Supabase Auth 서버에서 지운다. 같은 쿠키를 다시 보내도 getUser()가 거절한다.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login?out=1');
}
