import { apiUser, asForm, badRequest, json, notFound, parseId, readJson, unauthorized } from '@/lib/api';
import { getPlan } from '@/lib/plans';
import { deleteTask, getTask, parseTaskForm, updateTask } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

// 세 방식 모두 "주인 확인 → (내 것일 때만) 바꾸기" 순서. 확인 전에는 아무것도 쓰지 않는다.
// 주인 확인은 SQL의 where id = :id and user_id = :로그인한 사람 이다 (lib/tasks.js getTask/updateTask/deleteTask).

// GET /api/tasks/:id
export async function GET(_request, { params }) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const id = parseId((await params).id);
  const task = id && (await getTask(uid, id));
  if (!task) return notFound('할 일');
  return json(200, { ok: true, task });
}

// PATCH /api/tasks/:id : 보낸 칸만 바꾼다
export async function PATCH(request, { params }) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const id = parseId((await params).id);
  const current = id && (await getTask(uid, id));
  if (!current) return notFound('할 일');
  const body = await readJson(request);
  if (!body) return badRequest('JSON 본문이 필요해요.');
  const merged = {
    plan_id: current.plan_id, title: current.title, note: current.note, due_date: current.due_date,
    priority: current.priority, tags: current.tags, estimated_minutes: current.estimated_minutes,
  };
  for (const k of Object.keys(merged)) if (k in body) merged[k] = body[k];
  const { task, error } = parseTaskForm(asForm(merged));
  if (error) return badRequest(error);
  if (!(await getPlan(uid, task.plan_id))) return json(404, { ok: false, error: '고른 계획을 찾을 수 없어요.' });
  // 위에서 확인했어도 updateTask의 SQL에 user_id 조건이 한 번 더 있다 (그 사이에 바뀌어도 남의 것은 못 고침)
  if (!(await updateTask(uid, id, task))) return notFound('할 일');
  return json(200, { ok: true, task: await getTask(uid, id) });
}

// DELETE /api/tasks/:id
export async function DELETE(_request, { params }) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const id = parseId((await params).id);
  if (!id || !(await deleteTask(uid, id))) return notFound('할 일');
  return json(200, { ok: true, deleted: id });
}
