// db/ 아래 SQL 파일을 이름 순서대로 DATABASE_URL 에 적용한다.
import { readFileSync, readdirSync } from 'node:fs';
import postgres from 'postgres';

const url = new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL);
for (const k of [...url.searchParams.keys()]) url.searchParams.delete(k);
const local = /^(localhost|127\.0\.0\.1)$/.test(url.hostname);
const sql = postgres(url.toString(), { prepare: false, max: 1, ssl: local ? false : 'require', onnotice: () => {} });
const files = readdirSync(new URL('../db/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  await sql.unsafe(readFileSync(new URL(`../db/${f}`, import.meta.url), 'utf8'));
  console.log('적용:', f);
}
await sql.end();
