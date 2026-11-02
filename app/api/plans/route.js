import { apiUser, asForm, badRequest, json, readJson, unauthorized } from '@/lib/api';
import { insertPlan, listPlans, parsePlanForm } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// GET /api/plans : 내 계획 목록. listPlans()의 SQL에 where user_id = 로그인한 사람 이 붙어 있다.
export async function GET() {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const plans = await listPlans(uid);
  return json(200, { ok: true, count: plans.length, plans });
}

// POST /api/plans : 계획 하나 만들기. 주인은 늘 로그인한 사람 (본문의 user_id는 쓰지 않는다)
export async function POST(request) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const body = await readJson(request);
  if (!body) return badRequest('JSON 본문이 필요해요.');
  const { plan, error } = parsePlanForm(asForm(body), { requireNote: false });
  if (error) return badRequest(error);
  const id = await insertPlan(uid, plan);
  return json(201, { ok: true, id, user_id: uid });
}
