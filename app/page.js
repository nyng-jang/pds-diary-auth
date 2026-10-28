import Link from 'next/link';
import NoLoginNotice from '@/components/NoLoginNotice';
import PlanForm from '@/components/PlanForm';
import { createPlanAction } from './actions';
import { listPlans } from '@/lib/plans';
import { formatEstimate, formatPeriod } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const plans = await listPlans();
  return (
    <>
      <NoLoginNotice />
      <section>
        <h1>내 계획</h1>
        <p><Link href="/tasks">계획에 딸린 할 일 보기 →</Link></p>
        {plans.length === 0 && <p className="muted">아직 계획이 없어요. 아래에서 첫 계획을 세워 보세요.</p>}
        <ul className="plans">
          {plans.map((p) => (
            <li key={p.id}>
              <Link href={`/plans/${p.id}`} className="card">
                <div className="card-head">
                  <span className={`pri pri-${p.priority}`}>{p.priority}</span>
                  <span className="area">{p.area}</span>
                  <span className="id">#{p.id}</span>
                  {p.version > 1 && <span className="ver">{p.version - 1}번 고침</span>}
                </div>
                <h2>{p.title}</h2>
                <dl>
                  <dt>기간</dt><dd>{formatPeriod(p)}</dd>
                  <dt>성공 기준</dt><dd>{p.success_criteria}</dd>
                  <dt>예상 시간</dt><dd>{formatEstimate(p)}</dd>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>새 계획 세우기</h2>
        <PlanForm action={createPlanAction} submitLabel="계획 저장" />
      </section>
    </>
  );
}
