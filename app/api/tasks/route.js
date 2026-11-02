import { apiUser, asForm, badRequest, json, readJson, unauthorized } from '@/lib/api';
import { getPlan } from '@/lib/plans';
import { insertTask, listTasks, parseTaskForm, parseTaskQuery } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

// GET /api/tasks : 내 할 일 목록 (화면 /tasks 와 같은 listTasks(), where t.user_id = 로그인한 사람)
// ?q= ?plan= ?status= 같은 거르기는 화면과 같고, ?user_id= 는 parseTaskQuery가 아예 읽지 않는다.
export async function GET(request) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const tasks = await listTasks(uid, parseTaskQuery(sp));
  return json(200, { ok: true, count: tasks.length, tasks });
}

// POST /api/tasks : 할 일 하나 만들기. 고른 계획도 내 것이어야 한다.
export async function POST(request) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const body = await readJson(request);
  if (!body) return badRequest('JSON 본문이 필요해요.');
  const { task, error } = parseTaskForm(asForm(body));
  if (error) return badRequest(error);
  if (!(await getPlan(uid, task.plan_id))) return json(404, { ok: false, error: '고른 계획을 찾을 수 없어요.' });
  const id = await insertTask(uid, task);
  return json(201, { ok: true, id, user_id: uid });
}
