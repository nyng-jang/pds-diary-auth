'use client';

import { useActionState } from 'react';
import { logFromListAction } from '@/app/actions';
import Icon from './Icon';

// 할 일 목록의 카드 안에서 바로 실제로 한 일을 적는다.
// 진행 중: "완료로 바꾸기"를 누르면 기록 칸이 펼쳐지고, 기록을 저장하면서 완료로 바꾼다(기록 없이 완료만도 된다).
// 완료: "실제로 한 일 적기"를 누르면 기록 칸만 펼쳐진다.
// 요청 키 두 개(logKey, doneKey)는 서버가 카드를 그릴 때 만든다. 연달아 눌러도 기록·완료가 한 번씩만 들어간다.
export default function TaskDoPanel({ taskId, done, estimated, logKey, doneKey, back }) {
  const [state, formAction, pending] = useActionState(logFromListAction, null);
  return (
    <details className="do-panel" open={Boolean(state?.error)}>
      <summary className="wide-btn">
        <Icon name={done ? 'clock' : 'check'} />
        {done ? '실제로 한 일 적기' : '완료로 바꾸기'}
        <Icon name="chevron" className="icon do-chevron" />
      </summary>
      <form action={formAction} className="pform do-form">
        <input type="hidden" name="task_id" value={taskId} />
        <input type="hidden" name="request_key" value={logKey} />
        {!done && <input type="hidden" name="done_key" value={doneKey} />}
        {back && <input type="hidden" name="back" value={back} />}
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
            <span>실제로 걸린 시간 (분) <small>(비우면 시작~끝 · 예상 {estimated}분)</small></span>
            <input type="number" name="actual_minutes" min={1} max={1440} placeholder="쉰 시간은 빼고" />
          </label>
          <label className="wide">
            <span>막혔던 이유 <small>(없으면 비워 두세요)</small></span>
            <input type="text" name="blocker" maxLength={500} />
          </label>
        </div>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="do-actions">
          {!done && (
            <button type="submit" name="mode" value="done_only" formNoValidate className="link-btn" disabled={pending}>
              기록 없이 완료만
            </button>
          )}
          <button type="submit" name="mode" value="log" className="send" disabled={pending}>
            {pending ? '저장 중…' : done ? '실행 기록 저장' : '기록 저장하고 완료'}
          </button>
        </div>
      </form>
    </details>
  );
}
