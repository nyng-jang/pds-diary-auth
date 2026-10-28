import Link from 'next/link';
import NoLoginNotice from '@/components/NoLoginNotice';
import LogCard from '@/components/LogCard';
import { getReviewCounts, listCompletions, listLogs } from '@/lib/logs';
import { formatMinutes, formatTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

// 돌아보기 (지금은 집계만). 숫자를 누르면 그 숫자를 만든 기록 목록으로 간다.
export default async function ReviewPage() {
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const counts = await getReviewCounts();
  const completions = await listCompletions();
  const logs = await listLogs();

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
        <ul className="stats" aria-label="집계">
          <li><a href="#completions"><span className="stat-label">완료 수</span><strong data-testid="completion-count">{counts.completions}</strong></a></li>
          <li><a href="#logs"><span className="stat-label">실행 기록</span><strong data-testid="log-count">{counts.logs}건</strong></a></li>
          <li><a href="#logs"><span className="stat-label">실제로 쓴 시간</span><strong>{formatMinutes(counts.actual_minutes)}</strong></a></li>
          <li><a href="#logs"><span className="stat-label">막힌 기록</span><strong>{counts.blocked_logs}건</strong></a></li>
        </ul>
        <p className="muted">완료 수는 지금 완료 상태인 완료 기록의 수예요. 완료 버튼은 연달아 눌러도 한 번만 기록되고, 진행 중으로 되돌리면 하나 줄어요.</p>
      </section>

      <section id="completions" aria-labelledby="comp-h">
        <h2 id="comp-h">완료 기록 <span className="muted">{completions.length}건</span></h2>
        {completions.length === 0 ? <p className="muted">아직 완료한 할 일이 없어요.</p> : (
          <ol className="plain-list">
            {completions.map((c) => (
              <li key={c.id}>
                <Link href={`/tasks/${c.task_id}`}>할 일 #{c.task_id} {c.task_title}</Link>
                <span className="muted"> · 계획 #{c.plan_id} {c.plan_title} · {formatTime(c.completed_at)} 완료 · 완료 기록 #{c.id}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section id="logs" aria-labelledby="logs-h">
        <h2 id="logs-h">실행 기록 <span className="muted">{logs.length}건</span></h2>
        {logs.length === 0 ? <p className="muted">아직 실행 기록이 없어요. 할 일 화면에서 실제로 한 일을 적어 보세요.</p> : (
          <ol className="flow-grid" aria-label="모든 실행 기록">
            {logs.map((l) => <li key={l.id}><LogCard log={l} withTask /></li>)}
          </ol>
        )}
      </section>
    </>
  );
}
