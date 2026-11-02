// 로그인 유지 규칙 (과제 7 카드 3, 나영 결정 2026-11-02)
// - 로그인한 지 7일이 지나면 다시 로그인해야 한다. (무료 Supabase는 세션 최대 기간을 못 정해서 앱이 직접 본다)
// - 로그인 쿠키는 HttpOnly: 브라우저 스크립트(document.cookie)로 읽을 수 없다. 이 앱은 브라우저에서 Supabase를 쓰지 않는다.
// - 운영(https)에서는 Secure: https로만 오간다.
export const MAX_LOGIN_SECONDS = 7 * 24 * 60 * 60;

export const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // maxAge는 @supabase/ssr가 늘 400일로 덮어쓴다. 그래서 7일 제한은 쿠키 수명이 아니라 서버(loginTooOld)가 지킨다.
};

// 출입증(access token) 안의 "처음 로그인한 시각"(amr[].timestamp, 초).
// 토큰을 새로 받아도 이 값은 그대로라서 로그인한 지 얼마나 됐는지 알 수 있다.
// 서명 확인은 하지 않는다: 이 함수는 getUser()가 Supabase에 확인을 받은 뒤에만 부른다.
export function loginStartedAt(accessToken) {
  try {
    const part = accessToken.split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const times = (json.amr ?? []).map((a) => a.timestamp).filter(Number.isFinite);
    return times.length ? Math.min(...times) : json.iat ?? null;
  } catch {
    return null;
  }
}

// getUser()로 확인된 뒤에 부른다. 7일이 지났거나 시각을 모르면 true.
export async function loginTooOld(supabase) {
  const { data } = await supabase.auth.getSession();
  const at = data?.session?.access_token ? loginStartedAt(data.session.access_token) : null;
  if (!at) return true;
  return Date.now() / 1000 - at > MAX_LOGIN_SECONDS;
}
