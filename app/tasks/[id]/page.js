import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteTaskButton from '@/components/DeleteTaskButton';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import LogCard from '@/components/LogCard';
import LogForm from '@/components/LogForm';
import { Chip } from '@/components/FlowCard';
import { updateTaskAction } from '@/app/actions';
import { getTask, listPlanOptions } from '@/lib/tasks';
import { listLogsForTask } from '@/lib/logs';
import { formatGap, formatMinutes, formatTime } from '@/lib/format';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params, searchParams }) {
  const { id: uid } = await requireUser();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  // 질의는 하나씩 보낸다 (lib/db.js의 connect 설명 참고)
  const task = await getTask(uid, id);
  if (!task) notFound();
  const logs = await listLogsForTask(uid, id);
  const plans = await listPlanOptions(uid);
  const gap = formatGap(task.actual_minutes, task.estimated_minutes);

  const notice =
    (sp.saved && '고친 내용을 저장했어요.') ||
    (sp.done && '완료로 바꿨어요.') ||
    (sp.reopened && '다시 진행 중으로 되돌렸어요.') ||
    (sp.logged && '실행 기록을 저장했어요. 할 일의 원래 계획 값은 그대로예요.');

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

      <section id="logs" className="flow-chain" aria-labelledby="logs-h">
        <h2 id="logs-h">실제로 한 일 <span className="muted">{logs.length}건</span></h2>
        <div className="plan-vs-do">
          <p><span className="quote-label">계획 (실행 기록을 남겨도 바뀌지 않음)</span>예상 {formatMinutes(task.estimated_minutes)}{task.due_date && ` · ${task.due_date} 마감`}</p>
          <p><span className="quote-label">실제 (실행 기록 {logs.length}건의 합)</span>{logs.length ? formatMinutes(task.actual_minutes) : '아직 기록 없음'}</p>
          {logs.length > 0 && <Chip icon="clock" tone={gap.tone}>{gap.text}</Chip>}
        </div>
        {logs.length > 0 && (
          <ol className="flow-grid log-grid" aria-label="이 할 일의 실행 기록">
            {logs.map((l) => <li key={l.id}><LogCard log={l} /></li>)}
          </ol>
        )}
        <LogForm key={logs.length} taskId={task.id} requestKey={crypto.randomUUID()} estimated={task.estimated_minutes} />
      </section>

      <section id="edit">
        <TaskForm key={String(task.updated_at)} action={updateTaskAction} task={task} plans={plans} heading="할 일 고치기" submitLabel="고친 내용 저장" />
      </section>

      <section className="danger-zone">
        <h2>할 일 지우기</h2>
        <p className="muted">지운 할 일은 목록과 데이터베이스에서 사라지고 되돌릴 수 없어요. 이 할 일에 붙은 실행 기록과 완료 기록도 함께 지워져요.</p>
        <DeleteTaskButton id={task.id} title={task.title} />
      </section>
    </>
  );
}
