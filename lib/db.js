import 'server-only';
import { readdirSync, readFileSync } from 'node:fs';
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
    // 서버리스 함수가 멈췄다 깨어나면 끊긴 연결을 붙잡고 한없이 기다릴 수 있어, 시간을 정해 둔다
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    ssl: local ? false : 'require',
    onnotice: () => {},
  });
}

// 개발 중 핫 리로드로 연결이 계속 늘어나지 않게 하나만 둔다.
const g = globalThis;
export function db() {
  return (g.__diarySql ??= connect());
}

// 마지막 단계의 표가 아직 없으면 db/ 아래 SQL을 이름 순서대로 적용한다.
// 각 파일은 여러 번 적용해도 결과가 같게(create if not exists, create or replace) 쓴다.
// 여러 요청이 동시에 적용하려 하면 표 잠금을 서로 기다릴 수 있어, 잠금은 5초까지만 기다리고
// 전체도 15초 안에 끝나지 않으면 실패로 보고 다음 요청에서 다시 시도한다.
export function ensureSchema() {
  return (g.__diarySchema ??= withTimeout(15000, async () => {
    const sql = db();
    const [{ ok }] = await sql`select to_regclass('public.tasks') is not null as ok`;
    if (ok) return;
    const dir = path.join(process.cwd(), 'db');
    await sql.begin(async (tx) => {
      await tx`set local lock_timeout = '5s'`;
      for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
        await tx.unsafe(readFileSync(path.join(dir, f), 'utf8'));
      }
    });
  }).catch((e) => {
    g.__diarySchema = undefined;
    throw e;
  }));
}

function withTimeout(ms, fn) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB 준비 시간이 초과됐습니다')), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => clearTimeout(timer));
}
