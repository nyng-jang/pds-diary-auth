import 'server-only';
import { db, ensureSchema } from './db';

// 계정 지우기: 내 자료 9개 표를 모두 지우고, 같은 트랜잭션에서 로그인 정보(auth.users)도 지운다.
// - 지울 수 없게 막아 둔 표(계획·계획 이력·고칠 점·5일 기록)는 이 트랜잭션에서만
//   `set local diary.account_delete = 'on'` 으로 지울 수 있다 (db/006_days.sql). 트랜잭션이 끝나면 꺼진다.
// - 외래 키 순서대로 지운다: 규칙 변경 → 5일 기록 → 설정 → 고칠 점 → 완료·실행 기록 → 할 일 → 계획 이력 → 계획
// - 로그인 정보는 docs/task7-delete-account.sql로 만든 함수 delete_auth_user가 지운다.
//   그 함수가 없으면 전체를 되돌리고 아무것도 지우지 않는다 (자료만 사라지고 계정이 남는 일이 없게).
export const DELETE_ORDER = [
  'experiment_rule_changes', 'experiment_days', 'experiments',
  'review_notes', 'task_completions', 'task_logs', 'tasks', 'plan_revisions', 'plans',
];

export async function deleteAccount(uid) {
  await ensureSchema();
  const sql = db();
  return sql.begin(async (tx) => {
    const [{ fn }] = await tx`select to_regprocedure('delete_auth_user(uuid)') is not null as fn`;
    if (!fn) throw new Error('delete_auth_user 함수가 없습니다 (docs/task7-delete-account.sql)');
    await tx`set local diary.account_delete = 'on'`;
    const counts = {};
    for (const table of DELETE_ORDER) {
      const rows = await tx`delete from ${tx(table)} where user_id = ${uid} returning id`;
      counts[table] = rows.length;
    }
    const [{ deleted }] = await tx`select delete_auth_user(${uid}) as deleted`;
    if (!deleted) throw new Error('auth user not found');
    return counts;
  });
}
