import Link from 'next/link';
import FlowCard, { Chip, Meta } from './FlowCard';
import { formatMinutes, formatRange, formatTime } from '@/lib/format';

// 실행 기록 하나. 보라 탭 "실제로 한 일". withTask면 어느 할 일의 기록인지 제목과 칩으로 보여 준다.
export default function LogCard({ log: l, withTask = false, titleAs = 'h3' }) {
  return (
    <FlowCard
      id={`log-${l.id}`}
      kind="do"
      tab={withTask ? `실제로 한 일 · 할 일 #${l.task_id}` : '실제로 한 일'}
      icon="clock"
      title={withTask ? l.task_title : formatRange(l.started_at, l.ended_at)}
      href={withTask ? `/tasks/${l.task_id}#log-${l.id}` : undefined}
      titleAs={titleAs}
      meta={<>
        <Meta>기록 #{l.id}</Meta>
        <Meta>남긴 때 {formatTime(l.created_at)}</Meta>
      </>}
    >
      <dl className="facts log-facts">
        <dt>시작</dt><dd>{formatTime(l.started_at)}</dd>
        <dt>끝</dt><dd>{formatTime(l.ended_at)}</dd>
        <dt>실제로 걸린 시간</dt><dd><strong>{formatMinutes(l.actual_minutes)}</strong></dd>
      </dl>
      {l.blocker
        ? <p className="quote quote-warn"><span className="quote-label">막혔던 이유</span>{l.blocker}</p>
        : <p className="quote"><span className="quote-label">막혔던 이유</span>막힌 곳 없음</p>}
      {withTask && (
        <div className="chips">
          <Chip icon="list" href={`/tasks/${l.task_id}`} title="이 기록이 붙은 할 일">할 일 #{l.task_id} {l.task_title}</Chip>
          <Chip icon="target" href={`/plans/${l.plan_id}`}>계획 #{l.plan_id} {l.plan_title}</Chip>
        </div>
      )}
    </FlowCard>
  );
}

export function LogLink({ log }) {
  return <Link href={`/tasks/${log.task_id}#log-${log.id}`}>기록 #{log.id}</Link>;
}
