import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteTaskButton from '@/components/DeleteTaskButton';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import { updateTaskAction } from '@/app/actions';
import { getTask, listPlanOptions } from '@/lib/tasks';
import { formatTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params, searchParams }) {
  const { id: rawId } = await params;
  const sp = await searchParams;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const task = await getTask(id);
  const plans = await listPlanOptions();
  if (!task) notFound();

  const notice =
    (sp.saved && '고친 내용을 저장했어요.') ||
    (sp.done && '완료로 바꿨어요.') ||
    (sp.reopened && '다시 진행 중으로 되돌렸어요.');

  return (
    <>
      <p><Link href="/tasks">← 할 일 목록</Link></p>
      {notice && <p className="ok" role="status">{notice}</p>}

      <TaskCard
        task={task}
        titleAs="h1"
        back={`/tasks/${task.id}`}
        full={{ created: formatTime(task.created_at), completed: task.completed_at && formatTime(task.completed_at) }}
      />

      <section id="edit">
        <TaskForm key={String(task.updated_at)} action={updateTaskAction} task={task} plans={plans} heading="할 일 고치기" submitLabel="고친 내용 저장" />
      </section>

      <section className="danger-zone">
        <h2>할 일 지우기</h2>
        <p className="muted">지운 할 일은 목록과 데이터베이스에서 사라지고 되돌릴 수 없어요.</p>
        <DeleteTaskButton id={task.id} title={task.title} />
      </section>
    </>
  );
}
