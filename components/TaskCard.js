import FlowCard, { Chip, Meta } from './FlowCard';
import TaskStatusButton from './TaskStatusButton';
import { formatDue, formatMinutes } from '@/lib/format';

// 할 일 하나를 워크플로 카드로 보여 준다. 진행 중은 파란 탭, 완료는 초록 탭.
export default function TaskCard({ task: t, today, rank, back, titleAs, full = false }) {
  const done = t.status === '완료';
  const due = formatDue(t.due_date, t.status, today);
  const dueTone = { late: 'warn', soon: 'soon', muted: undefined, '': undefined }[due.tone];
  return (
    <FlowCard
      id={`task-${t.id}`}
      kind={done ? 'done' : 'todo'}
      tab={done ? '완료' : '할 일 · 진행 중'}
      icon={done ? 'check' : 'list'}
      title={t.title}
      titleAs={titleAs}
      href={full ? undefined : `/tasks/${t.id}`}
      className={done ? 'is-done' : ''}
      menu={[
        ...(full ? [] : [{ href: `/tasks/${t.id}`, label: '고치기 · 지우기' }]),
        { href: `/plans/${t.plan_id}`, label: `계획 #${t.plan_id} 보기` },
        { href: `/tasks?plan=${t.plan_id}`, label: '같은 계획의 할 일만' },
      ]}
      meta={<>
        {rank && <Meta>{rank}번째</Meta>}
        <Meta>#{t.id}</Meta>
        {due.tone === 'late' && <span className="meta meta-warn">마감 지남</span>}
      </>}
    >
      {t.note && <p className="quote"><span className="quote-label">메모</span>{t.note}</p>}
      <div className="chips">
        <Chip icon="target" href={`/tasks?plan=${t.plan_id}`} title="이 계획의 할 일만 보기">계획 #{t.plan_id} {t.plan_title}</Chip>
        <Chip icon={due.tone === 'late' ? 'alert' : 'calendar'} tone={dueTone}>{due.text}</Chip>
        <Chip icon="clock">{formatMinutes(t.estimated_minutes)}</Chip>
        <Chip icon="flag" tone={`pri-${t.priority}`}>우선순위 {t.priority}</Chip>
        {t.log_count > 0 && (
          <Chip icon="history" href={`/tasks/${t.id}#logs`} title="이 할 일의 실행 기록 보기">실행 기록 {t.log_count}건 · 실제 {formatMinutes(t.actual_minutes)}</Chip>
        )}
        {t.tags.map((tag) => (
          <Chip key={tag} icon="tag" href={`/tasks?tag=${encodeURIComponent(tag)}`} title="이 태그만 보기">{tag}</Chip>
        ))}
      </div>
      {full && (
        <dl className="facts">
          <dt>만든 때</dt><dd>{full.created}</dd>
          {full.completed && <><dt>완료한 때</dt><dd>{full.completed}</dd></>}
        </dl>
      )}
      <TaskStatusButton task={t} back={back} />
    </FlowCard>
  );
}
