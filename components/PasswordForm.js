'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import PromptBox from './PromptBox';
import { changePasswordAction } from '@/app/auth-actions';

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  return (
    <PromptBox title="새 비밀번호" icon="target" state={pending ? 'busy' : state?.error ? 'error' : 'idle'} stateText={pending ? '확인 중…' : undefined}>
      <form action={formAction} className="pform auth-form">
        <label className="pform-main">
          <span>지금 비밀번호</span>
          <input type="password" name="current_password" autoComplete="current-password" required maxLength={72} />
        </label>
        <label className="pform-main">
          <span>새 비밀번호 <small>(8자 이상)</small></span>
          <input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        <label className="pform-main">
          <span>새 비밀번호 확인</span>
          <input type="password" name="password_confirm" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        {state?.info && <p className="ok" role="status">{state.info}</p>}
        <div className="pform-foot">
          <span className="muted"><Link href="/">돌아가기</Link></span>
          <button type="submit" className="send" disabled={pending}>{pending ? '확인 중…' : '바꾸기'}</button>
        </div>
      </form>
    </PromptBox>
  );
}
