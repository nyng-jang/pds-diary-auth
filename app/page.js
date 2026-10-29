import Link from 'next/link';
import FlowCard, { Chip, Meta } from '@/components/FlowCard';
import ImportForm from '@/components/ImportForm';
import PlanForm from '@/components/PlanForm';
import { createPlanAction, importExportAction } from './actions';
import { listPlans } from '@/lib/plans';
import { getNote } from '@/lib/review';
import { formatEstimate, formatPeriod } from '@/lib/format';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const { id: uid } = await requireUser();
  const { carry, imported } = await searchParams;
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const plans = await listPlans(uid);
  const carryId = Number(carry);
  const note = Number.isSafeInteger(carryId) && carryId > 0 ? await getNote(uid, carryId) : null;
  const carryNote = note && !note.next_plan_id ? note : null;
  return (
    <>
      {typeof imported === 'string' && /^\d+(-\d+){5}$/.test(imported) && (
        <p className="ok" role="status">
          과제 6 자료를 가져왔어요: {(() => {
            const [a, b, c, d, e, f] = imported.split('-');
            return `계획 ${a} · 수정 이력 ${b} · 할 일 ${c} · 실행 기록 ${d} · 완료 기록 ${e} · 고칠 점 ${f}`;
          })()}
        </p>
      )}
      <section aria-labelledby="plans-h">
        <div className="page-head">
          <h1 id="plans-h">내 계획</h1>
          <ol className="steps" aria-label="다이어리 흐름">
            <li data-kind="plan">계획</li>
            <li data-kind="todo"><Link href="/tasks">할 일</Link></li>
            <li data-kind="see"><Link href="/review">돌아보기</Link></li>
          </ol>
        </div>
        {plans.length === 0 && (
          <>
            <p className="muted">아직 계획이 없어요. 과제 6에서 쓰던 자료를 가져오거나, 아래에서 첫 계획을 세워 보세요.</p>
            <ImportForm action={importExportAction} />
          </>
        )}
        <div className="flow-grid">
          {plans.map((p) => (
            <FlowCard
              key={p.id}
              kind="plan"
              icon="target"
              title={p.title}
              href={`/plans/${p.id}`}
              menu={[
                { href: `/plans/${p.id}`, label: '자세히 · 수정 이력' },
                { href: `/tasks?plan=${p.id}`, label: '이 계획의 할 일' },
                { href: `/plans/${p.id}#edit`, label: '계획 고치기' },
              ]}
              meta={<>
                <Meta>#{p.id}</Meta>
                <Meta icon="folder">{p.area}</Meta>
                {p.version > 1 && <Meta icon="history">{p.version - 1}번 고침</Meta>}
              </>}
            >
              <p className="quote"><span className="quote-label">성공 기준</span>{p.success_criteria}</p>
              <div className="chips">
                <Chip icon="flag" tone={`pri-${p.priority}`}>우선순위 {p.priority}</Chip>
                <Chip icon="calendar">{formatPeriod(p)}</Chip>
                <Chip icon="clock">{formatEstimate(p)}</Chip>
              </div>
            </FlowCard>
          ))}
        </div>
      </section>
      <section id="new-plan">
        {note?.next_plan_id && (
          <p className="ok" role="status">고칠 점 #{note.id}은(는) 이미 <Link href={`/plans/${note.next_plan_id}#carried`}>계획 #{note.next_plan_id}</Link>로 넘어갔어요.</p>
        )}
        <PlanForm key={carryNote?.id ?? 0} action={createPlanAction} heading="새 계획 세우기" submitLabel="계획 저장" carryNote={carryNote} />
      </section>
      <section className="export" aria-labelledby="export-h">
        <h2 id="export-h">내 자료 내보내기</h2>
        <p className="muted">
          계획·수정 이력·할 일·실행 기록·완료 기록·고칠 점을 JSON 파일 하나로 내려받아요.
          시각은 한국 시간(+09:00), 시간은 분 단위예요. 항목 설명은 소스의 <code>contracts/pds-schema-v2.json</code>에 있어요.
        </p>
        <a className="export-link" href="/api/export" download>내 자료 전체 내려받기 (.json)</a>
      </section>
    </>
  );
}
