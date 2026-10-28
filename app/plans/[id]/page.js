import Link from 'next/link';
import { notFound } from 'next/navigation';
import FlowCard, { Chip, Meta } from '@/components/FlowCard';
import PlanForm from '@/components/PlanForm';
import TaskCard from '@/components/TaskCard';
import { updatePlanAction } from '@/app/actions';
import { COMPARED_FIELDS, getPlan, listRevisions } from '@/lib/plans';
import { listTasks, parseTaskQuery } from '@/lib/tasks';
import { FIELD_LABELS, formatEstimate, formatField, formatPeriod, formatTime, todaySeoul } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PlanPage({ params, searchParams }) {
  const { id: rawId } = await params;
  const { saved, done, reopened } = await searchParams;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const plan = await getPlan(id);
  const revisions = await listRevisions(id);
  if (!plan) notFound();
  const tasks = await listTasks(parseTaskQuery({ plan: String(id) }));
  const today = todaySeoul();

  return (
    <>
      <p><Link href="/">← 내 계획</Link></p>
      {saved && <p className="ok" role="status">고친 내용을 저장했어요. 고치기 전 내용은 아래 이력에 남아 있어요.</p>}
      {done && <p className="ok" role="status">할 일 #{String(done)}을(를) 완료로 바꿨어요.</p>}
      {reopened && <p className="ok" role="status">할 일 #{String(reopened)}을(를) 다시 진행 중으로 되돌렸어요.</p>}

      <FlowCard
        kind="plan"
        tab={`계획 · v${plan.version}`}
        icon="target"
        title={plan.title}
        titleAs="h1"
        menu={[
          { href: `/tasks?plan=${plan.id}`, label: '할 일 목록에서 보기' },
          { href: '#history', label: '수정 이력' },
          { href: '#edit', label: '계획 고치기' },
        ]}
        meta={<>
          <Meta>계획 #{plan.id}</Meta>
          <Meta icon="folder">{plan.area}</Meta>
          <Meta icon="history">처음 세운 때 {formatTime(plan.created_at)}</Meta>
        </>}
      >
        <p className="quote"><span className="quote-label">성공 기준</span>{plan.success_criteria}</p>
        <div className="chips">
          <Chip icon="flag" tone={`pri-${plan.priority}`}>우선순위 {plan.priority}</Chip>
          <Chip icon="calendar">{formatPeriod(plan)}</Chip>
          <Chip icon="clock">{formatEstimate(plan)}</Chip>
        </div>
      </FlowCard>

      <section className="flow-chain" aria-labelledby="plan-tasks-h">
        <h2 id="plan-tasks-h">이 계획의 할 일 <span className="muted">{tasks.length}개</span></h2>
        {tasks.length === 0 ? (
          <p className="muted">아직 할 일이 없어요. <Link href={`/tasks?plan=${plan.id}#new`}>할 일 만들러 가기 →</Link></p>
        ) : (
          <ol className="flow-grid">
            {tasks.map((t) => (
              <li key={t.id}><TaskCard task={t} today={today} titleAs="h3" back={`/plans/${plan.id}`} /></li>
            ))}
          </ol>
        )}
      </section>

      <section id="history">
        <h2>수정 이력</h2>
        <p className="muted">계획을 고칠 때마다 그때의 내용이 한 줄씩 쌓여요. v1이 처음 세운 계획이에요.</p>
        <ol className="history">
          {revisions.map((r, i) => {
            const prev = revisions[i + 1];
            const changed = prev ? COMPARED_FIELDS.filter((k) => (r[k] ?? null) !== (prev[k] ?? null)) : [];
            return (
              <li key={r.id} id={`v${r.version}`}>
                <div className="hist-head">
                  <strong>v{r.version}</strong>
                  {r.version === 1 && <span className="tag">처음 계획</span>}
                  {r.version === plan.version && <span className="tag now">지금</span>}
                  <span className="muted">{formatTime(r.saved_at)}</span>
                </div>
                {r.change_note && <p className="note">“{r.change_note}”</p>}
                {prev ? (
                  <ul className="diff">
                    {changed.map((k) => (
                      <li key={k}>
                        {FIELD_LABELS[k]}: <del>{formatField(k, prev[k])}</del> → <ins>{formatField(k, r[k])}</ins>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <dl className="compact">
                    <dt>기간</dt><dd>{formatPeriod(r)}</dd>
                    <dt>우선순위</dt><dd>{r.priority}</dd>
                    <dt>성공 기준</dt><dd>{r.success_criteria}</dd>
                    <dt>예상 시간</dt><dd>{formatEstimate(r)}</dd>
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section id="edit">
        <p className="muted">고쳐도 계획 번호(#{plan.id})는 그대로이고, 지금 내용은 이력에 v{plan.version}로 남아요.</p>
        <PlanForm key={plan.version} action={updatePlanAction} plan={plan} heading="계획 고치기" submitLabel="고친 계획 저장" />
      </section>
    </>
  );
}
