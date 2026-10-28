import Link from 'next/link';
import { notFound } from 'next/navigation';
import PlanForm from '@/components/PlanForm';
import { updatePlanAction } from '@/app/actions';
import { COMPARED_FIELDS, getPlan, listRevisions } from '@/lib/plans';
import { FIELD_LABELS, formatEstimate, formatField, formatPeriod, formatTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PlanPage({ params, searchParams }) {
  const { id: rawId } = await params;
  const { saved } = await searchParams;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [plan, revisions] = await Promise.all([getPlan(id), listRevisions(id)]);
  if (!plan) notFound();

  return (
    <>
      <p><Link href="/">← 내 계획</Link></p>
      {saved && <p className="ok" role="status">고친 내용을 저장했어요. 고치기 전 내용은 아래 이력에 남아 있어요.</p>}

      <section className="card current">
        <div className="card-head">
          <span className={`pri pri-${plan.priority}`}>{plan.priority}</span>
          <span className="area">{plan.area}</span>
          <span className="id">계획 #{plan.id}</span>
          <span className="ver">지금 버전 v{plan.version}</span>
        </div>
        <h1>{plan.title}</h1>
        <dl>
          <dt>기간</dt><dd>{formatPeriod(plan)}</dd>
          <dt>우선순위</dt><dd>{plan.priority}</dd>
          <dt>성공 기준</dt><dd>{plan.success_criteria}</dd>
          <dt>예상 시간</dt><dd>{formatEstimate(plan)}</dd>
          <dt>처음 세운 때</dt><dd>{formatTime(plan.created_at)}</dd>
        </dl>
      </section>

      <p><Link href={`/tasks?plan=${plan.id}`}>이 계획의 할 일 보기 →</Link></p>

      <section>
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

      <section>
        <h2>계획 고치기</h2>
        <p className="muted">고쳐도 계획 번호(#{plan.id})는 그대로이고, 지금 내용은 이력에 v{plan.version}로 남아요.</p>
        <PlanForm key={plan.version} action={updatePlanAction} plan={plan} submitLabel="고친 계획 저장" />
      </section>
    </>
  );
}
