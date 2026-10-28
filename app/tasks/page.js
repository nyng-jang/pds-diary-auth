import Link from 'next/link';
import NoLoginNotice from '@/components/NoLoginNotice';
import PromptBox from '@/components/PromptBox';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import { createTaskAction } from '@/app/actions';
import { PRIORITIES } from '@/lib/plans';
import {
  DUE_FILTERS, SORTS, STATUSES, countTasks, listPlanOptions, listTags, listTasks, parseTaskQuery,
} from '@/lib/tasks';
import { todaySeoul } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTER_KEYS = ['q', 'plan', 'status', 'priority', 'tag', 'due', 'sort'];

export default async function TasksPage({ searchParams }) {
  const sp = await searchParams;
  const f = parseTaskQuery(sp);
  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const tasks = await listTasks(f);
  const total = await countTasks();
  const tags = await listTags();
  const plans = await listPlanOptions();
  const today = todaySeoul();

  // 지금 보고 있는 조건 (완료·되돌리기 후 이 화면으로 돌아오게)
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k] && !(k === 'sort' && f[k] === 'due')) params.set(k, String(f[k]));
  const back = `/tasks${params.size ? `?${params}` : ''}`;
  const filtered = FILTER_KEYS.some((k) => k !== 'sort' && f[k]);
  const sort = SORTS[f.sort];
  const planName = (id) => plans.find((p) => p.id === id)?.title;

  const active = [
    f.q && `검색 “${f.q}”`,
    f.plan && `계획 #${f.plan} ${planName(f.plan) ?? ''}`,
    f.status && `상태 ${f.status}`,
    f.priority && `우선순위 ${f.priority}`,
    f.tag && `태그 #${f.tag}`,
    f.due && DUE_FILTERS[f.due],
  ].filter(Boolean);

  const notice =
    (sp.created && `할 일 #${sp.created}을(를) 만들었어요.`) ||
    (sp.done && `할 일 #${sp.done}을(를) 완료로 바꿨어요.`) ||
    (sp.reopened && `할 일 #${sp.reopened}을(를) 다시 진행 중으로 되돌렸어요.`) ||
    (sp.deleted && `할 일 #${sp.deleted}을(를) 지웠어요.`);

  return (
    <>
      <NoLoginNotice />
      <section aria-labelledby="tasks-h">
        <div className="page-head">
          <h1 id="tasks-h">할 일</h1>
          <ol className="steps" aria-label="다이어리 흐름">
            <li data-kind="plan"><Link href="/">계획</Link></li>
            <li data-kind="todo">할 일</li>
            <li data-kind="see"><Link href="/review">돌아보기</Link></li>
          </ol>
        </div>
        {notice && <p className="ok" role="status">{String(notice)}</p>}

        <PromptBox title="할 일 찾기" icon="search" stateText={`전체 ${total}개 중 ${tasks.length}개`}>
          <form method="get" action="/tasks" className="pform" role="search">
            <label className="pform-main">
              <span>검색 <small>(할 일 이름·메모·태그)</small></span>
              <input type="search" name="q" defaultValue={f.q} maxLength={50} placeholder="예: 모의고사" />
            </label>
            <div className="pform-context">
              <label className="pill-field">
                <span>계획</span>
                <select name="plan" defaultValue={f.plan ?? ''}>
                  <option value="">전체</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
                </select>
              </label>
              <label className="pill-field">
                <span>상태</span>
                <select name="status" defaultValue={f.status}>
                  <option value="">전체</option>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="pill-field">
                <span>우선순위</span>
                <select name="priority" defaultValue={f.priority}>
                  <option value="">전체</option>
                  {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="pill-field">
                <span>태그</span>
                <select name="tag" defaultValue={f.tag}>
                  <option value="">전체</option>
                  {tags.map((t) => <option key={t.tag} value={t.tag}>#{t.tag} ({t.n})</option>)}
                </select>
              </label>
              <label className="pill-field">
                <span>마감</span>
                <select name="due" defaultValue={f.due}>
                  <option value="">전체</option>
                  {Object.entries(DUE_FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="pill-field">
                <span>정렬</span>
                <select name="sort" defaultValue={f.sort}>
                  {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </label>
            </div>
            <p className="sort-rule" id="sort-rule">
              <strong>정렬 기준 — {sort.name}:</strong> {sort.label}
              <br />
              <span className="muted">검색·거르기·정렬은 모두 서버의 데이터베이스에서 처리해요. 같은 조건이면 언제 열어도 같은 순서예요.</span>
            </p>
            <div className="pform-foot">
              <Link href="/tasks">조건 지우기</Link>
              <button type="submit" className="send">적용</button>
            </div>
          </form>
        </PromptBox>

        <p className="count">
          전체 {total}개 중 <strong>{tasks.length}개</strong> 보는 중
          {active.length > 0 && <> · 조건: {active.join(' · ')}</>}
        </p>

        {tasks.length === 0 && (
          <p className="muted">
            {filtered ? '조건에 맞는 할 일이 없어요. 조건을 바꾸거나 지워 보세요.' : '아직 할 일이 없어요. 아래에서 첫 할 일을 만들어 보세요.'}
          </p>
        )}
        <ol className="flow-grid" aria-label="할 일 목록">
          {tasks.map((t, i) => (
            <li key={t.id}><TaskCard task={t} today={today} rank={i + 1} back={back} /></li>
          ))}
        </ol>
      </section>

      <section id="new">
        {plans.length === 0 ? (
          <p className="muted">할 일은 계획에 딸려요. <Link href="/">먼저 계획을 세워 주세요.</Link></p>
        ) : (
          <TaskForm action={createTaskAction} plans={plans} defaultPlanId={f.plan ?? undefined} heading="새 할 일 만들기" submitLabel="할 일 저장" />
        )}
      </section>
    </>
  );
}
