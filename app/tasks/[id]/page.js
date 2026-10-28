import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteTaskButton from '@/components/DeleteTaskButton';
import TaskForm from '@/components/TaskForm';
import TaskStatusButton from '@/components/TaskStatusButton';
import { updateTaskAction } from '@/app/actions';
import { getTask, listPlanOptions } from '@/lib/tasks';
import { formatDue, formatMinutes, formatTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params, searchParams }) {
  const { id: rawId } = await params;
  const sp = await searchParams;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [task, plans] = await Promise.all([getTask(id), listPlanOptions()]);
  if (!task) notFound();
  const due = formatDue(task.due_date, task.status);

  const notice =
    (sp.saved && '고친 내용을 저장했어요.') ||
    (sp.done && '완료로 바꿨어요.') ||
    (sp.reopened && '다시 진행 중으로 되돌렸어요.');

  return (
    <>
      <p><Link href="/tasks">← 할 일 목록</Link></p>
      {notice && <p className="ok" role="status">{notice}</p>}

      <section className={`card current ${task.status === '완료' ? 'is-done' : ''}`}>
        <div className="card-head">
          <span className={`status st-${task.status === '완료' ? 'done' : 'open'}`}>{task.status}</span>
          <span className={`pri pri-${task.priority}`}>{task.priority}</span>
          <span className="id">할 일 #{task.id}</span>
          <Link className="area" href={`/plans/${task.plan_id}`}>계획 #{task.plan_id} {task.plan_title}</Link>
        </div>
        <h1>{task.title}</h1>
        <dl>
          <dt>마감일</dt><dd className={`due-${due.tone}`}>{due.text}</dd>
          <dt>우선순위</dt><dd>{task.priority}</dd>
          <dt>태그</dt><dd>{task.tags.length ? task.tags.map((t) => <span key={t} className="tag">#{t}</span>) : '(없음)'}</dd>
          <dt>예상 시간</dt><dd>{formatMinutes(task.estimated_minutes)}</dd>
          {task.note && <><dt>메모</dt><dd>{task.note}</dd></>}
          <dt>만든 때</dt><dd>{formatTime(task.created_at)}</dd>
          {task.completed_at && <><dt>완료한 때</dt><dd>{formatTime(task.completed_at)}</dd></>}
        </dl>
        <div className="task-actions">
          <TaskStatusButton task={task} back={`/tasks/${task.id}`} />
        </div>
      </section>

      <section>
        <h2>할 일 고치기</h2>
        <TaskForm key={String(task.updated_at)} action={updateTaskAction} task={task} plans={plans} submitLabel="고친 내용 저장" />
      </section>

      <section>
        <h2>할 일 지우기</h2>
        <p className="muted">지운 할 일은 목록과 데이터베이스에서 사라지고 되돌릴 수 없어요.</p>
        <DeleteTaskButton id={task.id} title={task.title} />
      </section>
    </>
  );
}
