'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPlan, insertPlan, parsePlanForm, samePlanContent, updatePlan } from '@/lib/plans';
import {
  STATUSES, completeTask, deleteTask, getTask, insertTask, parseTaskForm, reopenTask, updateTask,
} from '@/lib/tasks';
import { insertLog, parseLogForm } from '@/lib/logs';

export async function createPlanAction(_prev, formData) {
  const { plan, error } = parsePlanForm(formData, { requireNote: false });
  if (error) return { error };
  const id = await insertPlan(plan);
  revalidatePath('/');
  redirect(`/plans/${id}`);
}

export async function updatePlanAction(_prev, formData) {
  const id = Number(formData.get('id'));
  const expectedVersion = Number(formData.get('version'));
  if (!Number.isInteger(id) || !Number.isInteger(expectedVersion)) return { error: '잘못된 요청이에요.' };

  const { plan, error } = parsePlanForm(formData, { requireNote: true });
  if (error) return { error };

  const current = await getPlan(id);
  if (!current) return { error: '계획을 찾을 수 없어요.' };
  if (samePlanContent(current, plan)) return { error: '바뀐 내용이 없어요.' };

  const ok = await updatePlan(id, expectedVersion, plan);
  if (!ok) return { error: '그 사이에 계획이 바뀌었어요. 새로고침한 뒤 다시 고쳐 주세요.' };

  revalidatePath('/');
  revalidatePath(`/plans/${id}`);
  redirect(`/plans/${id}?saved=1`);
}

// ---- 할 일 (카드 2) ----

// 목록에서 누른 버튼은 보던 화면(검색·거르기·정렬 그대로)으로 돌아간다. /tasks 아래만 허용한다.
function backTo(formData, fallback) {
  const back = String(formData.get('back') ?? '');
  return /^(\/tasks(\/\d+)?(\?[^#\\]*)?|\/plans\/\d+)$/.test(back) ? back : fallback;
}

function withNotice(url, key, id) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${id}`;
}

export async function createTaskAction(_prev, formData) {
  const { task, error } = parseTaskForm(formData);
  if (error) return { error };
  if (!(await getPlan(task.plan_id))) return { error: '고른 계획을 찾을 수 없어요.' };
  const id = await insertTask(task);
  revalidatePath('/tasks');
  redirect(`/tasks?created=${id}#task-${id}`);
}

export async function updateTaskAction(_prev, formData) {
  const id = Number(formData.get('id'));
  if (!Number.isSafeInteger(id)) return { error: '잘못된 요청이에요.' };
  const { task, error } = parseTaskForm(formData);
  if (error) return { error };
  if (!(await getPlan(task.plan_id))) return { error: '고른 계획을 찾을 수 없어요.' };
  if (!(await updateTask(id, task))) return { error: '할 일을 찾을 수 없어요. 이미 지워졌을 수 있어요.' };
  revalidatePath('/tasks');
  redirect(`/tasks/${id}?saved=1`);
}

// 완료는 폼에 담긴 요청 키(request_key)로 한 번만 기록된다. 연달아 두 번 눌러 같은 키가 두 번 와도
// 두 번째는 데이터베이스가 받지 않고, 둘 다 같은 화면으로 돌아간다.
export async function setTaskStatusAction(formData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  const key = String(formData.get('request_key') ?? '');
  if (!Number.isSafeInteger(id) || !STATUSES.includes(status)) return;
  if (status === '완료') {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return;
    await completeTask(id, key);
  } else {
    await reopenTask(id);
  }
  revalidatePath('/tasks');
  revalidatePath('/review');
  const notice = status === '완료' ? 'done' : 'reopened';
  redirect(withNotice(backTo(formData, `/tasks/${id}`), notice, id));
}

export async function deleteTaskAction(formData) {
  const id = Number(formData.get('id'));
  if (!Number.isSafeInteger(id)) return;
  await deleteTask(id);
  revalidatePath('/tasks');
  redirect(`/tasks?deleted=${id}`);
}

// ---- 실제로 한 일 (카드 3) ----

export async function createLogAction(_prev, formData) {
  const { log, error } = parseLogForm(formData);
  if (error) return { error };
  if (!(await getTask(log.task_id))) return { error: '할 일을 찾을 수 없어요. 이미 지워졌을 수 있어요.' };
  // 같은 요청이 두 번 와서 이미 들어가 있으면 그대로 두고 같은 화면으로 간다
  await insertLog(log);
  revalidatePath('/tasks');
  revalidatePath('/review');
  redirect(`/tasks/${log.task_id}?logged=1#logs`);
}
