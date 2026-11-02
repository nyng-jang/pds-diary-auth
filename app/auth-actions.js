'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseEnv } from '@/lib/supabase/env';

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

// 비밀번호 바꾸기. 바꾸면 Supabase Auth가 이 세션을 뺀 같은 계정의 다른 세션을 모두 지운다.
// 그래서 다른 브라우저에 남아 있던 예전 쿠키는 다음 요청에서 getUser()가 거절한다.
export async function changePasswordAction(_prev, formData) {
  const current = String(formData.get('current_password') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');
  if (password.length < 8) return { error: '새 비밀번호는 8자 이상으로 정해 주세요.' };
  if (password.length > 72) return { error: '비밀번호는 72자까지 쓸 수 있어요.' };
  if (password !== confirm) return { error: '새 비밀번호 확인이 같지 않아요.' };
  if (password === current) return { error: '지금 비밀번호와 다른 비밀번호로 정해 주세요.' };

  const supabase = await supabaseServer();
  const { data: who, error: whoErr } = await supabase.auth.getUser();
  if (whoErr || !who?.user?.email) redirect('/login');

  // 지금 비밀번호가 맞는지: 쿠키에 남지 않는 따로 된 클라이언트로 한 번 로그인해 보고 그 세션은 바로 지운다
  const { url, key } = supabaseEnv();
  const probe = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: checkErr } = await probe.auth.signInWithPassword({ email: who.user.email, password: current });
  if (checkErr) {
    if (checkErr.status === 429) return { error: '시도가 너무 많아요. 잠시 뒤 다시 시도해 주세요.' };
    return { error: '지금 비밀번호가 맞지 않아요.' };
  }
  await probe.auth.signOut({ scope: 'local' });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'weak_password') return { error: '더 어려운 비밀번호로 정해 주세요.' };
    if (error.code === 'same_password') return { error: '지금 비밀번호와 다른 비밀번호로 정해 주세요.' };
    console.error('updateUser failed', error.code ?? error.status);
    return { error: '바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.' };
  }
  return { info: '비밀번호를 바꿨어요. 다른 브라우저·기기의 로그인은 끊겼어요.' };
}

// 계정 지우기. 지금 비밀번호와 확인 문구를 다시 받아, 맞을 때만 내 자료 전부와 로그인 정보를 함께 지운다.
export async function deleteAccountAction(_prev, formData) {
  const current = String(formData.get('current_password') ?? '');
  const confirmText = String(formData.get('confirm_text') ?? '').trim();
  if (confirmText !== '계정 삭제') return { error: '확인 칸에 "계정 삭제"라고 적어 주세요.' };

  const supabase = await supabaseServer();
  const { data: who, error: whoErr } = await supabase.auth.getUser();
  if (whoErr || !who?.user?.email) redirect('/login');

  const { url, key } = supabaseEnv();
  const probe = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: checkErr } = await probe.auth.signInWithPassword({ email: who.user.email, password: current });
  if (checkErr) {
    if (checkErr.status === 429) return { error: '시도가 너무 많아요. 잠시 뒤 다시 시도해 주세요.' };
    return { error: '지금 비밀번호가 맞지 않아요.' };
  }
  await probe.auth.signOut({ scope: 'local' });

  try {
    const { deleteAccount } = await import('@/lib/account');
    await deleteAccount(who.user.id);
  } catch (e) {
    console.error('deleteAccount failed', e?.code ?? e?.name);
    return { error: '계정을 지우지 못했어요. 아무것도 지워지지 않았어요. 잠시 뒤 다시 시도해 주세요.' };
  }
  // 로그인 정보가 지워져 세션도 사라졌다. 이 브라우저의 쿠키를 지운다 (서버 응답이 실패해도 쿠키는 지운다).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  redirect('/login?deleted=1');
}
