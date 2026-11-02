import 'server-only';
import { currentUser } from './auth';

// JSON 주소(/api/...)에서 쓰는 도우미.
// 누구의 자료인지는 오직 로그인 쿠키로 알아낸 사람(currentUser)으로만 정한다.
// 주소(?user_id=), 요청 헤더(X-User-Id), 요청 본문(user_id)에 적힌 값은 읽지도 않는다.

export const json = (status, body) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const unauthorized = () => json(401, { ok: false, error: '로그인이 필요해요.' });

// 남의 자료와 없는 자료를 구분하지 않고 똑같이 404로 답한다 (있는지조차 알려 주지 않는다)
export const notFound = (what) => json(404, { ok: false, error: `${what}을(를) 찾을 수 없어요.` });

export const badRequest = (error) => json(400, { ok: false, error });

// 로그인한 사람의 id. 없으면 null (부르는 쪽에서 401)
export async function apiUser() {
  const user = await currentUser();
  return user ? user.id : null;
}

// 주소의 [id]를 양의 정수로. 아니면 null
export function parseId(raw) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// JSON 본문을 폼처럼 읽게 해서 화면 폼과 같은 검사(parseTaskForm 등)를 그대로 쓴다
export function asForm(obj) {
  return {
    get: (k) => {
      const v = obj[k];
      if (v == null) return null;
      return Array.isArray(v) ? v.join(',') : String(v);
    },
  };
}
