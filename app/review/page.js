import { Fragment } from 'react';
import Link from 'next/link';
import NoLoginNotice from '@/components/NoLoginNotice';
import NoteForm from '@/components/NoteForm';
import { NoteCard } from '@/components/CarriedNotes';
import {
  METRICS, formatPeriodRange, getReviewByPlan, listNotes, parseReviewQuery, periodPresets, reviewQueryString, sumRows,
} from '@/lib/review';
import { formatMinutes, formatSignedMinutes, todaySeoul } from '@/lib/format';

export const dynamic = 'force-dynamic';

const COLS = ['planned', 'done', 'overdue', 'blocked', 'estimate', 'actual', 'diff'];

function show(metric, v) {
  if (metric === 'diff') return formatSignedMinutes(v);
  return METRICS[metric].minutes ? formatMinutes(v) : String(v);
}

// 돌아보기: 기간별 집계. 숫자를 누르면 그 숫자를 만든 할 일·실행 기록(근거 기록)으로 간다.
export default async function ReviewPage({ searchParams }) {
  const f = parseReviewQuery(await searchParams);
  const today = todaySeoul();
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const rows = await getReviewByPlan(f);
  const notes = await listNotes();
  const total = sumRows(rows);
  const presets = periodPresets(today);
  const active = presets.find((p) => p.from === f.from && p.to === f.to);
  const periodLabel = active?.from ? `${active.label}(${formatPeriodRange(f)})` : formatPeriodRange(f);
  const ev = (metric, plan) => `/review/${metric}${reviewQueryString(f, { plan })}`;

  return (
    <>
      <NoLoginNotice />
      <section aria-labelledby="review-h">
        <div className="page-head">
          <h1 id="review-h">돌아보기</h1>
          <ol className="steps" aria-label="다이어리 흐름">
            <li data-kind="plan"><Link href="/">계획</Link></li>
            <li data-kind="todo"><Link href="/tasks">할 일</Link></li>
            <li data-kind="see">돌아보기</li>
          </ol>
        </div>

        <div className="period" aria-label="기간 고르기">
          <div className="chips">
            {presets.map((p) => (
              <Link key={p.key} href={`/review${reviewQueryString(p)}`} className={`chip${active?.key === p.key ? ' chip-on' : ''}`}
                aria-current={active?.key === p.key ? 'true' : undefined}>
                {p.label}{p.from && <small>{p.from === p.to ? p.from.slice(5) : `${p.from.slice(5)}~${p.to.slice(5)}`}</small>}
              </Link>
            ))}
          </div>
          <form className="period-form" action="/review">
            <label><span>시작</span><input type="date" name="from" defaultValue={f.from ?? ''} /></label>
            <label><span>끝</span><input type="date" name="to" defaultValue={f.to ?? ''} /></label>
            <button type="submit">이 기간 보기</button>
          </form>
        </div>
        {f.error && <p className="error" role="alert">{f.error}</p>}
        <p className="sort-rule">
          <strong>{periodLabel}</strong> · 오늘(서울) {today} · 기간 안의 할 일 = 마감일이 그 기간 안인 할 일, 마감일이 없으면 만든 날로 봐요.
          지운 할 일은 세지 않아요. 시간은 모두 분 단위로 더하고 빼요.
        </p>

        <ul className="stats" aria-label="모든 계획 합계">
          {COLS.map((m) => (
            <li key={m}>
              <Link href={ev(m)} data-testid={`total-${m}`} className={m === 'diff' && total.diff !== 0 ? (total.diff > 0 ? 'stat-over' : 'stat-under') : undefined}>
                <span className="stat-label">{METRICS[m].name}</span>
                <strong>{show(m, total[m])}</strong>
                <span className="stat-link">근거 기록 보기 →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="muted">차이 = 실제 시간 − 예상 시간. +면 예상보다 오래, −면 예상보다 짧게 걸렸어요. 실행 기록이 아직 없는 할 일은 실제 0분으로 더해요.</p>
      </section>

      <section aria-labelledby="by-plan-h">
        <h2 id="by-plan-h">계획별 <span className="muted">{rows.length}개 계획</span></h2>
        <div className="table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th scope="col">계획</th>
                {COLS.map((m) => <th key={m} scope="col">{METRICS[m].name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.plan_id} data-plan={r.plan_id}>
                  <th scope="row"><Link href={`/plans/${r.plan_id}`}>#{r.plan_id} {r.plan_title}</Link></th>
                  {COLS.map((m) => (
                    <td key={m} className={m === 'diff' && r.diff ? (r.diff > 0 ? 'over' : 'under') : undefined}>
                      <Link href={ev(m, r.plan_id)} data-testid={`plan-${r.plan_id}-${m}`}>{show(m, r[m])}</Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">합계</th>
                {COLS.map((m) => <td key={m}><Link href={ev(m)}>{show(m, total[m])}</Link></td>)}
              </tr>
            </tfoot>
          </table>
        </div>
        <dl className="compact rules">
          {COLS.map((m) => <Fragment key={m}><dt>{METRICS[m].name}</dt><dd>{METRICS[m].rule}</dd></Fragment>)}
        </dl>
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
