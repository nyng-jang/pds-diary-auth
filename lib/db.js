import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

// DATABASE_URL을 쓰고, Vercel의 Supabase 연동이 넣어 주는 POSTGRES_URL도 받는다.
// 연동 주소에 붙는 supa=... 같은 값은 postgres 접속 설정으로 넘어가면 오류가 나서 뺀다.
function connectionUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error('DATABASE_URL이 설정되지 않았습니다');
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
  return url.toString();
}

function connect() {
  const url = connectionUrl();
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    prepare: false, // Supabase transaction pooler(6543)는 prepared statement를 쓰지 못한다
    max: 3,
    ssl: local ? false : 'require',
    onnotice: () => {},
  });
}

// 개발 중 핫 리로드로 연결이 계속 늘어나지 않게 하나만 둔다.
const g = globalThis;
export function db() {
  return (g.__diarySql ??= connect());
}

// 표가 아직 없으면 db/ 아래 SQL을 한 번 적용한다.
export function ensureSchema() {
  return (g.__diarySchema ??= (async () => {
    const sql = db();
    const [{ ok }] = await sql`select to_regclass('public.plan_revisions') is not null as ok`;
    if (ok) return;
    const file = path.join(process.cwd(), 'db', '001_plans.sql');
    await sql.unsafe(readFileSync(file, 'utf8'));
  })().catch((e) => {
    g.__diarySchema = undefined;
    throw e;
  }));
}
