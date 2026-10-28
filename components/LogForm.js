'use client';

import { useActionState } from 'react';
import { createLogAction } from '@/app/actions';
import PromptBox from './PromptBox';

// 실행 기록 남기기. requestKey는 서버가 화면을 그릴 때 만든 키로, 같은 저장이 두 번 가도 한 건만 남는다.
export default function LogForm({ taskId, requestKey, estimated }) {
  const [state, formAction, pending] = useActionState(createLogAction, null);
  return (
    <PromptBox title="실제로 한 일 적기" icon="clock" headingId="log-form-h" state={pending ? 'busy' : state?.error ? 'error' : 'idle'}>
      <form action={formAction} className="pform" aria-labelledby="log-form-h">
        <input type="hidden" name="task_id" value={taskId} />
        <input type="hidden" name="request_key" value={requestKey} />
        <div className="pform-fields">
          <label>
            <span>시작 시각</span>
            <input type="datetime-local" name="started_at" required />
          </label>
          <label>
            <span>끝난 시각</span>
            <input type="datetime-local" name="ended_at" required />
          </label>
          <label className="wide">
            <span>실제로 걸린 시간 (분) <small>(비우면 시작~끝으로 계산 · 쉰 시간은 빼고 적어요 · 계획한 예상 {estimated}분)</small></span>
            <input type="number" name="actual_minutes" min={1} max={1440} placeholder="예: 80" />
          </label>
        </div>
        <label className="pform-main">
          <span>막혔던 이유 <small>(없으면 비워 두세요)</small></span>
          <textarea name="blocker" maxLength={500} rows={2} placeholder="예: 정규화 예제가 이해가 안 돼서 강의를 다시 봄" />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">실행 기록은 따로 저장돼요. 할 일과 계획의 원래 값은 바뀌지 않아요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : '실행 기록 저장'}</button>
        </div>
      </form>
    </PromptBox>
  );
}
