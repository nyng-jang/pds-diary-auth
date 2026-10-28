'use client';

import { useActionState } from 'react';
import PromptBox from './PromptBox';

const PRIORITIES = ['높음', '보통', '낮음'];

export default function TaskForm({ action, task, plans, defaultPlanId, submitLabel, heading }) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = task ?? { priority: '보통', plan_id: defaultPlanId ?? plans[0]?.id, tags: [] };

  return (
    <PromptBox title={heading} icon="play" state={pending ? 'busy' : state?.error ? 'error' : 'idle'}>
      <form action={formAction} className="pform">
        {task && <input type="hidden" name="id" value={task.id} />}
        <div className="pform-context">
          <label className="pill-field">
            <span>계획</span>
            <select name="plan_id" defaultValue={t.plan_id} required>
              {plans.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
            </select>
          </label>
          <label className="pill-field">
            <span>우선순위</span>
            <select name="priority" defaultValue={t.priority}>
              {PRIORITIES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <label className="pform-main">
          <span>할 일</span>
          <input name="title" defaultValue={t.title} required maxLength={100} placeholder="예: SQLD 1과목 데이터 모델링 정리" />
        </label>
        <div className="pform-fields">
          <label>
            <span>마감일 <small>(비우면 마감 없음)</small></span>
            <input type="date" name="due_date" defaultValue={t.due_date ?? ''} />
          </label>
          <label>
            <span>예상 시간 (분)</span>
            <input type="number" name="estimated_minutes" min={1} max={10000} defaultValue={t.estimated_minutes} required />
          </label>
          <label className="wide">
            <span>태그 <small>(쉼표로 나눠 여러 개)</small></span>
            <input name="tags" defaultValue={t.tags.join(', ')} maxLength={250} placeholder="예: 이론, 1과목" />
          </label>
        </div>
        <label className="pform-main">
          <span>메모 <small>(선택)</small></span>
          <textarea name="note" defaultValue={t.note} maxLength={500} rows={2} />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">저장하면 서버 데이터베이스에 바로 남아요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : submitLabel}</button>
        </div>
      </form>
    </PromptBox>
  );
}
