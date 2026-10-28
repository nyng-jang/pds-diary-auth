import Link from 'next/link';
import { notFound } from 'next/navigation';
import NoLoginNotice from '@/components/NoLoginNotice';
import { METRICS, formatPeriodRange, listEvidenceTasks, parseReviewQuery, reviewQueryString } from '@/lib/review';
import { getPlan } from '@/lib/plans';
import { formatMinutes, formatRange, formatSignedMinutes } from '@/lib/format';

export const dynamic = 'force-dynamic';

// 근거 기록: 돌아보기 숫자 하나를 누르면 오는 곳. 그 숫자를 만든 할 일과 실행 기록을 모두 보여 주고,
// 아래에서 다시 세거나 더한 값이 돌아보기 숫자와 같은지 바로 볼 수 있게 한다.
export default async function EvidencePage({ params, searchParams }) {
  const { metric } = await params;
  const m = METRICS[metric];
  if (!m) notFound();
  const f = parseReviewQuery(await searchParams);

  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const plan = f.plan ? await getPlan(f.plan) : null;
  if (f.plan && !plan) notFound();
  const tasks = await listEvidenceTasks(metric, f);

  const estimate = tasks.reduce((a, t) => a + t.estimated_minutes, 0);
  const actual = tasks.reduce((a, t) => a + t.actual_minutes, 0);
  const value = { estimate, actual, diff: actual - estimate }[metric] ?? tasks.length;
  const shown = metric === 'diff' ? formatSignedMinutes(value) : m.minutes ? formatMinutes(value) : `${value}개`;
  const scope = plan ? `계획 #${plan.id} ${plan.title}` : '모든 계획';
  const showLogs = ['blocked', 'actual', 'diff'].includes(metric);
  const today = tasks[0]?.today;

  const withLogs = tasks.filter((t) => t.log_count > 0);
  const over = withLogs.filter((t) => t.actual_minutes > t.estimated_minutes).length;
  const under = withLogs.filter((t) => t.actual_minutes < t.estimated_minutes).length;

  return (
    <>
      <NoLoginNotice />
      <p><Link href={`/review${reviewQueryString(f)}`}>← 돌아보기 ({formatPeriodRange(f)})</Link></p>
      <section aria-labelledby="ev-h">
        <h1 id="ev-h">근거 기록 · {m.name} <span data-testid="evidence-value">{shown}</span></h1>
        <p className="sort-rule">
          <strong>{scope} · {formatPeriodRange(f)}</strong> · {m.rule}.
          {metric === 'overdue' && today && ` 오늘(서울) = ${today}.`}
        </p>

        {tasks.length === 0 ? (
          <p className="muted" data-testid="evidence-empty">이 조건에 맞는 할 일이 없어요. 그래서 {m.name}는 {m.minutes ? '0분' : '0'}이에요.</p>
        ) : (
          <div className="table-wrap">
            <table className="review-table evidence-table">
              <thead>
                <tr>
                  <th scope="col">할 일</th>
                  <th scope="col">계획</th>
                  <th scope="col">상태</th>
                  <th scope="col">마감일</th>
                  <th scope="col">예상</th>
                  <th scope="col">실제</th>
                  <th scope="col">차이</th>
                  {showLogs && <th scope="col">실행 기록</th>}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const d = t.actual_minutes - t.estimated_minutes;
                  return (
                    <tr key={t.id} data-task={t.id}>
                      <th scope="row"><Link href={`/tasks/${t.id}`}>#{t.id} {t.title}</Link></th>
                      <td><Link href={`/plans/${t.plan_id}`}>#{t.plan_id} {t.plan_title}</Link></td>
                      <td>{t.status}{t.completion_id && <small className="muted"> (완료 기록 #{t.completion_id})</small>}</td>
                      <td>{t.due_date ?? <span className="muted">없음 (만든 날 {t.basis_date})</span>}
                        {t.status !== '완료' && t.due_date && t.due_date < t.today && <small className="late"> 지남</small>}</td>
                      <td>{formatMinutes(t.estimated_minutes)}</td>
                      <td>{t.log_count ? formatMinutes(t.actual_minutes) : <span className="muted">0분 (기록 없음)</span>}</td>
                      <td className={d > 0 ? 'over' : d < 0 ? 'under' : undefined}>{formatSignedMinutes(d)}</td>
                      {showLogs && (
                        <td>
                          {t.logs.length === 0 ? <span className="muted">없음</span> : (
                            <ul className="log-links">
                              {t.logs.map((l) => (
                                <li key={l.id}>
                                  <Link href={`/tasks/${t.id}#log-${l.id}`}>기록 #{l.id}</Link> {formatRange(l.started_at, l.ended_at)} · {formatMinutes(l.actual_minutes)}
                                  {l.blocker && <span className="blocker"> · 막힘: {l.blocker}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">합계 {tasks.length}개</th>
                  <td /><td /><td />
                  <td>{formatMinutes(estimate)}</td>
                  <td>{formatMinutes(actual)}</td>
                  <td>{formatSignedMinutes(actual - estimate)}</td>
                  {showLogs && <td>{tasks.reduce((a, t) => a + t.log_count, 0)}건</td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {metric === 'diff' && tasks.length > 0 && (
          <p className="muted">
            실행 기록이 있는 할 일 {withLogs.length}개 중 예상보다 오래 걸린 할 일 {over}개, 짧게 걸린 할 일 {under}개,
            예상과 같은 할 일 {withLogs.length - over - under}개. 기록이 없는 할 일 {tasks.length - withLogs.length}개는 실제 0분으로 더했어요.
          </p>
        )}
      </section>

      <nav className="chips" aria-label="다른 숫자의 근거">
        {Object.entries(METRICS).map(([k, x]) => (
          <Link key={k} className={`chip${k === metric ? ' chip-on' : ''}`} href={`/review/${k}${reviewQueryString(f, { plan: f.plan })}`}>{x.name}</Link>
        ))}
      </nav>
    </>
  );
}
