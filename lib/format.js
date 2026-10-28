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

// 한국 시간 기준 오늘 (YYYY-MM-DD)
export function todaySeoul() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function formatDue(due, status, today = todaySeoul()) {
  if (!due) return { text: '마감 없음', tone: 'muted' };
  const diff = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  if (status === '완료') return { text: `${due} 마감`, tone: 'muted' };
  if (diff < 0) return { text: `${due} (${-diff}일 지남)`, tone: 'late' };
  if (diff === 0) return { text: `${due} (오늘)`, tone: 'soon' };
  return { text: `${due} (D-${diff})`, tone: diff <= 2 ? 'soon' : '' };
}

// 실행 기록의 시작~끝. 같은 날이면 날짜를 한 번만 쓴다. 예: "10월 28일 (화) 09:10 ~ 10:30"
export function formatRange(start, end) {
  const day = (t) => new Date(t).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' });
  const hm = (t) => new Date(t).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return day(start) === day(end)
    ? `${day(start)} ${hm(start)} ~ ${hm(end)}`
    : `${day(start)} ${hm(start)} ~ ${day(end)} ${hm(end)}`;
}

// 실제 - 예상. 예: "예상보다 20분 더", "예상보다 10분 덜", "예상과 같음"
export function formatGap(actual, estimated) {
  const d = actual - estimated;
  if (d === 0) return { text: '예상과 같음', tone: 'ok' };
  return d > 0
    ? { text: `예상보다 ${formatMinutes(d)} 더`, tone: 'soon' }
    : { text: `예상보다 ${formatMinutes(-d)} 덜`, tone: 'ok' };
}
