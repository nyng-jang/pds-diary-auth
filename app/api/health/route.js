import { db, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 배포 후 DB 연결을 확인하는 주소. 비밀값(주소·비밀번호)은 내보내지 않는다.
const HINTS = {
  NO_URL: 'Vercel 환경 변수에 DATABASE_URL(또는 POSTGRES_URL)이 없습니다.',
  ENOTFOUND: 'DB 호스트를 찾지 못했습니다. Supabase의 Transaction pooler 주소(6543)를 쓰세요.',
  ENETUNREACH: 'DB에 닿지 못했습니다. db.xxx.supabase.co(5432) 대신 Transaction pooler 주소(6543)를 쓰세요.',
  ECONNREFUSED: 'DB가 접속을 거부했습니다. 주소와 포트를 확인하세요.',
  ETIMEDOUT: 'DB 접속 시간이 초과됐습니다. Transaction pooler 주소(6543)인지 확인하세요.',
  '28P01': '비밀번호가 틀렸습니다. [YOUR-PASSWORD] 자리에 DB 비밀번호를 넣었는지 확인하세요.',
  XX000: 'Supabase가 사용자를 찾지 못했습니다. pooler 주소의 사용자 이름(postgres.프로젝트ID)을 확인하세요.',
};

function describeUrl() {
  const name = process.env.DATABASE_URL ? 'DATABASE_URL' : process.env.POSTGRES_URL ? 'POSTGRES_URL' : null;
  if (!name) return { env: null };
  try {
    const u = new URL(process.env[name]);
    const host = u.hostname.includes('pooler.supabase.com')
      ? 'supabase-pooler'
      : u.hostname.endsWith('.supabase.co')
        ? 'supabase-direct'
        : 'other';
    return { env: name, host, port: u.port || '5432', has_password: Boolean(u.password) };
  } catch {
    return { env: name, invalid: true };
  }
}

export async function GET() {
  const conn = describeUrl();
  if (!conn.env) return Response.json({ ok: false, code: 'NO_URL', hint: HINTS.NO_URL, conn }, { status: 500 });
  try {
    await ensureSchema();
    const [{ plans, tasks }] = await db()`
      select (select count(*)::int from plans) as plans, (select count(*)::int from tasks) as tasks`;
    return Response.json({ ok: true, conn, plans, tasks });
  } catch (e) {
    const code = e?.code ?? 'UNKNOWN';
    return Response.json(
      { ok: false, code, hint: HINTS[code] ?? '배포 로그(Logs)의 빨간 줄을 확인하세요.', conn },
      { status: 500 },
    );
  }
}
