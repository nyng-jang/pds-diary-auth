import { apiUser, json, notFound, parseId, unauthorized } from '@/lib/api';
import { getPlan } from '@/lib/plans';

export const dynamic = 'force-dynamic';

// GET /api/plans/:id : 내 계획 하나. 남의 것이면 getPlan()이 null → 404
export async function GET(_request, { params }) {
  const uid = await apiUser();
  if (!uid) return unauthorized();
  const id = parseId((await params).id);
  const plan = id && (await getPlan(uid, id));
  if (!plan) return notFound('계획');
  return json(200, { ok: true, plan });
}

