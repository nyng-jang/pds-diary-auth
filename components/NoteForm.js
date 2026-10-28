'use client';

import { useActionState } from 'react';
import { createNoteAction } from '@/app/actions';
import PromptBox from './PromptBox';

// 돌아보기에서 고칠 점 한 줄을 정해 다음 계획으로 넘긴다. 근거 숫자는 서버가 저장할 때 다시 센다.
export default function NoteForm({ requestKey, from, to, plans, periodLabel }) {
  const [state, formAction, pending] = useActionState(createNoteAction, null);
  return (
    <PromptBox title="다음 계획으로 넘길 고칠 점 한 줄" icon="sparkle" headingId="note-form-h" state={pending ? 'busy' : state?.error ? 'error' : 'idle'}>
      <form action={formAction} className="pform" aria-labelledby="note-form-h">
        <input type="hidden" name="request_key" value={requestKey} />
        <input type="hidden" name="from" value={from ?? ''} />
        <input type="hidden" name="to" value={to ?? ''} />
        <div className="pform-context">
          <label className="pill-field">
            <span>근거로 본 숫자</span>
            <select name="basis_plan_id" defaultValue="">
              <option value="">모든 계획 합계</option>
              {plans.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
            </select>
          </label>
          <label className="pill-field">
            <span>넘길 계획</span>
            <select name="next" defaultValue="" required>
              <option value="" disabled>골라 주세요</option>
              {plans.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
              <option value="new">+ 새 계획 세우기</option>
            </select>
          </label>
        </div>
        <label className="pform-main">
          <span>고칠 점 한 가지 <small>(한 줄 · 200자까지)</small></span>
          <input name="lesson" required maxLength={200} placeholder="예: 정리하는 할 일은 예상 시간을 60분이 아니라 80분으로 잡기" />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">{periodLabel}의 숫자를 근거로 함께 저장해요. 고칠 점은 지우거나 바꿀 수 없어요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : '다음 계획으로 넘기기'}</button>
        </div>
      </form>
    </PromptBox>
  );
}
