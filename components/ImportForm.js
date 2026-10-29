'use client';

import { useActionState } from 'react';
import PromptBox from './PromptBox';

// 과제 6에서 내려받은 JSON 파일을 올려 내 계정으로 옮긴다. 계획이 하나도 없을 때만 보인다.
export default function ImportForm({ action }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <PromptBox title="과제 6 자료 가져오기" icon="history" state={pending ? 'busy' : state?.error ? 'error' : 'idle'} stateText={pending ? '가져오는 중…' : undefined}>
      <form action={formAction} className="pform">
        <p className="muted">
          과제 6 다이어리 첫 화면의 <strong>내 자료 전체 내려받기</strong>로 받은 <code>pds-export-….json</code> 파일을 고르면,
          계획·수정 이력·할 일·실행 기록·완료 기록·고칠 점이 모두 이 계정의 자료로 들어와요.
          번호(#)는 새로 매겨지고, 같은 파일은 한 번만 가져올 수 있어요.
        </p>
        <label className="pform-main">
          <span>내보내기 파일 (.json)</span>
          <input type="file" name="file" accept="application/json,.json" required />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">과제 6 사이트와 DB는 바뀌지 않아요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '가져오는 중…' : '가져오기'}</button>
        </div>
      </form>
    </PromptBox>
  );
}
