import Link from 'next/link';
import FlowCard, { Chip, Meta } from './FlowCard';
import { formatMinutes, formatSignedMinutes, formatTime } from '@/lib/format';

// 돌아보기에서 정한 고칠 점 한 줄과, 정할 때 본 근거 숫자. 숫자를 누르면 그 기간의 근거 기록으로 간다.
export function NoteCard({ note: n, titleAs = 'h3' }) {
  const s = n.snapshot;
  const qs = new URLSearchParams();
  if (n.period_from) qs.set('from', n.period_from);
  if (n.period_to) qs.set('to', n.period_to);
  if (n.basis_plan_id) qs.set('plan', n.basis_plan_id);
  const ev = (metric) => `/review/${metric}${qs.size ? `?${qs}` : ''}`;
  const period = n.period_from || n.period_to ? `${n.period_from ?? '처음'} ~ ${n.period_to ?? '끝'}` : '전체 기간';
  return (
    <FlowCard
      id={`note-${n.id}`}
      kind="see"
      tab={`돌아보기 · 고칠 점 #${n.id}`}
      icon="sparkle"
      title={n.lesson}
      titleAs={titleAs}
      meta={<>
        <Meta>고칠 점 #{n.id}</Meta>
        <Meta>정한 때 {formatTime(n.created_at)}</Meta>
        {n.carried_at && <Meta>넘긴 때 {formatTime(n.carried_at)}</Meta>}
      </>}
    >
      <p className="quote">
        <span className="quote-label">근거 · {period} · {n.basis_plan_id ? `계획 #${n.basis_plan_id} ${n.basis_plan_title}` : '모든 계획 합계'} (정할 때의 숫자)</span>
        <Link href={ev('planned')}>계획 {s.planned}</Link> · <Link href={ev('done')}>완료 {s.done}</Link> · <Link href={ev('overdue')}>지연 {s.overdue}</Link> · <Link href={ev('blocked')}>막힘 {s.blocked}</Link>
        {' · '}<Link href={ev('estimate')}>예상 {formatMinutes(s.estimate)}</Link> · <Link href={ev('actual')}>실제 {formatMinutes(s.actual)}</Link> · <Link href={ev('diff')}>차이 {formatSignedMinutes(s.diff)}</Link>
      </p>
      <div className="chips">
        {n.next_plan_id
          ? <Chip icon="target" href={`/plans/${n.next_plan_id}#note-${n.id}`} title="이 고칠 점을 넘긴 계획">다음 계획 → 계획 #{n.next_plan_id} {n.next_plan_title}</Chip>
          : <Chip icon="target" tone="soon" href={`/?carry=${n.id}#new-plan`}>아직 넘길 계획을 저장하지 않음 → 새 계획 세우기</Chip>}
      </div>
    </FlowCard>
  );
}

export default function CarriedNotes({ notes }) {
  return (
    <section id="carried" className="flow-chain" aria-labelledby="carried-h">
      <h2 id="carried-h">돌아보기에서 넘어온 고칠 점 <span className="muted">{notes.length}건</span></h2>
      <p className="muted">이 계획을 실행할 때 지난 돌아보기에서 정한 이 한 줄을 고쳐 보세요.</p>
      <ol className="flow-grid">
        {notes.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}
      </ol>
    </section>
  );
}
