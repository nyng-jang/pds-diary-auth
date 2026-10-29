import 'server-only';
import { db, ensureSchema } from './db';

// 과제 6 다이어리의 /api/export JSON을 로그인한 사람의 자료로 옮긴다.
// - 번호(id)는 새 DB에서 새로 매기고, 계획·할 일 사이의 연결은 옛 번호 → 새 번호로 바꿔 잇는다.
// - 계획 이력(plan_revisions)은 트리거가 새로 만들지 않게 잠깐 끄고, 파일에 있던 버전·저장 시각 그대로 넣는다.
// - 실행 기록·완료 기록·고칠 점의 request_key(unique)를 그대로 쓰므로 같은 파일을 두 번 가져올 수 없다.
// - 시각은 문자열 그대로 DB에 넘긴다(::text). postgres.js가 Date로 바꾸면 마이크로초가 잘린다.
// - 자료가 이미 있는 계정에는 가져오지 않는다. 전체가 한 트랜잭션이라 중간에 실패하면 아무것도 남지 않는다.

const FORMAT = 'plan-do-see-diary/export';
const TABLES = ['plans', 'plan_revisions', 'tasks', 'task_logs', 'task_completions', 'review_notes'];
const MAX_ROWS = 2000;

export class ImportError extends Error {}

// 파일 내용을 검사해 { data } 또는 ImportError
export function parseExport(text) {
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ImportError('JSON 파일이 아니에요.');
  }
  if (body?.format !== FORMAT || body?.schema_version !== 2)
    throw new ImportError('플랜두씨 다이어리(과제 6)에서 내려받은 파일이 아니에요.');
  for (const t of TABLES) {
    const rows = body.data?.[t];
    if (!Array.isArray(rows)) throw new ImportError(`파일에 ${t} 자료가 없어요.`);
    if (rows.length > MAX_ROWS) throw new ImportError(`${t} 자료가 너무 많아요.`);
  }
  return body.data;
}

export async function importExport(uid, data) {
  await ensureSchema();
  const sql = db();
  // 질의는 하나씩 보낸다 (lib/db.js 설명 참고)
  return sql.begin(async (tx) => {
    await tx`set local lock_timeout = '5s'`;
    const [{ n }] = await tx`select count(*)::int as n from plans where user_id = ${uid}`;
    if (n > 0) throw new ImportError('이미 계획이 있는 계정에는 가져올 수 없어요. 빈 계정에서 한 번만 가져올 수 있어요.');

    const planMap = new Map();
    const taskMap = new Map();
    const need = (map, id, what) => {
      if (id === null || id === undefined) return null;
      if (!map.has(id)) throw new ImportError(`${what} #${id}가 파일 안에 없어요.`);
      return map.get(id);
    };

    // 계획: 만들 때 이력을 자동으로 남기는 트리거를 이 트랜잭션 안에서만 끈다
    await tx`alter table plans disable trigger plans_after_write`;
    for (const p of sortById(data.plans)) {
      const [row] = await tx`
        insert into plans (user_id, title, area, start_date, end_date, priority, success_criteria,
                           estimated_minutes, estimate_basis, change_note, version, created_at, updated_at)
        values (${uid}, ${p.title}, ${p.area}, ${p.start_date}, ${p.end_date}, ${p.priority}, ${p.success_criteria},
                ${p.estimated_minutes}, ${p.estimate_basis}, ${p.change_note}, ${p.version}, ${p.created_at}::text::timestamptz, ${p.updated_at}::text::timestamptz)
        returning id`;
      planMap.set(p.id, row.id);
    }
    for (const r of sortById(data.plan_revisions)) {
      await tx`
        insert into plan_revisions (plan_id, user_id, version, title, area, start_date, end_date, priority,
                                    success_criteria, estimated_minutes, estimate_basis, change_note, saved_at)
        values (${need(planMap, r.plan_id, '계획')}, ${uid}, ${r.version}, ${r.title}, ${r.area}, ${r.start_date},
                ${r.end_date}, ${r.priority}, ${r.success_criteria}, ${r.estimated_minutes}, ${r.estimate_basis},
                ${r.change_note}, ${r.saved_at}::text::timestamptz)`;
    }
    await tx`alter table plans enable trigger plans_after_write`;

    for (const t of sortById(data.tasks)) {
      const [row] = await tx`
        insert into tasks (user_id, plan_id, title, note, due_date, priority, tags, estimated_minutes,
                           status, completed_at, created_at, updated_at)
        values (${uid}, ${need(planMap, t.plan_id, '계획')}, ${t.title}, ${t.note ?? ''}, ${t.due_date}, ${t.priority},
                ${t.tags ?? []}, ${t.estimated_minutes}, ${t.status}, ${t.completed_at}::text::timestamptz, ${t.created_at}::text::timestamptz, ${t.updated_at}::text::timestamptz)
        returning id`;
      taskMap.set(t.id, row.id);
    }
    for (const l of sortById(data.task_logs)) {
      await tx`
        insert into task_logs (task_id, user_id, request_key, started_at, ended_at, actual_minutes, blocker, created_at)
        values (${need(taskMap, l.task_id, '할 일')}, ${uid}, ${l.request_key}, ${l.started_at}::text::timestamptz, ${l.ended_at}::text::timestamptz,
                ${l.actual_minutes}, ${l.blocker ?? ''}, ${l.created_at}::text::timestamptz)`;
    }
    for (const c of sortById(data.task_completions)) {
      await tx`
        insert into task_completions (task_id, user_id, request_key, completed_at, reopened_at)
        values (${need(taskMap, c.task_id, '할 일')}, ${uid}, ${c.request_key}, ${c.completed_at}::text::timestamptz, ${c.reopened_at}::text::timestamptz)`;
    }
    for (const r of sortById(data.review_notes)) {
      await tx`
        insert into review_notes (user_id, request_key, period_from, period_to, basis_plan_id, lesson, snapshot,
                                  next_plan_id, carried_at, created_at)
        values (${uid}, ${r.request_key}, ${r.period_from}, ${r.period_to}, ${need(planMap, r.basis_plan_id, '계획')},
                ${r.lesson}, ${tx.json(r.snapshot ?? {})}, ${need(planMap, r.next_plan_id, '계획')},
                ${r.carried_at}::text::timestamptz, ${r.created_at}::text::timestamptz)`;
    }

    return {
      counts: Object.fromEntries(TABLES.map((t) => [t, data[t].length])),
      plans: [...planMap].map(([from, to]) => ({ from, to })),
      tasks: [...taskMap].map(([from, to]) => ({ from, to })),
    };
  }).catch((e) => {
    if (e instanceof ImportError) throw e;
    if (e?.code === '23505') throw new ImportError('이 파일의 자료는 이미 가져왔어요. 같은 파일은 한 번만 가져올 수 있어요.');
    console.error('import failed', e?.code ?? e?.name, e?.message);
    throw new ImportError('가져오지 못했어요. 아무것도 바뀌지 않았어요.');
  });
}

function sortById(rows) {
  return [...rows].sort((a, b) => Number(a.id) - Number(b.id));
}
