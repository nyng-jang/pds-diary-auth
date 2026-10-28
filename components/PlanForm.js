'use client';

import { useActionState } from 'react';

const AREAS = ['운동', '공부', '업무', '게임 연습', 'ALEPH', '생활'];
const PRIORITIES = ['높음', '보통', '낮음'];

export default function PlanForm({ action, plan, submitLabel }) {
  const [state, formAction, pending] = useActionState(action, null);
  const editing = Boolean(plan);
  const p = plan ?? { estimate_basis: 'per_day', priority: '보통', area: '공부' };

  return (
    <form action={formAction} className="plan-form">
      {editing && (
        <>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="version" value={p.version} />
        </>
      )}
      <label>
        계획 이름
        <input name="title" defaultValue={p.title} required maxLength={100} />
      </label>
      <div className="row">
        <label>
          분야
          <select name="area" defaultValue={p.area}>
            {AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label>
          우선순위
          <select name="priority" defaultValue={p.priority}>
            {PRIORITIES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>
          기간 시작
          <input type="date" name="start_date" defaultValue={p.start_date} required />
        </label>
        <label>
          기간 끝 <small>(비우면 끝 없이 계속)</small>
          <input type="date" name="end_date" defaultValue={p.end_date ?? ''} />
        </label>
      </div>
      <label>
        성공 기준 <small>(무엇이 되면 성공인지)</small>
        <textarea name="success_criteria" defaultValue={p.success_criteria} required maxLength={500} rows={2} />
      </label>
      <div className="row">
        <label>
          예상 시간 (분)
          <input type="number" name="estimated_minutes" min={1} max={100000} defaultValue={p.estimated_minutes} required />
        </label>
        <label>
          기준
          <select name="estimate_basis" defaultValue={p.estimate_basis}>
            <option value="per_day">하루에</option>
            <option value="total">기간 전체</option>
          </select>
        </label>
      </div>
      {editing && (
        <label>
          무엇을 왜 고치나요? <small>(이력에 남아요)</small>
          <input name="change_note" required maxLength={300} placeholder="예: 평일엔 2시간이 어려워서 90분으로 줄임" />
        </label>
      )}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? '저장 중…' : submitLabel}</button>
    </form>
  );
}
