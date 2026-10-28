'use client';

import { useActionState } from 'react';

const PRIORITIES = ['높음', '보통', '낮음'];

export default function TaskForm({ action, task, plans, defaultPlanId, submitLabel }) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = task ?? { priority: '보통', plan_id: defaultPlanId ?? plans[0]?.id, tags: [] };

  return (
    <form action={formAction} className="plan-form">
      {task && <input type="hidden" name="id" value={task.id} />}
      <label>
        어느 계획의 할 일인가요?
        <select name="plan_id" defaultValue={t.plan_id} required>
          {plans.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
        </select>
      </label>
      <label>
        할 일
        <input name="title" defaultValue={t.title} required maxLength={100} placeholder="예: SQLD 1과목 데이터 모델링 정리" />
      </label>
      <div className="row">
        <label>
          마감일 <small>(비우면 마감 없음)</small>
          <input type="date" name="due_date" defaultValue={t.due_date ?? ''} />
        </label>
        <label>
          우선순위
          <select name="priority" defaultValue={t.priority}>
            {PRIORITIES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>
          태그 <small>(쉼표로 나눠 여러 개)</small>
          <input name="tags" defaultValue={t.tags.join(', ')} maxLength={250} placeholder="예: 이론, 1과목" />
        </label>
        <label>
          예상 시간 (분)
          <input type="number" name="estimated_minutes" min={1} max={10000} defaultValue={t.estimated_minutes} required />
        </label>
      </div>
      <label>
        메모 <small>(선택)</small>
        <textarea name="note" defaultValue={t.note} maxLength={500} rows={2} />
      </label>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? '저장 중…' : submitLabel}</button>
    </form>
  );
}
