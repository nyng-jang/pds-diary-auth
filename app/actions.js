'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPlan, insertPlan, parsePlanForm, samePlanContent, updatePlan } from '@/lib/plans';

export async function createPlanAction(_prev, formData) {
  const { plan, error } = parsePlanForm(formData, { requireNote: false });
  if (error) return { error };
  const id = await insertPlan(plan);
  revalidatePath('/');
  redirect(`/plans/${id}`);
}

export async function updatePlanAction(_prev, formData) {
  const id = Number(formData.get('id'));
  const expectedVersion = Number(formData.get('version'));
  if (!Number.isInteger(id) || !Number.isInteger(expectedVersion)) return { error: '잘못된 요청이에요.' };

  const { plan, error } = parsePlanForm(formData, { requireNote: true });
  if (error) return { error };

  const current = await getPlan(id);
  if (!current) return { error: '계획을 찾을 수 없어요.' };
  if (samePlanContent(current, plan)) return { error: '바뀐 내용이 없어요.' };

  const ok = await updatePlan(id, expectedVersion, plan);
  if (!ok) return { error: '그 사이에 계획이 바뀌었어요. 새로고침한 뒤 다시 고쳐 주세요.' };

  revalidatePath('/');
  revalidatePath(`/plans/${id}`);
  redirect(`/plans/${id}?saved=1`);
}
