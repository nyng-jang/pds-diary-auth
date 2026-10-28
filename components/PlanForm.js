'use client';

import { useActionState } from 'react';
import PromptBox from './PromptBox';

const AREAS = ['운동', '공부', '업무', '게임 연습', 'ALEPH', '생활'];
const PRIORITIES = ['높음', '보통', '낮음'];

export default function PlanForm({ action, plan, submitLabel, heading, carryNote }) {
  const [state, formAction, pending] = useActionState(action, null);
  const editing = Boolean(plan);
  const p = plan ?? { estimate_basis: 'per_day', priority: '보통', area: '공부' };

  return (
    <PromptBox title={heading} icon="target" state={pending ? 'busy' : state?.error ? 'error' : 'idle'}>
      <form action={formAction} className="pform">
        {editing && (
          <>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="version" value={p.version} />
          </>
        )}
        {carryNote && (
          <>
            <input type="hidden" name="carry_note_id" value={carryNote.id} />
            <p className="quote quote-carry" data-testid="carry-note">
              <span className="quote-label">돌아보기에서 넘어온 고칠 점 #{carryNote.id} · 이 계획을 저장하면 함께 붙어요</span>
              {carryNote.lesson}
            </p>
          </>
        )}
        <div className="pform-context">
          <label className="pill-field">
            <span>분야</span>
            <select name="area" defaultValue={p.area}>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="pill-field">
            <span>우선순위</span>
            <select name="priority" defaultValue={p.priority}>
              {PRIORITIES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <label className="pform-main">
          <span>계획 이름</span>
          <input name="title" defaultValue={p.title} required maxLength={100} placeholder="예: SQLD 공부" />
        </label>
        <label className="pform-main">
          <span>성공 기준 <small>(무엇이 되면 성공인지)</small></span>
          <textarea name="success_criteria" defaultValue={p.success_criteria} required maxLength={500} rows={2} placeholder="예: 모의고사 1회 풀기" />
        </label>
        <div className="pform-fields">
          <label>
            <span>기간 시작</span>
            <input type="date" name="start_date" defaultValue={p.start_date} required />
          </label>
          <label>
            <span>기간 끝 <small>(비우면 끝 없이)</small></span>
            <input type="date" name="end_date" defaultValue={p.end_date ?? ''} />
          </label>
          <label>
            <span>예상 시간 (분)</span>
            <input type="number" name="estimated_minutes" min={1} max={100000} defaultValue={p.estimated_minutes} required />
          </label>
          <label>
            <span>기준</span>
            <select name="estimate_basis" defaultValue={p.estimate_basis}>
              <option value="per_day">하루에</option>
              <option value="total">기간 전체</option>
            </select>
          </label>
        </div>
        {editing && (
          <label className="pform-main">
            <span>무엇을 왜 고치나요? <small>(이력에 남아요)</small></span>
            <input name="change_note" required maxLength={300} placeholder="예: 평일엔 2시간이 어려워서 90분으로 줄임" />
          </label>
        )}
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">저장하면 서버 데이터베이스에 바로 남아요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : submitLabel}</button>
        </div>
      </form>
    </PromptBox>
  );
}
