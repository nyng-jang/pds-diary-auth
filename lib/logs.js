import 'server-only';
import { db, ensureSchema } from './db';

// 실행 기록(실제로 한 일)과 완료 기록. 표 설명은 db/003_logs.sql.

async function q() {
  await ensureSchema();
  return db();
}

const LOG_COLUMNS = `
  l.id, l.task_id, t.title as task_title, t.plan_id, p.title as plan_title, t.estimated_minutes,
  l.started_at, l.ended_at, l.actual_minutes, l.blocker, l.created_at`;

export async function listLogsForTask(taskId) {
  const sql = await q();
  return sql`
    select ${sql.unsafe(LOG_COLUMNS)}
    from task_logs l join tasks t on t.id = l.task_id join plans p on p.id = t.plan_id
    where l.task_id = ${taskId}
    order by l.started_at desc, l.id desc`;
}

export async function listLogs() {
  const sql = await q();
  return sql`
    select ${sql.unsafe(LOG_COLUMNS)}
    from task_logs l join tasks t on t.id = l.task_id join plans p on p.id = t.plan_id
    order by l.started_at desc, l.id desc`;
}

// 같은 요청 키로 다시 오면(연달아 두 번 저장) 두 번째는 들어가지 않는다.
// 들어갔으면 true, 이미 있던 요청이면 false.
export async function insertLog(log) {
  const sql = await q();
  const rows = await sql`
    insert into task_logs (task_id, request_key, started_at, ended_at, actual_minutes, blocker)
    values (${log.task_id}, ${log.request_key},
            ${log.started_at}::timestamp at time zone 'Asia/Seoul',
            ${log.ended_at}::timestamp at time zone 'Asia/Seoul',
            ${log.actual_minutes}, ${log.blocker})
    on conflict (request_key) do nothing
    returning id`;
  return rows.length === 1;
}

// 돌아보기 집계. 완료 수는 지금도 완료인 완료 기록(되돌리지 않은 것)의 수다.
export async function getReviewCounts() {
  const sql = await q();
  const [row] = await sql`
    select
      (select count(*)::int from task_completions where reopened_at is null) as completions,
      (select count(*)::int from task_logs) as logs,
      (select coalesce(sum(actual_minutes), 0)::int from task_logs) as actual_minutes,
      (select count(*)::int from task_logs where blocker <> '') as blocked_logs`;
  return row;
}

export async function listCompletions() {
  const sql = await q();
  return sql`
    select c.id, c.task_id, t.title as task_title, t.plan_id, p.title as plan_title, c.completed_at
    from task_completions c join tasks t on t.id = c.task_id join plans p on p.id = t.plan_id
    where c.reopened_at is null
    order by c.completed_at desc, c.id desc`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// datetime-local 값(한국 시간)을 밀리초로. 올바르지 않으면 NaN.
function seoulMs(v) {
  return LOCAL_TIME.test(v) ? Date.parse(`${v}:00+09:00`) : NaN;
}

// 폼 값을 검사해 { log } 또는 { error } 를 돌려준다. 실제로 걸린 시간을 비우면 시작~끝으로 계산한다.
export function parseLogForm(formData, now = Date.now()) {
  const s = (k) => String(formData.get(k) ?? '').trim();
  const log = {
    task_id: Number(s('task_id')),
    request_key: s('request_key'),
    started_at: s('started_at'),
    ended_at: s('ended_at'),
    actual_minutes: s('actual_minutes'),
    blocker: s('blocker'),
  };
  if (!Number.isSafeInteger(log.task_id) || log.task_id <= 0 || !UUID.test(log.request_key))
    return { error: '잘못된 요청이에요. 새로고침한 뒤 다시 적어 주세요.' };

  const start = seoulMs(log.started_at);
  const end = seoulMs(log.ended_at);
  if (Number.isNaN(start)) return { error: '시작 시각을 적어 주세요.' };
  if (Number.isNaN(end)) return { error: '끝난 시각을 적어 주세요.' };
  if (end <= start) return { error: '끝난 시각은 시작 시각보다 뒤여야 해요.' };
  if (end - start > 24 * 3600000) return { error: '한 기록은 24시간까지 적을 수 있어요. 나눠서 적어 주세요.' };
  if (end > now + 5 * 60000) return { error: '아직 오지 않은 시각은 적을 수 없어요. 실제로 한 일만 적어 주세요.' };

  const span = Math.ceil((end - start) / 60000);
  if (log.actual_minutes === '') log.actual_minutes = span;
  else log.actual_minutes = Number(log.actual_minutes);
  if (!Number.isInteger(log.actual_minutes) || log.actual_minutes < 1)
    return { error: '실제로 걸린 시간은 1 이상의 분 단위 숫자로 적어 주세요.' };
  if (log.actual_minutes > span)
    return { error: `실제로 걸린 시간은 시작~끝(${span}분)보다 길 수 없어요.` };
  if (log.blocker.length > 500) return { error: '막혔던 이유는 500자까지 적을 수 있어요.' };
  return { log };
}
