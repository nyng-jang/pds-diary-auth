'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import PromptBox from './PromptBox';

// 로그인·가입 공통 폼. mode: 'login' | 'signup'
export default function AuthForm({ mode, action, notice }) {
  const [state, formAction, pending] = useActionState(action, null);
  const signup = mode === 'signup';
  return (
    <PromptBox title={signup ? '새 계정 만들기' : '로그인'} icon={signup ? 'sparkle' : 'target'} state={pending ? 'busy' : state?.error ? 'error' : 'idle'} stateText={pending ? '확인 중…' : undefined}>
      <form action={formAction} className="pform auth-form">
        {notice && !state && <p className="ok" role="status">{notice}</p>}
        <label className="pform-main">
          <span>이메일</span>
          <input type="email" name="email" autoComplete="email" required maxLength={254} defaultValue={state?.email ?? ''} placeholder="you@example.com" />
        </label>
        <label className="pform-main">
          <span>비밀번호 {signup && <small>(8자 이상)</small>}</span>
          <input type="password" name="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} maxLength={72} />
        </label>
        {signup && (
          <label className="pform-main">
            <span>비밀번호 확인</span>
            <input type="password" name="password_confirm" autoComplete="new-password" required minLength={8} maxLength={72} />
          </label>
        )}
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        {state?.info && <p className="ok" role="status">{state.info}</p>}
        <div className="pform-foot">
          <span className="muted">
            {signup
              ? <>이미 계정이 있나요? <Link href="/login">로그인</Link></>
              : <>처음인가요? <Link href="/signup">가입하기</Link></>}
          </span>
          <button type="submit" className="send" disabled={pending}>
            {pending ? '확인 중…' : signup ? '가입하기' : '로그인'}
          </button>
        </div>
      </form>
    </PromptBox>
  );
}
