import 'server-only';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { cache } from 'react';
import { after } from 'next/server';

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
    // 연결 수보다 많은 질의를 동시에 보내면 postgres는 한 연결에 질의를 겹쳐 보내는데(pipelining),
    // Supabase transaction pooler에서는 그 응답이 오지 않아 화면이 멈췄다.
    // 그래서 화면에서는 질의를 하나씩 보내고, 혹시 겹치더라도 새 연결을 쓰도록 여유를 둔다.
    max: 4,
    connect_timeout: 10,
    ssl: local ? false : 'require',
    onnotice: () => {},
  });
}

// 요청마다 새 연결을 쓰고, 응답을 보낸 뒤 닫는다. 서버리스 함수는 요청 사이에 멈춰 있곤 해서,
// 예전 요청의 연결을 다시 쓰면 이미 끊긴 연결에 질의를 보내고 응답을 한없이 기다리는 일이 생겼다.
// cache()로 한 요청 안에서는 같은 연결을 나눠 쓴다.
const requestDb = cache(() => {
  const sql = connect();
  after(() => sql.end({ timeout: 5 }));
  return sql;
});
export function db() {
  return requestDb();
}

const g = globalThis;

// 마지막 단계의 표·칸이 아직 없으면 db/ 아래 SQL을 이름 순서대로 적용한다.
// 각 파일은 여러 번 적용해도 결과가 같게(create if not exists, create or replace) 쓴다.
// 여러 요청이 동시에 적용하려 하면 표 잠금을 서로 기다릴 수 있어, 잠금은 5초까지만 기다리고
// 전체도 15초 안에 끝나지 않으면 실패로 보고 다음 요청에서 다시 시도한다.
export function ensureSchema() {
  return (g.__diarySchema ??= withTimeout(15000, async () => {
    const sql = db();
    // 판단 기준은 마지막 SQL(005_owner.sql)이 더하는 review_notes.user_id 칸. 새 SQL을 더하면 여기도 바꾼다.
    const [{ ok }] = await sql`
      select exists (select 1 from information_schema.columns
                     where table_schema = current_schema() and table_name = 'review_notes' and column_name = 'user_id') as ok`;
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
