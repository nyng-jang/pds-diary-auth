import { Fragment } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import NoLoginNotice from '@/components/NoLoginNotice';
import NoteForm from '@/components/NoteForm';
import { NoteCard } from '@/components/CarriedNotes';
import {
  METRICS, formatPeriodRange, getReviewByPlan, listNotes, parseReviewQuery, periodPresets, reviewQueryString, sumRows,
} from '@/lib/review';
import { formatMinutes, formatSignedMinutes, todaySeoul } from '@/lib/format';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const COLS = ['planned', 'done', 'overdue', 'blocked', 'estimate', 'actual', 'diff'];

// 위쪽 요약 칸. 개수 넷, 시간 셋(실제 − 예상 = 차이).
const COUNT_CELLS = [
  { m: 'planned', icon: 'list', tone: 'todo' },
  { m: 'done', icon: 'check', tone: 'done' },
  { m: 'overdue', icon: 'alert', tone: 'warn' },
  { m: 'blocked', icon: 'ban', tone: 'soon' },
];
const TIME_CELLS = [
  { m: 'actual', icon: 'timer', tone: 'do' },
  { op: '−' },
  { m: 'estimate', icon: 'clock', tone: 'plan' },
  { op: '=' },
  { m: 'diff', icon: 'history', tone: 'see' },
];

// 표 위 탭: 계획을 상태로 나눠 본다
const VIEWS = {
  all: { name: '전체', test: () => true },
  late: { name: '지연 있음', test: (r) => r.overdue > 0 },
  blocked: { name: '막힘 있음', test: (r) => r.blocked > 0 },
  smooth: { name: '순조로움', test: (r) => r.planned > 0 && !r.overdue && !r.blocked },
  empty: { name: '할 일 없음', test: (r) => r.planned === 0 },
};

function planState(r) {
  if (r.planned === 0) return { text: '할 일 없음', tone: 'muted' };
  if (r.overdue > 0) return { text: `지연 ${r.overdue}`, tone: 'warn' };
  if (r.blocked > 0) return { text: `막힘 ${r.blocked}`, tone: 'soon' };
  if (r.done === r.planned) return { text: '모두 완료', tone: 'done' };
  return { text: '순조로움', tone: 'todo' };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// 계획마다 막대 하나 (값이 가장 큰 계획을 진하게). 숫자 칸 옆의 작은 그림.
function Bars({ rows, metric }) {
  const vals = rows.map((r) => Math.abs(r[metric]));
  const max = Math.max(1, ...vals);
  const top = vals.indexOf(Math.max(...vals));
  return (
    <span className="bars" aria-hidden="true">
      {vals.map((v, i) => <i key={rows[i].plan_id} className={i === top && v > 0 ? 'on' : undefined} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}
    </span>
  );
}

function show(metric, v) {
  if (metric === 'diff') return formatSignedMinutes(v);
  return METRICS[metric].minutes ? formatMinutes(v) : String(v);
}

// 돌아보기: 기간별 집계. 숫자를 누르면 그 숫자를 만든 할 일·실행 기록(근거 기록)으로 간다.
export default async function ReviewPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const f = parseReviewQuery(sp);
  const view = sp.view in VIEWS ? sp.view : 'all';
  const today = todaySeoul();
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const rows = await getReviewByPlan(f);
  const notes = await listNotes();
  const total = sumRows(rows);
  const presets = periodPresets(today);
  const active = presets.find((p) => p.from === f.from && p.to === f.to);
  const periodLabel = active?.from ? `${active.label}(${formatPeriodRange(f)})` : formatPeriodRange(f);
  const ev = (metric, plan) => `/review/${metric}${reviewQueryString(f, { plan })}`;
  const shownRows = rows.filter(VIEWS[view].test);
  const sub = {
    planned: `계획 ${rows.length}개에 딸린 할 일`,
    done: `할 일 ${total.planned}개 중`,
    overdue: '완료 안 했고 마감 지남',
    blocked: '막힌 이유가 적힌 할 일',
    actual: '실행 기록 합계',
    estimate: '할 일 예상 시간 합계',
    diff: total.diff > 0 ? '예상보다 오래 걸림' : total.diff < 0 ? '예상보다 짧게 걸림' : '예상과 같음',
  };
  const badge = {
    done: { text: `${pct(total.done, total.planned)}%`, tone: 'done' },
    overdue: total.overdue > 0 && { text: `${pct(total.overdue, total.planned)}%`, tone: 'warn' },
    blocked: total.blocked > 0 && { text: `${pct(total.blocked, total.planned)}%`, tone: 'soon' },
    diff: total.estimate > 0 && total.diff !== 0 && { text: `${total.diff > 0 ? '+' : ''}${pct(total.diff, total.estimate)}%`, tone: total.diff > 0 ? 'soon' : 'todo' },
  };
  const statCell = ({ m, icon, tone }) => (
    <li key={m} className="stat">
      <Link href={ev(m)} data-testid={`total-${m}`} className={m === 'diff' && total.diff !== 0 ? (total.diff > 0 ? 'stat-over' : 'stat-under') : undefined}>
        <span className="stat-head">
          <span className={`stat-icon tone-${tone}`}><Icon name={icon} size={15} /></span>
          <span className="stat-label">{METRICS[m].name}</span>
          {badge[m] && <span className={`badge tone-${badge[m].tone}`}>{badge[m].text}</span>}
        </span>
        <span className="stat-body">
          <span>
            <strong>{show(m, total[m])}</strong>
            <small>{sub[m]}</small>
          </span>
          <Bars rows={rows} metric={m} />
        </span>
        <span className="stat-link">근거 기록 →</span>
      </Link>
    </li>
  );

  return (
    <>
      <NoLoginNotice />
      <section aria-labelledby="review-h">
        <div className="review-head">
          <h1 id="review-h">돌아보기</h1>
          <nav className="seg" aria-label="기간 바로 고르기">
            {presets.map((p) => (
              <Link key={p.key} href={`/review${reviewQueryString(p)}`} aria-current={active?.key === p.key ? 'true' : undefined}
                title={p.from ? (p.from === p.to ? p.from : `${p.from} ~ ${p.to}`) : '모든 기간'}>
                {p.label}
              </Link>
            ))}
          </nav>
          <details className="range">
            <summary><Icon name="calendar" /><span>{formatPeriodRange(f)}</span><Icon name="chevron" size={14} /></summary>
            <form className="range-pop" action="/review">
              <label><span>시작</span><input type="date" name="from" defaultValue={f.from ?? ''} /></label>
              <label><span>끝</span><input type="date" name="to" defaultValue={f.to ?? ''} /></label>
              <button type="submit">이 기간 보기</button>
            </form>
          </details>
        </div>
        {f.error && <p className="error" role="alert">{f.error}</p>}
        <p className="muted review-sub">
          <strong>{periodLabel}</strong> · 오늘(서울) {today} · 숫자를 누르면 그 숫자를 만든 할 일과 실행 기록이 나와요.
        </p>

        <ul className="stat-panel" aria-label="모든 계획 합계: 개수">
          {COUNT_CELLS.map(statCell)}
        </ul>
        <ul className="stat-panel" aria-label="모든 계획 합계: 시간 (실제 − 예상 = 차이)">
          {TIME_CELLS.map((c, i) => c.op
            ? <li key={i} className="stat-op" aria-hidden="true"><span>{c.op}</span></li>
            : statCell(c))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="by-plan-h">
        <div className="panel-head">
          <h2 id="by-plan-h">계획별</h2>
          <span className="count-badge">{rows.length}</span>
        </div>
        <nav className="tabs" aria-label="계획 나눠 보기">
          {Object.entries(VIEWS).map(([k, v]) => (
            <Link key={k} href={`/review${reviewQueryString(f, { view: k === 'all' ? null : k })}`} aria-current={view === k ? 'true' : undefined}>
              {v.name} <span>{rows.filter(v.test).length}</span>
            </Link>
          ))}
        </nav>
        <div className="table-scroll">
          <table className="review-table">
            <thead>
              <tr>
                <th scope="col">계획</th>
                <th scope="col">상태</th>
                {COLS.map((m) => <th key={m} scope="col">{METRICS[m].name}</th>)}
              </tr>
            </thead>
            <tbody>
              {shownRows.length === 0 && (
                <tr><td colSpan={COLS.length + 2} className="empty-row">이 탭에 해당하는 계획이 없어요.</td></tr>
              )}
              {shownRows.map((r) => {
                const st = planState(r);
                return (
                  <tr key={r.plan_id} data-plan={r.plan_id}>
                    <th scope="row">
                      <Link href={`/plans/${r.plan_id}`} className="who">
                        <span className="avatar" aria-hidden="true">{r.plan_title.slice(0, 1)}</span>
                        <span><strong>{r.plan_title}</strong><small>#{r.plan_id} · {r.plan_area}</small></span>
                      </Link>
                    </th>
                    <td><span className={`pill tone-${st.tone}`}>{st.text}</span></td>
                    {COLS.map((m) => (
                      <td key={m} className={m === 'diff' && r.diff ? (r.diff > 0 ? 'over' : 'under') : undefined}>
                        <Link href={ev(m, r.plan_id)} data-testid={`plan-${r.plan_id}-${m}`}>{show(m, r[m])}</Link>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {view === 'all' && (
              <tfoot>
                <tr>
                  <th scope="row">합계</th>
                  <td />
                  {COLS.map((m) => <td key={m}><Link href={ev(m)}>{show(m, total[m])}</Link></td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="panel-foot">
          <span className="muted">계획 {rows.length}개 중 {shownRows.length}개 보는 중</span>
          <details className="rules-toggle">
            <summary>숫자 세는 규칙</summary>
            <p className="muted">
              기간 안의 할 일 = 마감일이 그 기간 안인 할 일, 마감일이 없으면 만든 날로 봐요. 지운 할 일은 세지 않아요.
              시간은 모두 분 단위로 더하고 빼요. 실행 기록이 아직 없는 할 일은 실제 0분으로 더해요.
            </p>
            <dl className="compact rules">
              {COLS.map((m) => <Fragment key={m}><dt>{METRICS[m].name}</dt><dd>{METRICS[m].rule}</dd></Fragment>)}
            </dl>
          </details>
        </div>
      </section>

      <section id="next" aria-labelledby="next-h">
        <NoteForm
          key={notes.length}
          requestKey={crypto.randomUUID()}
          from={f.from}
          to={f.to}
          plans={rows.map((r) => ({ id: r.plan_id, title: r.plan_title }))}
          periodLabel={periodLabel}
        />
      </section>

      <section id="notes" aria-labelledby="notes-h">
        <h2 id="notes-h">다음 계획으로 넘긴 고칠 점 <span className="muted">{notes.length}건</span></h2>
        {notes.length === 0 ? <p className="muted">아직 없어요. 위 숫자와 근거 기록을 보고 다음 계획에서 고칠 점 한 가지를 정해 보세요.</p> : (
          <ol className="flow-grid">
            {notes.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}
          </ol>
        )}
      </section>
    </>
  );
}
