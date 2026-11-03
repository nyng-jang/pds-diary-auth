'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { addDay, addRuleChange, friendlyError, readSettings, saveSettings } from '@/lib/days';

// 5일 기록 화면의 저장 버튼들. 모두 첫 줄에서 로그인한 사람을 확인하고, 그 사람 번호로만 쓴다.

export async function saveSettingsAction(_prev, formData) {
  const { id: uid } = await requireUser();
  const r = readSettings(formData);
  if (r.error) return { error: r.error };
  try {
    await saveSettings(uid, r.value);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath('/days');
  redirect('/days?saved=settings');
}

export async function addDayAction(_prev, formData) {
  const { id: uid } = await requireUser();
  const note = String(formData.get('note') ?? '').trim();
  if (note.length > 500) return { error: '메모는 500자까지 적을 수 있어요.' };
  let dayNo;
  try {
    dayNo = await addDay(uid, { note, manualValue: String(formData.get('value') ?? '').trim() });
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath('/days');
  redirect(`/days?saved=day${dayNo}`);
}

export async function changeRuleAction(_prev, formData) {
  const { id: uid } = await requireUser();
  const afterRule = String(formData.get('after_rule') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!afterRule || afterRule.length > 300) return { error: '바꾼 계획 규칙을 300자 안에서 적어 주세요.' };
  if (!reason || reason.length > 500) return { error: '바꾼 이유를 500자 안에서 적어 주세요.' };
  try {
    await addRuleChange(uid, { afterRule, reason });
  } catch (e) {
    return { error: friendlyError(e) };
  }
  revalidatePath('/days');
  redirect('/days?saved=rule');
}
