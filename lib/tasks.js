import 'server-only';
import { db, ensureSchema } from './db';
import { PRIORITIES } from './plans';

export const STATUSES = ['진행 중', '완료'];

// 정렬은 서버(SQL)에서만 한다. 값이 같을 때를 대비해 마지막에 항상 할 일 번호를 둬서
// 같은 조건이면 언제 열어도 같은 순서가 나온다. label은 화면에 그대로 보여 준다.
const PRI_RANK = `case t.priority when '높음' then 1 when '보통' then 2 else 3 end`;
export const SORTS = {
  due: {
    name: '마감일 빠른 순',
    label: '마감일이 빠른 순 → 같으면 우선순위 높은 순 → 그래도 같으면 할 일 번호(#)가 작은 순. 마감일이 없는 할 일은 맨 뒤.',
    order: `t.due_date asc nulls last, ${PRI_RANK} asc, t.id asc`,
  },
  priority: {
    name: '우선순위 높은 순',
    label: '우선순위가 높은 순(높음 → 보통 → 낮음) → 같으면 마감일이 빠른 순(없으면 뒤) → 그래도 같으면 할 일 번호(#)가 작은 순.',
    order: `${PRI_RANK} asc, t.due_date asc nulls last, t.id asc`,
  },
  estimate: {
    name: '예상 시간 긴 순',
    label: '예상 시간이 긴 순 → 같으면 마감일이 빠른 순(없으면 뒤) → 그래도 같으면 할 일 번호(#)가 작은 순.',
    order: `t.estimated_minutes desc, t.due_date asc nulls last, t.id asc`,
  },
  created: {
    name: '최근 만든 순',
    label: '나중에 만든 할 일이 위 → 같은 시각이면 할 일 번호(#)가 큰 순.',
    order: `t.created_at desc, t.id desc`,
  },
};
export const DEFAULT_SORT = 'due';

export const DUE_FILTERS = {
  overdue: '마감 지남 (진행 중)',
  today: '오늘 마감',
  week: '7일 안에 마감',
  none: '마감일 없음',
};

const TASK_COLUMNS = `
  t.id, t.plan_id, p.title as plan_title, t.title, t.note, t.due_date::text as due_date, t.priority,
  t.tags, t.estimated_minutes, t.status, t.completed_at, t.created_at, t.updated_at,
  (select count(*)::int from task_logs l where l.task_id = t.id) as log_count,
  (select coalesce(sum(l.actual_minutes), 0)::int from task_logs l where l.task_id = t.id) as actual_minutes`;

// 날짜는 한국 시간 기준 "오늘"로 판단한다
const TODAY = `(now() at time zone 'Asia/Seoul')::date`;

async function q() {
  await ensureSchema();
  return db();
}

// URL 값(문자열)을 검사해서, 알 수 없는 값은 버린 조건을 돌려준다.
export function parseTaskQuery(sp = {}) {
  const one = (k) => {
    const v = sp[k];
    return String(Array.isArray(v) ? v[0] : v ?? '').trim();
  };
  const plan = Number(one('plan'));
  return {
    q: one('q').slice(0, 50),
    plan: Number.isSafeInteger(plan) && plan > 0 ? plan : null,
    status: STATUSES.includes(one('status')) ? one('status') : '',
    priority: PRIORITIES.includes(one('priority')) ? one('priority') : '',
    tag: one('tag').slice(0, 20),
    due: one('due') in DUE_FILTERS ? one('due') : '',
    sort: one('sort') in SORTS ? one('sort') : DEFAULT_SORT,
  };
}

export async function listTasks(f) {
  const sql = await q();
  const like = `%${f.q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const dueCond = {
    overdue: sql`and t.status = '진행 중' and t.due_date < ${sql.unsafe(TODAY)}`,
    today: sql`and t.due_date = ${sql.unsafe(TODAY)}`,
    week: sql`and t.due_date between ${sql.unsafe(TODAY)} and ${sql.unsafe(TODAY)} + 6`,
    none: sql`and t.due_date is null`,
  }[f.due];
  return sql`
    select ${sql.unsafe(TASK_COLUMNS)}
    from tasks t join plans p on p.id = t.plan_id
    where true
      ${f.q ? sql`and (t.title ilike ${like} or t.note ilike ${like}
                      or exists (select 1 from unnest(t.tags) tg where tg ilike ${like}))` : sql``}
      ${f.plan ? sql`and t.plan_id = ${f.plan}` : sql``}
      ${f.status ? sql`and t.status = ${f.status}` : sql``}
      ${f.priority ? sql`and t.priority = ${f.priority}` : sql``}
      ${f.tag ? sql`and ${f.tag} = any(t.tags)` : sql``}
      ${dueCond ?? sql``}
    order by ${sql.unsafe(SORTS[f.sort].order)}`;
}

export async function countTasks() {
  const sql = await q();
  const [row] = await sql`select count(*)::int as n from tasks`;
  return row.n;
}

export async function listTags() {
  const sql = await q();
  const rows = await sql`
    select tg as tag, count(*)::int as n from tasks, unnest(tags) tg
    group by tg order by tg`;
  return rows;
}

export async function listPlanOptions() {
  const sql = await q();
  return sql`select id, title from plans order by id`;
}

export async function getTask(id) {
  const sql = await q();
  const [task] = await sql`
    select ${sql.unsafe(TASK_COLUMNS)} from tasks t join plans p on p.id = t.plan_id where t.id = ${id}`;
  return task ?? null;
}

export async function insertTask(t) {
  const sql = await q();
  const [row] = await sql`
    insert into tasks (plan_id, title, note, due_date, priority, tags, estimated_minutes)
    values (${t.plan_id}, ${t.title}, ${t.note}, ${t.due_date}, ${t.priority}, ${t.tags}, ${t.estimated_minutes})
    returning id`;
  return row.id;
}

export async function updateTask(id, t) {
  const sql = await q();
  const rows = await sql`
    update tasks set plan_id = ${t.plan_id}, title = ${t.title}, note = ${t.note}, due_date = ${t.due_date},
      priority = ${t.priority}, tags = ${t.tags}, estimated_minutes = ${t.estimated_minutes}
    where id = ${id} returning id`;
  return rows.length === 1;
}

// 완료: 완료 기록을 넣고, 실제로 들어갔을 때만 할 일을 '완료'로 바꾼다 (한 문장이라 둘이 함께 된다).
// 같은 요청 키로 다시 오거나(연달아 두 번 누름) 이미 완료된 할 일이면 on conflict do nothing으로
// 아무것도 넣지 않는다. 자세한 규칙은 db/003_logs.sql.
export async function completeTask(id, requestKey) {
  const sql = await q();
  const rows = await sql`
    with ins as (
      insert into task_completions (task_id, request_key)
      select id, ${requestKey} from tasks where id = ${id} and status = '진행 중'
      on conflict do nothing
      returning task_id, completed_at
    )
    update tasks set status = '완료', completed_at = ins.completed_at
    from ins where tasks.id = ins.task_id
    returning tasks.id`;
  return rows.length === 1;
}

// 진행 중으로 되돌리기: 열린 완료 기록에 되돌린 시각을 적고 할 일을 '진행 중'으로. 이미 진행 중이면 그대로.
export async function reopenTask(id) {
  const sql = await q();
  const rows = await sql`
    with r as (
      update task_completions set reopened_at = now()
      where task_id = ${id} and reopened_at is null
      returning task_id
    )
    update tasks set status = '진행 중', completed_at = null
    from r where tasks.id = r.task_id
    returning tasks.id`;
  return rows.length === 1;
}

export async function deleteTask(id) {
  const sql = await q();
  const rows = await sql`delete from tasks where id = ${id} returning id`;
  return rows.length === 1;
}

// "#이론, 1과목 ,이론" → ['이론', '1과목']
export function parseTags(raw) {
  const tags = [];
  for (const part of String(raw ?? '').split(/[,，]/)) {
    const tag = part.trim().replace(/^#+/, '').trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

// 폼 값을 검사해 { task } 또는 { error } 를 돌려준다.
export function parseTaskForm(formData) {
  const s = (k) => String(formData.get(k) ?? '').trim();
  const task = {
    plan_id: Number(s('plan_id')),
    title: s('title'),
    note: s('note'),
    due_date: s('due_date') || null,
    priority: s('priority'),
    tags: parseTags(s('tags')),
    estimated_minutes: Number(s('estimated_minutes')),
  };
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

  if (!Number.isSafeInteger(task.plan_id) || task.plan_id <= 0) return { error: '어느 계획의 할 일인지 골라 주세요.' };
  if (!task.title) return { error: '할 일 이름을 적어 주세요.' };
  if (task.title.length > 100) return { error: '할 일 이름은 100자까지 적을 수 있어요.' };
  if (task.note.length > 500) return { error: '메모는 500자까지 적을 수 있어요.' };
  if (task.due_date && !isDate(task.due_date)) return { error: '마감일이 올바르지 않아요.' };
  if (!PRIORITIES.includes(task.priority)) return { error: '우선순위를 골라 주세요.' };
  if (task.tags.length > 10) return { error: '태그는 10개까지 달 수 있어요.' };
  if (task.tags.some((t) => t.length > 20)) return { error: '태그 하나는 20자까지 적을 수 있어요.' };
  if (!Number.isInteger(task.estimated_minutes) || task.estimated_minutes <= 0 || task.estimated_minutes > 10000)
    return { error: '예상 시간은 1~10000 사이의 분 단위 숫자로 적어 주세요.' };
  return { task };
}
