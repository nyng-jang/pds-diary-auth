import Link from 'next/link';
import { Fragment } from 'react';
import { requireUser } from '@/lib/auth';
import { KINDS, SETTING_FIELDS, computeToday, getDiary, summarize, toTenths, fmtTenths, weekStartOf } from '@/lib/days';
import { formatTime, todaySeoul } from '@/lib/format';
import { DayForm, RuleForm, SettingsForm } from '@/components/DaysForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: '5일 기록 · 플랜두씨 다이어리' };

const SAVED = {
  settings: '질문·지표·규칙을 정했어요. 1일차 기록을 남기면 그대로 고정돼요.',
  rule: '계획 규칙을 바꿨어요. 3일차부터 바꾼 규칙으로 기록돼요.',
};

export default async function DaysPage({ searchParams }) {
  const { id: uid } = await requireUser();
  const sp = await searchParams;
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const { exp, days, change } = await getDiary(uid);
  const today = todaySeoul();
  const savedText = SAVED[sp.saved] ?? (/^day[1-5]$/.test(sp.saved ?? '') ? `${sp.saved.slice(3)}일차 기록을 남겼어요.` : null);

  // 아직 1일차 전: 설정을 정하거나 고친다
  const editable = !exp || days.length === 0;
  const kind = editable && KINDS[sp.kind] ? sp.kind : exp?.metric_kind ?? 'completion_rate';
  const values = exp && kind === exp.metric_kind ? { ...exp, outlier_threshold: String(Number(exp.outlier_threshold)) } : KINDS[kind].defaults;

  const recordedToday = days.some((d) => d.record_date === today);
  const needRule = days.length === 2 && !change;
  const canRecord = exp && days.length < 5 && !recordedToday && !needRule;
  const preview = canRecord ? await computeToday(uid, exp) : null;

  const before = summarize(days.filter((d) => d.day_no <= 2));
  const after = summarize(days.filter((d) => d.day_no >= 3));
  const all = summarize(days);
  const threshold = exp ? toTenths(exp.outlier_threshold) : 0;
  const isOutlier = (d) => days.length === 5 && Math.abs(toTenths(d.value) - all.avg) > threshold;
  const unit = exp?.unit ?? '';

  return (
    <>
      {savedText && <p className="ok" role="status">{savedText}</p>}
      <section aria-labelledby="days-h">
        <div className="page-head">
          <h1 id="days-h">5일 기록</h1>
          <span className="muted">서로 다른 날짜 5일 · 2일차 뒤 3일차 앞에 계획 규칙 하나 바꾸기 · 서울 시간 기준</span>
        </div>

        {exp && (
          <div className="panel">
            <div className="panel-head">
              <h2>1일차에 정한 것</h2>
              <span className="count-badge">{days.length ? `${formatTime(days[0].created_at)} 고정` : '아직 고칠 수 있음'}</span>
            </div>
            <dl className="facts" style={{ padding: '0 16px 16px' }}>
              {SETTING_FIELDS.map(([k, label]) => (
                <Fragment key={k}><dt>{label}</dt><dd>{exp[k]}</dd></Fragment>
              ))}
              <dt>"튐" 기준</dt><dd>5일 평균에서 {fmtTenths(threshold)}{unit} 넘게 벗어난 날</dd>
              <dt>주 시작 요일</dt><dd>{exp.week_start}</dd>
            </dl>
          </div>
        )}
      </section>

      {editable && (
        <section aria-labelledby="set-h">
          <h2 id="set-h">{exp ? '정한 것 고치기 (1일차 전까지)' : '먼저 질문·지표·규칙을 한 번 정해요'}</h2>
          <nav className="tabs" aria-label="지표 종류">
            {Object.entries(KINDS).map(([k, v]) => (
              <Link key={k} href={`/days?kind=${k}`} aria-current={kind === k ? 'true' : undefined}>{v.label}</Link>
            ))}
          </nav>
          <SettingsForm key={kind} kind={kind} kindLabel={KINDS[kind].label} values={values} fields={SETTING_FIELDS} />
        </section>
      )}

      {exp && (
        <section className="panel" aria-labelledby="sum-h">
          <div className="panel-head">
            <h2 id="sum-h">규칙 바꾸기 전과 뒤 ({exp.metric_name}, {unit})</h2>
          </div>
          <div className="table-scroll">
            <table className="review-table evidence-table" data-testid="days-summary">
              <thead>
                <tr><th scope="col">묶음</th><th scope="col">날 수</th><th scope="col">합계</th><th scope="col">평균</th><th scope="col">손으로 다시 해 보기</th></tr>
              </thead>
              <tbody>
                {[['바꾸기 전 (1·2일차)', before], ['바꾼 뒤 (3~5일차)', after], ['5일 전체', all]].map(([name, s]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{s.n}일</td>
                    <td data-testid={`sum-${name}`}>{s.n ? `${s.sumText}${unit}` : '—'}</td>
                    <td data-testid={`avg-${name}`}>{s.n ? `${s.avgText}${unit}` : '—'}</td>
                    <td>{s.n ? `${s.formula} = ${s.sumText} ÷ ${s.n} = ${s.avgText}` : '아직 기록 없음'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-foot">
            <span className="muted">
              {before.n && after.n
                ? `평균 차이(바꾼 뒤 − 바꾸기 전) = ${after.avgText} − ${before.avgText} = ${fmtTenths(after.avg - before.avg)}${unit}`
                : '바꾸기 전·뒤 기록이 모두 생기면 평균 차이가 나와요.'}
              {' '}· 반올림: {exp.rounding_rule}
            </span>
          </div>
        </section>
      )}

      {exp && (
        <section className="panel" aria-labelledby="rec-h">
          <div className="panel-head">
            <h2 id="rec-h">날마다 남긴 기록</h2>
            <span className="count-badge">{days.length} / 5</span>
          </div>
          <div className="table-scroll">
            <table className="review-table evidence-table" data-testid="days-table">
              <thead>
                <tr>
                  <th scope="col">일차</th><th scope="col">날짜 (서울)</th><th scope="col">주 ({exp.week_start} 시작)</th>
                  <th scope="col">따른 계획 규칙</th><th scope="col">계산</th><th scope="col">값</th><th scope="col">기록한 시각</th><th scope="col">메모</th>
                </tr>
              </thead>
              <tbody>
                {days.length === 0 && <tr><td colSpan={8} className="empty-row">아직 기록이 없어요.</td></tr>}
                {days.map((d) => (
                  <Fragment key={d.id}>
                    <tr data-day={d.day_no}>
                      <th scope="row">{d.day_no}일차 <small className="muted">#{d.id}</small></th>
                      <td>{d.record_date}</td>
                      <td>{weekStartOf(d.record_date, exp.week_start)} 주</td>
                      <td>{d.plan_rule}</td>
                      <td>
                        {exp.metric_kind === 'completion_rate' && `${d.numerator} ÷ ${d.denominator} × 100`}
                        {exp.metric_kind === 'time_gap' && `${d.numerator} − ${d.denominator}`}
                        {exp.metric_kind === 'manual' && '직접 적음'}
                        {d.detail?.length > 0 && (
                          <details><summary>할 일 {d.detail.length}개</summary>
                            <ul className="plain-list">
                              {d.detail.map((t) => (
                                <li key={t.id}>#{t.id} {t.title} · {t.status} · 예상 {t.estimated_minutes}분 · 실제 {t.actual_minutes}분</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td><strong>{fmtTenths(toTenths(d.value))}{unit}</strong>{isOutlier(d) && <span className="pill tone-warn"> 튐</span>}</td>
                      <td>{formatTime(d.created_at)}</td>
                      <td>{d.note || '—'}</td>
                    </tr>
                    {d.day_no === 2 && change && (
                      <tr data-rule-change={change.id} className="rule-change-row">
                        <th scope="row">규칙 변경 <small className="muted">#{change.id}</small></th>
                        <td colSpan={7}>
                          <strong>{formatTime(change.changed_at)}</strong> · 1일차(#{change.day1_id})·2일차(#{change.day2_id}) 기록 뒤, 3일차 앞
                          <br />바꾸기 전: {change.before_rule}
                          <br />바꾼 뒤: <strong>{change.after_rule}</strong>
                          <br />이유: {change.reason}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-foot">
            <span className="muted">"튐" 표시는 5일이 모두 모이면 붙어요. 튄 날도 지우지 않고 합계·평균에 그대로 들어가요.</span>
          </div>
        </section>
      )}

      {exp && (
        <section aria-label="오늘 할 일">
          {days.length >= 5 && <p className="ok" role="status">5일 기록을 모두 남겼어요.</p>}
          {needRule && <RuleForm beforeRule={exp.plan_rule} />}
          {!needRule && recordedToday && days.length < 5 && (
            <p className="muted">오늘({today}) 기록은 남겼어요. 다음 기록은 내일(서울) 남길 수 있어요.</p>
          )}
          {canRecord && (
            <DayForm
              dayNo={days.length + 1}
              manual={exp.metric_kind === 'manual'}
              unit={unit}
              preview={preview.ok ? (
                !preview.manual && (
                  <p>
                    오늘({today}) 값 미리 보기: <strong>{fmtTenths(toTenths(preview.value))}{unit}</strong>{' '}
                    <span className="muted">
                      ({exp.metric_kind === 'completion_rate'
                        ? `${preview.numerator} ÷ ${preview.denominator} × 100`
                        : `실제 ${preview.numerator}분 − 예상 ${preview.denominator}분`}
                      , 오늘 마감인 할 일 {preview.detail.length}개. 저장할 때 다시 계산해요)
                    </span>
                  </p>
                )
              ) : <p className="error">{preview.reason}</p>}
            />
          )}
        </section>
      )}
    </>
  );
}
