// Vercel의 Supabase 연동이 넣어 주는 공개 값. 브라우저에 보여도 되는 값이고(RLS가 지킨다),
// 연동 버전에 따라 ANON_KEY 또는 PUBLISHABLE_KEY 이름으로 들어온다.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다');
  return { url, key };
}
