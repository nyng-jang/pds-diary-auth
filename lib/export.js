import 'server-only';
import { db, ensureSchema } from './db';

// 내 자료 전체를 JSON 파일 하나로. 표 설명은 contracts/pds-schema-v2.json.
// 표마다 모든 열을 그대로 담고, 순서는 id 오름차순이다.
export const EXPORT_TABLES = ['plans', 'plan_revisions', 'tasks', 'task_logs', 'task_completions', 'review_notes'];

// uid(로그인한 사람)의 자료만 담는다.
export async function exportAll(uid) {
  await ensureSchema();
  const sql = db();
  // 시각(timestamptz)은 한국 시간 오프셋(+09:00)을 붙여 쓰고, 날짜(date)는 YYYY-MM-DD 그대로 쓴다.
  // 한 트랜잭션(repeatable read)에서 읽어 표 사이 숫자가 어긋나지 않게 하고, 질의는 하나씩 보낸다.
  return sql.begin('isolation level repeatable read read only', async (tx) => {
    await tx`set local time zone 'Asia/Seoul'`;
    const [{ now }] = await tx`select to_json(now()) #>> '{}' as now`;
    const data = {};
    for (const table of EXPORT_TABLES) {
      const [{ rows }] = await tx`
        select coalesce(json_agg(t order by t.id), '[]'::json) as rows from ${tx(table)} t where t.user_id = ${uid}`;
      data[table] = rows;
    }
    return {
      format: 'plan-do-see-diary/export',
      schema: 'contracts/pds-schema-v2.json',
      schema_version: 2,
      exported_at: now,
      time_zone: 'Asia/Seoul',
      units: { estimated_minutes: 'minute', actual_minutes: 'minute' },
      counts: Object.fromEntries(EXPORT_TABLES.map((t) => [t, data[t].length])),
      data,
    };
  });
}
