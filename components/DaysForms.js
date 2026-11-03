'use client';

import { useActionState } from 'react';
import PromptBox from './PromptBox';
import { addDayAction, changeRuleAction, saveSettingsAction } from '@/app/days-actions';
import { deleteAccountAction } from '@/app/auth-actions';

function boxState(pending, state) {
  return pending ? 'busy' : state?.error ? 'error' : 'idle';
}

// 1일차 설정: 질문·지표·단위·계산 규칙·계획 규칙. 1일차 기록을 남기기 전까지만 고칠 수 있다.
export function SettingsForm({ kind, kindLabel, values, fields }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, null);
  return (
    <PromptBox title="1일차에 정하기" icon="target" state={boxState(pending, state)}>
      <form action={formAction} className="pform">
        <input type="hidden" name="metric_kind" value={kind} />
        <p className="muted">지표 종류: <strong>{kindLabel}</strong></p>
        {fields.map(([key, label, max]) => (
          <label key={key} className="pform-main">
            <span>{label}</span>
            <textarea name={key} defaultValue={values[key] ?? ''} required maxLength={max} rows={key === 'calc_rule' ? 3 : 2} />
          </label>
        ))}
        <div className="pform-fields">
          <label className="pill-field">
            <span>"튐" 기준 (단위와 같은 숫자)</span>
            <input name="outlier_threshold" inputMode="decimal" defaultValue={values.outlier_threshold ?? ''} required size={6} />
          </label>
          <label className="pill-field">
            <span>주 시작 요일</span>
            <select name="week_start" defaultValue={values.week_start ?? '월요일'}>
              <option>월요일</option>
              <option>일요일</option>
            </select>
          </label>
        </div>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">1일차 기록을 남기면 더는 고칠 수 없어요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : '이대로 정하기'}</button>
        </div>
      </form>
    </PromptBox>
  );
}

// 오늘 기록 남기기. 값은 서버가 다시 계산해 저장한다 (직접 정하기일 때만 값을 받는다).
export function DayForm({ dayNo, manual, unit, preview }) {
  const [state, formAction, pending] = useActionState(addDayAction, null);
  return (
    <PromptBox title={`${dayNo}일차 기록 남기기`} icon="calendar" state={boxState(pending, state)}>
      <form action={formAction} className="pform">
        {preview}
        {manual && (
          <label className="pill-field">
            <span>오늘 값 ({unit})</span>
            <input name="value" inputMode="decimal" required size={8} />
          </label>
        )}
        <label className="pform-main">
          <span>메모 <small>(선택, 500자까지)</small></span>
          <textarea name="note" maxLength={500} rows={2} />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">날짜는 저장하는 순간의 서울 날짜로 정해져요. 하루에 한 번만 남길 수 있고, 남긴 기록은 고칠 수 없어요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : `${dayNo}일차로 저장`}</button>
        </div>
      </form>
    </PromptBox>
  );
}

// 2일차 뒤 3일차 앞: 계획 규칙 하나 바꾸기
export function RuleForm({ beforeRule }) {
  const [state, formAction, pending] = useActionState(changeRuleAction, null);
  return (
    <PromptBox title="계획 규칙 하나 바꾸기 (3일차 전)" icon="history" state={boxState(pending, state)}>
      <form action={formAction} className="pform">
        <p className="muted">지금 규칙: <strong>{beforeRule}</strong></p>
        <label className="pform-main">
          <span>바꾼 계획 규칙 (하나만)</span>
          <textarea name="after_rule" required maxLength={300} rows={2} />
        </label>
        <label className="pform-main">
          <span>바꾸는 이유 (1·2일차 기록을 보고)</span>
          <textarea name="reason" required maxLength={500} rows={3} />
        </label>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        <div className="pform-foot">
          <span className="muted">바꾼 시각이 함께 남고, 한 번만 바꿀 수 있어요. 지표·단위·계산 규칙은 그대로예요.</span>
          <button type="submit" className="send" disabled={pending}>{pending ? '저장 중…' : '규칙 바꾸기'}</button>
        </div>
      </form>
    </PromptBox>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, null);
  return (
    <form action={formAction} className="pform auth-form">
      <label className="pform-main">
        <span>지금 비밀번호</span>
        <input type="password" name="current_password" autoComplete="current-password" required maxLength={72} />
      </label>
      <label className="pform-main">
        <span>확인: <strong>계정 삭제</strong> 라고 적어 주세요</span>
        <input name="confirm_text" required autoComplete="off" />
      </label>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="pform-foot">
        <span className="muted">지우면 되돌릴 수 없어요.</span>
        <button type="submit" className="send danger" disabled={pending}>{pending ? '지우는 중…' : '계정과 자료 모두 지우기'}</button>
      </div>
    </form>
  );
}
