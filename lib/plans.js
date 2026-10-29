import 'server-only';
import { db, ensureSchema } from './db';

export const PRIORITIES = ['높음', '보통', '낮음'];
export const AREAS = ['운동', '공부', '업무', '게임 연습', 'ALEPH', '생활'];

// 날짜는 문자열(YYYY-MM-DD)로 돌려받아 시간대 문제를 피한다.
const PLAN_COLUMNS = `
  id, title, area, start_date::text as start_date, end_date::text as end_date,
  priority, success_criteria, estimated_minutes, estimate_basis, change_note, version,
  created_at, updated_at`;

async function q() {
  await ensureSchema();
  return db();
}

// 모든 함수의 첫 인자 uid는 로그인한 사람(auth.users.id). 그 사람의 자료만 읽고 쓴다.
export async function listPlans(uid) {
  const sql = await q();
  return sql`
    select ${sql.unsafe(PLAN_COLUMNS)} from plans
    where user_id = ${uid}
    order by case priority when '높음' then 1 when '보통' then 2 else 3 end, start_date, id`;
}

export async function getPlan(uid, id) {
  const sql = await q();
  const [plan] = await sql`select ${sql.unsafe(PLAN_COLUMNS)} from plans where id = ${id} and user_id = ${uid}`;
  return plan ?? null;
}

export async function listRevisions(uid, planId) {
  const sql = await q();
  return sql`
    select id, plan_id, version, title, area, start_date::text as start_date, end_date::text as end_date,
           priority, success_criteria, estimated_minutes, estimate_basis, change_note, saved_at
    from plan_revisions where plan_id = ${planId} and user_id = ${uid}
    order by version desc`;
}

export async function insertPlan(uid, p) {
  const sql = await q();
  const [row] = await sql`
    insert into plans (user_id, title, area, start_date, end_date, priority, success_criteria,
                       estimated_minutes, estimate_basis, change_note)
    values (${uid}, ${p.title}, ${p.area}, ${p.start_date}, ${p.end_date}, ${p.priority}, ${p.success_criteria},
            ${p.estimated_minutes}, ${p.estimate_basis}, ${p.change_note})
    returning id`;
  return row.id;
}

// expectedVersion이 지금 버전과 다르면(그 사이 누가 고쳤으면) 아무것도 바꾸지 않는다.
export async function updatePlan(uid, id, expectedVersion, p) {
  const sql = await q();
  const rows = await sql`
    update plans set
      title = ${p.title}, area = ${p.area}, start_date = ${p.start_date}, end_date = ${p.end_date},
      priority = ${p.priority}, success_criteria = ${p.success_criteria},
      estimated_minutes = ${p.estimated_minutes}, estimate_basis = ${p.estimate_basis},
      change_note = ${p.change_note}
    where id = ${id} and user_id = ${uid} and version = ${expectedVersion}
    returning id`;
  return rows.length === 1;
}

// 폼 값을 검사해 { plan } 또는 { error } 를 돌려준다.
export function parsePlanForm(formData, { requireNote }) {
  const s = (k) => String(formData.get(k) ?? '').trim();
  const plan = {
    title: s('title'),
    area: s('area'),
    start_date: s('start_date'),
    end_date: s('end_date') || null,
    priority: s('priority'),
    success_criteria: s('success_criteria'),
    estimated_minutes: Number(s('estimated_minutes')),
    estimate_basis: s('estimate_basis') || 'per_day',
    change_note: s('change_note') || (requireNote ? '' : '처음 세운 계획'),
  };
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

  if (!plan.title) return { error: '계획 이름을 적어 주세요.' };
  if (plan.title.length > 100) return { error: '계획 이름은 100자까지 적을 수 있어요.' };
  if (!plan.area || plan.area.length > 30) return { error: '분야를 골라 주세요.' };
  if (!isDate(plan.start_date)) return { error: '기간 시작 날짜를 넣어 주세요.' };
  if (plan.end_date && !isDate(plan.end_date)) return { error: '기간 끝 날짜가 올바르지 않아요.' };
  if (plan.end_date && plan.end_date < plan.start_date) return { error: '기간 끝이 시작보다 빨라요.' };
  if (!PRIORITIES.includes(plan.priority)) return { error: '우선순위를 골라 주세요.' };
  if (!plan.success_criteria) return { error: '성공 기준을 적어 주세요.' };
  if (plan.success_criteria.length > 500) return { error: '성공 기준은 500자까지 적을 수 있어요.' };
  if (!Number.isInteger(plan.estimated_minutes) || plan.estimated_minutes <= 0 || plan.estimated_minutes > 100000)
    return { error: '예상 시간은 1 이상의 분 단위 숫자로 적어 주세요.' };
  if (!['per_day', 'total'].includes(plan.estimate_basis)) return { error: '예상 시간 기준을 골라 주세요.' };
  if (!plan.change_note) return { error: '무엇을 왜 고치는지 한 줄 적어 주세요.' };
  if (plan.change_note.length > 300) return { error: '고친 이유는 300자까지 적을 수 있어요.' };
  return { plan };
}

export const COMPARED_FIELDS = [
  'title', 'area', 'start_date', 'end_date', 'priority', 'success_criteria', 'estimated_minutes', 'estimate_basis',
];

export function samePlanContent(a, b) {
  return COMPARED_FIELDS.every((k) => (a[k] ?? null) === (b[k] ?? null));
}
