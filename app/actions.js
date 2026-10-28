'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPlan, insertPlan, parsePlanForm, samePlanContent, updatePlan } from '@/lib/plans';
import {
  STATUSES, completeTask, deleteTask, getTask, insertTask, parseTaskForm, reopenTask, updateTask,
} from '@/lib/tasks';
import { insertLog, parseLogForm } from '@/lib/logs';
import { carryNoteToPlan, getNote, getReviewByPlan, insertNote, parseNoteForm, sumRows } from '@/lib/review';

export async function createPlanAction(_prev, formData) {
  const { plan, error } = parsePlanForm(formData, { requireNote: false });
  if (error) return { error };
  // 돌아보기에서 "새 계획으로" 넘긴 고칠 점이 있으면 이 계획에 붙인다
  const noteId = Number(formData.get('carry_note_id'));
  const note = Number.isSafeInteger(noteId) && noteId > 0 ? await getNote(noteId) : null;
  const id = await insertPlan(plan);
  const carried = note && !note.next_plan_id && (await carryNoteToPlan(note.id, id));
  revalidatePath('/');
  revalidatePath('/review');
  redirect(carried ? `/plans/${id}?carried=${note.id}#carried` : `/plans/${id}`);
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// 할 일 목록에서 바로: 실행 기록을 남기고(진행 중이었다면) 완료로 바꾼다.
// mode=done_only 이면 기록 없이 완료만. 기록 키와 완료 키가 따로 있어 연달아 눌러도 각각 한 번만 들어간다.
export async function logFromListAction(_prev, formData) {
  const id = Number(formData.get('task_id'));
  const doneKey = String(formData.get('done_key') ?? '');
  const onlyDone = formData.get('mode') === 'done_only';
  if (!Number.isSafeInteger(id) || id <= 0) return { error: '잘못된 요청이에요. 새로고침한 뒤 다시 해 주세요.' };
  if (doneKey && !UUID_RE.test(doneKey)) return { error: '잘못된 요청이에요. 새로고침한 뒤 다시 해 주세요.' };
  if (onlyDone && !doneKey) return { error: '이미 완료된 할 일이에요.' };
  let log = null;
  if (!onlyDone) {
    const parsed = parseLogForm(formData);
    if (parsed.error) return { error: parsed.error };
    log = parsed.log;
  }
  if (!(await getTask(id))) return { error: '할 일을 찾을 수 없어요. 이미 지워졌을 수 있어요.' };
  if (log) await insertLog(log);
  if (doneKey) await completeTask(id, doneKey);
  revalidatePath('/tasks');
  revalidatePath('/review');
  const notice = log && doneKey ? 'logged_done' : log ? 'logged' : 'done';
  redirect(withNotice(backTo(formData, '/tasks'), notice, id) + `#task-${id}`);
}

// ---- 돌아보기 → 다음 계획 (카드 4) ----

// 고칠 점 한 줄을 저장하고 고른 계획으로 넘긴다. 근거 숫자(snapshot)는 화면 값이 아니라 서버에서 다시 센다.
export async function createNoteAction(_prev, formData) {
  const { note, error } = parseNoteForm(formData);
  if (error) return { error };
  if (note.basis_plan_id && !(await getPlan(note.basis_plan_id))) return { error: '근거로 본 계획을 찾을 수 없어요.' };
  if (note.next_plan_id && !(await getPlan(note.next_plan_id))) return { error: '넘길 계획을 찾을 수 없어요.' };

  const rows = await getReviewByPlan({ from: note.from, to: note.to });
  const basis = note.basis_plan_id ? rows.find((r) => Number(r.plan_id) === note.basis_plan_id) : sumRows(rows);
  const { plan_id: _p, plan_title: _t, ...numbers } = basis;
  const saved = await insertNote({ ...note, snapshot: { ...numbers, period_from: note.from, period_to: note.to } });

  revalidatePath('/review');
  if (saved.next_plan_id) {
    revalidatePath(`/plans/${saved.next_plan_id}`);
    redirect(`/plans/${saved.next_plan_id}?carried=${saved.id}#carried`);
  }
  redirect(`/?carry=${saved.id}#new-plan`);
}
