import 'server-only';
import { db, ensureSchema } from './db';
import { todaySeoul } from './format';

// 돌아보기(See) 집계. 숫자 하나하나가 어떤 할 일·실행 기록에서 나왔는지 같은 조건으로 다시 꺼낼 수 있게
// 조건을 한곳(METRICS)에 두고, 집계 표와 근거 기록 화면이 둘 다 이 조건을 쓴다.
//
// 대상 할 일 : 지금 tasks 표에 있는 할 일 (지운 할 일은 표에서 사라지므로 세지 않는다)
//              기간을 고르면 "기준 날짜"가 그 기간 안인 할 일만. 기준 날짜 = 마감일, 마감일이 없으면 만든 날(서울).
// 시간 단위  : 모두 분. 예상 = 할 일의 예상 시간 합, 실제 = 그 할 일들의 실행 기록 합, 차이 = 실제 − 예상.

const TODAY = `(now() at time zone 'Asia/Seoul')::date`;
const BASIS_DATE = `coalesce(t.due_date, (t.created_at at time zone 'Asia/Seoul')::date)`;
const ACTUAL = `(select coalesce(sum(l.actual_minutes), 0)::int from task_logs l where l.task_id = t.id)`;
const BLOCKED = `exists (select 1 from task_logs l where l.task_id = t.id and l.blocker <> '')`;

export const METRICS = {
  planned: {
    name: '계획 수',
    rule: '그 계획에 딸린, 지우지 않은 할 일의 수',
    where: 'true',
  },
  done: {
    name: '완료 수',
    rule: '그중 지금 완료 상태인 할 일의 수',
    where: `t.status = '완료'`,
  },
  overdue: {
    name: '지연 수',
    rule: '완료되지 않았고, 마감일이 서울 시간 기준 오늘보다 앞선 할 일의 수 (완료한 할 일은 세지 않음)',
    where: `t.status <> '완료' and t.due_date < ${TODAY}`,
  },
  blocked: {
    name: '막힘 수',
    rule: '실행 기록에 막힌 이유가 하나라도 적힌 할 일의 수',
    where: BLOCKED,
  },
  estimate: {
    name: '예상 시간',
    rule: '대상 할 일의 예상 시간 합계',
    where: 'true',
    minutes: true,
  },
  actual: {
    name: '실제 시간',
    rule: '대상 할 일에 붙은 실행 기록의 실제로 걸린 시간 합계',
    where: 'true',
    minutes: true,
  },
  diff: {
    name: '차이',
    rule: '실제 시간 − 예상 시간 (같은 분 단위). +면 예상보다 오래, −면 예상보다 짧게 걸림',
    where: 'true',
    minutes: true,
  },
};

async function q() {
  await ensureSchema();
  return db();
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v) => DATE.test(v) && !Number.isNaN(Date.parse(v));

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 기간 바로 고르기. 주는 월요일부터 일요일까지 (서울 기준).
export function periodPresets(today = todaySeoul()) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 월=0
  const monday = addDays(today, -dow);
  const month = today.slice(0, 7);
  const nextMonth = addDays(`${month}-28`, 4).slice(0, 7);
  return [
    { key: 'all', label: '전체', from: null, to: null },
    { key: 'today', label: '오늘', from: today, to: today },
    { key: 'week', label: '이번 주', from: monday, to: addDays(monday, 6) },
    { key: 'last-week', label: '지난주', from: addDays(monday, -7), to: addDays(monday, -1) },
    { key: 'month', label: '이번 달', from: `${month}-01`, to: addDays(`${nextMonth}-01`, -1) },
  ];
}

// URL 값을 검사해 { from, to, plan, error } 로. 알 수 없는 값은 버린다.
export function parseReviewQuery(sp = {}) {
  const one = (k) => {
    const v = sp[k];
    return String(Array.isArray(v) ? v[0] : v ?? '').trim();
  };
  let from = isDate(one('from')) ? one('from') : null;
  let to = isDate(one('to')) ? one('to') : null;
  let error = null;
  if (from && to && from > to) {
    [from, to] = [to, from];
    error = '기간 시작이 끝보다 늦어서 둘을 바꿔서 봤어요.';
  }
  const plan = Number(one('plan'));
  return { from, to, plan: Number.isSafeInteger(plan) && plan > 0 ? plan : null, error };
}

export function reviewQueryString(f, extra = {}) {
  const p = new URLSearchParams();
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  for (const [k, v] of Object.entries(extra)) if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function formatPeriodRange(f) {
  if (!f.from && !f.to) return '전체 기간';
  return `${f.from ?? '처음'} ~ ${f.to ?? '끝'}`;
}

function periodCond(sql, f) {
  return sql`
    ${f.from ? sql`and ${sql.unsafe(BASIS_DATE)} >= ${f.from}::date` : sql``}
    ${f.to ? sql`and ${sql.unsafe(BASIS_DATE)} <= ${f.to}::date` : sql``}`;
}

// 계획마다 한 줄. 할 일이 없는 계획도 0으로 나온다.
export async function getReviewByPlan(f) {
  const sql = await q();
  const rows = await sql`
    with t as (
      select t.id, t.plan_id, t.status, t.estimated_minutes,
             ${sql.unsafe(ACTUAL)} as actual,
             (${sql.unsafe(METRICS.overdue.where)}) as is_overdue,
             (${sql.unsafe(BLOCKED)}) as is_blocked
      from tasks t
      where true ${periodCond(sql, f)}
    )
    select p.id as plan_id, p.title as plan_title, p.area as plan_area,
           count(t.id)::int as planned,
           (count(t.id) filter (where t.status = '완료'))::int as done,
           (count(t.id) filter (where t.is_overdue))::int as overdue,
           (count(t.id) filter (where t.is_blocked))::int as blocked,
           coalesce(sum(t.estimated_minutes), 0)::int as estimate,
           coalesce(sum(t.actual), 0)::int as actual
    from plans p left join t on t.plan_id = p.id
    group by p.id, p.title, p.area
    order by p.id`;
  return rows.map((r) => ({ ...r, diff: r.actual - r.estimate }));
}

export function sumRows(rows) {
  const total = { planned: 0, done: 0, overdue: 0, blocked: 0, estimate: 0, actual: 0 };
  for (const r of rows) for (const k of Object.keys(total)) total[k] += r[k];
  return { ...total, diff: total.actual - total.estimate };
}

// 근거 기록: 숫자 하나를 만든 할 일 목록. 실행 기록(막힌 이유 포함)도 함께 붙인다.
export async function listEvidenceTasks(metric, f) {
  const m = METRICS[metric];
  const sql = await q();
  const tasks = await sql`
    select t.id, t.plan_id, p.title as plan_title, t.title, t.status, t.due_date::text as due_date,
           ${sql.unsafe(BASIS_DATE)}::text as basis_date, t.estimated_minutes,
           ${sql.unsafe(ACTUAL)} as actual_minutes,
           (select count(*)::int from task_logs l where l.task_id = t.id) as log_count,
           (select c.id from task_completions c where c.task_id = t.id and c.reopened_at is null) as completion_id,
           ${sql.unsafe(TODAY)}::text as today
    from tasks t join plans p on p.id = t.plan_id
    where (${sql.unsafe(m.where)})
      ${f.plan ? sql`and t.plan_id = ${f.plan}` : sql``}
      ${periodCond(sql, f)}
    order by t.plan_id, t.id`;
  const ids = tasks.map((t) => t.id);
  const logs = ids.length === 0 ? [] : await sql`
    select l.id, l.task_id, l.started_at, l.ended_at, l.actual_minutes, l.blocker
    from task_logs l where l.task_id in ${sql(ids)}
    order by l.task_id, l.started_at, l.id`;
  return tasks.map((t) => ({ ...t, logs: logs.filter((l) => l.task_id === t.id) }));
}

// ---- 고칠 점 한 줄 → 다음 계획 ----

const NOTE_COLUMNS = `
  n.id, n.period_from::text as period_from, n.period_to::text as period_to, n.basis_plan_id,
  bp.title as basis_plan_title, n.lesson, n.snapshot, n.next_plan_id, np.title as next_plan_title,
  n.carried_at, n.created_at`;

export async function listNotes() {
  const sql = await q();
  return sql`
    select ${sql.unsafe(NOTE_COLUMNS)}
    from review_notes n left join plans bp on bp.id = n.basis_plan_id left join plans np on np.id = n.next_plan_id
    order by n.created_at desc, n.id desc`;
}

export async function listNotesForPlan(planId) {
  const sql = await q();
  return sql`
    select ${sql.unsafe(NOTE_COLUMNS)}
    from review_notes n left join plans bp on bp.id = n.basis_plan_id left join plans np on np.id = n.next_plan_id
    where n.next_plan_id = ${planId}
    order by n.created_at desc, n.id desc`;
}

export async function getNote(id) {
  const sql = await q();
  const [row] = await sql`
    select ${sql.unsafe(NOTE_COLUMNS)}
    from review_notes n left join plans bp on bp.id = n.basis_plan_id left join plans np on np.id = n.next_plan_id
    where n.id = ${id}`;
  return row ?? null;
}

// 같은 요청 키로 다시 오면 새로 넣지 않고 처음 넣은 고칠 점을 돌려준다.
export async function insertNote(n) {
  const sql = await q();
  const [row] = await sql`
    with ins as (
      insert into review_notes (request_key, period_from, period_to, basis_plan_id, lesson, snapshot, next_plan_id, carried_at)
      values (${n.request_key}, ${n.from}, ${n.to}, ${n.basis_plan_id}, ${n.lesson}, ${sql.json(n.snapshot)},
              ${n.next_plan_id}, ${n.next_plan_id ? sql`now()` : null})
      on conflict (request_key) do nothing
      returning id, next_plan_id
    )
    select id, next_plan_id from ins
    union all
    select id, next_plan_id from review_notes where request_key = ${n.request_key}
    limit 1`;
  return row;
}

// "새 계획으로" 고른 고칠 점을 방금 만든 계획에 넘긴다. 이미 넘긴 고칠 점이면 그대로 둔다.
export async function carryNoteToPlan(noteId, planId) {
  const sql = await q();
  const rows = await sql`
    update review_notes set next_plan_id = ${planId}, carried_at = now()
    where id = ${noteId} and next_plan_id is null
    returning id`;
  return rows.length === 1;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 폼 값을 검사해 { note } 또는 { error }. next는 계획 번호 또는 'new'.
export function parseNoteForm(formData) {
  const s = (k) => String(formData.get(k) ?? '').trim();
  const f = parseReviewQuery({ from: s('from'), to: s('to') });
  const basis = s('basis_plan_id');
  const next = s('next');
  const note = {
    request_key: s('request_key'),
    from: f.from,
    to: f.to,
    basis_plan_id: basis ? Number(basis) : null,
    lesson: s('lesson').replace(/\s+/g, ' '),
    next_plan_id: next === 'new' ? null : Number(next),
  };
  if (!UUID.test(note.request_key)) return { error: '잘못된 요청이에요. 새로고침한 뒤 다시 적어 주세요.' };
  if (note.basis_plan_id !== null && !(Number.isSafeInteger(note.basis_plan_id) && note.basis_plan_id > 0))
    return { error: '근거로 본 계획이 올바르지 않아요.' };
  if (!note.lesson) return { error: '다음 계획에서 고칠 점을 한 줄 적어 주세요.' };
  if (note.lesson.length > 200) return { error: '고칠 점은 한 줄, 200자까지 적을 수 있어요.' };
  if (next !== 'new' && !(Number.isSafeInteger(note.next_plan_id) && note.next_plan_id > 0))
    return { error: '어느 계획으로 넘길지 골라 주세요.' };
  return { note };
}
