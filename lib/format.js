export const FIELD_LABELS = {
  title: '계획 이름',
  area: '분야',
  start_date: '기간 시작',
  end_date: '기간 끝',
  priority: '우선순위',
  success_criteria: '성공 기준',
  estimated_minutes: '예상 시간',
  estimate_basis: '예상 시간 기준',
};

export function periodDays(p) {
  if (!p.end_date) return null;
  return Math.round((Date.parse(p.end_date) - Date.parse(p.start_date)) / 86400000) + 1;
}

export function formatPeriod(p) {
  const days = periodDays(p);
  return days ? `${p.start_date} ~ ${p.end_date} (${days}일)` : `${p.start_date} ~ 끝 없이 계속`;
}

export function formatMinutes(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}분`;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

export function formatEstimate(p) {
  if (p.estimate_basis === 'total') return `전체 ${formatMinutes(p.estimated_minutes)}`;
  const days = periodDays(p);
  const daily = `하루 ${formatMinutes(p.estimated_minutes)}`;
  return days ? `${daily} · 기간 전체 ${formatMinutes(p.estimated_minutes * days)}` : daily;
}

export function formatField(key, value) {
  if (value === null || value === undefined || value === '') return '(없음)';
  if (key === 'estimated_minutes') return `${value}분`;
  if (key === 'estimate_basis') return value === 'total' ? '기간 전체' : '하루';
  return String(value);
}

export function formatTime(t) {
  return new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
}
