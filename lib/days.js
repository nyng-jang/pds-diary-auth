import 'server-only';
import { db, ensureSchema } from './db';

// 5일 기록 (과제 7 카드 5).
// 1일차에 질문·지표·단위·계산 규칙·계획 규칙을 정하고(experiments), 날마다 한 줄(experiment_days),
// 2일차 뒤·3일차 앞에 계획 규칙을 한 번 바꾼다(experiment_rule_changes). 순서는 DB 트리거가 지킨다(db/006_days.sql).
//
// 숫자는 모두 "0.1 단위 정수"(tenths)로 바꿔 더하고 나눈다. 소수를 그대로 더하면 0.1 + 0.2 같은 오차가 생겨
// 화면 합계가 손으로 더한 값과 어긋날 수 있어서다.

export const KINDS = {
  completion_rate: {
    label: '그날 완료율 (%)',
    defaults: {
      question: '하루에 세운 할 일을 그날 안에 얼마나 끝내나?',
      metric_name: '그날 완료율',
      unit: '%',
      calc_rule: '그날(서울) 마감인 할 일 중, 기록 버튼을 누른 순간 완료 상태인 할 일 수 ÷ 그날 마감인 할 일 수 × 100',
      missing_rule: '그날 마감인 할 일이 0개면 그날은 기록하지 않는다 (0%로 채우지 않는다)',
      duplicate_rule: '같은 할 일은 완료를 여러 번 눌렀어도 한 번만 센다. 하루에 기록은 한 번만 남는다',
      outlier_rule: '지우지 않고 그대로 계산에 넣는다. 5일 평균에서 30%p 넘게 벗어난 날만 "튐" 표시를 붙인다',
      outlier_threshold: '30',
      rounding_rule: '소수 둘째 자리에서 반올림해 첫째 자리까지 (그날 값, 합계, 평균 모두)',
      week_start: '월요일',
      plan_rule: '하루 할 일을 4개 세운다',
    },
  },
  time_gap: {
    label: '예상과 실제 시간 차이 (분)',
    defaults: {
      question: '하루 계획한 시간과 실제로 쓴 시간이 얼마나 다른가?',
      metric_name: '그날 시간 차이',
      unit: '분',
      calc_rule: '그날(서울) 마감인 할 일들의 실행 기록 합(분) − 그 할 일들의 예상 시간 합(분). +면 예상보다 오래 걸림',
      missing_rule: '그날 마감인 할 일이 0개이거나 실행 기록이 하나도 없으면 그날은 기록하지 않는다 (0분으로 채우지 않는다)',
      duplicate_rule: '같은 할 일은 한 번만 센다. 실행 기록은 시작 시각이 다른 것만 따로 쌓인다. 하루에 기록은 한 번만 남는다',
      outlier_rule: '지우지 않고 그대로 계산에 넣는다. 5일 평균에서 60분 넘게 벗어난 날만 "튐" 표시를 붙인다',
      outlier_threshold: '60',
      rounding_rule: '그날 값은 정수 분. 평균은 소수 둘째 자리에서 반올림해 첫째 자리까지 (0에서 먼 쪽으로)',
      week_start: '월요일',
      plan_rule: '할 일 예상 시간을 내 느낌대로 적는다',
    },
  },
  manual: {
    label: '직접 정하기 (값을 손으로 적음)',
    defaults: {
      question: '', metric_name: '', unit: '', calc_rule: '',
      missing_rule: '', duplicate_rule: '', outlier_rule: '', outlier_threshold: '',
      rounding_rule: '소수 둘째 자리에서 반올림해 첫째 자리까지', week_start: '월요일', plan_rule: '',
    },
  },
};

export const SETTING_FIELDS = [
  ['question', '1일차에 답하려는 질문', 300],
  ['metric_name', '볼 지표', 100],
  ['unit', '단위', 20],
  ['calc_rule', '계산 규칙', 500],
  ['missing_rule', '값이 빠졌을 때', 300],
  ['duplicate_rule', '값이 중복될 때', 300],
  ['outlier_rule', '값이 유난히 튈 때', 300],
  ['rounding_rule', '반올림', 300],
  ['plan_rule', '1·2일차 계획 규칙', 300],
];

// ── 숫자 ──────────────────────────────────────────
// 반올림: 0.05 단위에서 0에서 먼 쪽으로 (사사오입)
function roundHalfAway(x) {
  return Math.sign(x) * Math.round(Math.abs(x));
}
export function toTenths(v) {
  return roundHalfAway(Number(v) * 10);
}
export function fmtTenths(t) {
  const s = t < 0 ? '−' : '';
  const a = Math.abs(t);
  return `${s}${Math.floor(a / 10)}.${a % 10}`;
}

// 기록들의 합계·평균. 평균 = 합계 ÷ 날 수, 소수 둘째 자리에서 반올림.
export function summarize(days) {
  const tenths = days.map((d) => toTenths(d.value));
  const sum = tenths.reduce((a, b) => a + b, 0);
  const avg = days.length ? roundHalfAway(sum / days.length) : null;
  return {
    n: days.length,
    sum,
    avg,
    sumText: fmtTenths(sum),
    avgText: avg === null ? '—' : fmtTenths(avg),
    // 손으로 다시 해 보기 위한 식
    formula: days.length ? `(${tenths.map(fmtTenths).join(' + ')}) ÷ ${days.length}` : '',
  };
}

// 주 시작 요일에 따라 그 날짜가 속한 주의 첫날
export function weekStartOf(dateStr, weekStart) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay(); // 일=0
  const back = weekStart === '일요일' ? dow : (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

// ── 읽기 ──────────────────────────────────────────
export async function getDiary(uid) {
  await ensureSchema();
  const sql = db();
  const [exp] = await sql`select * from experiments where user_id = ${uid}`;
  if (!exp) return { exp: null, days: [], change: null };
  const days = await sql`
    select id, day_no, to_char(record_date, 'YYYY-MM-DD') as record_date, plan_rule, value::text as value,
           numerator, denominator, detail, note, created_at
    from experiment_days where experiment_id = ${exp.id} and user_id = ${uid} order by day_no`;
  const [change] = await sql`
    select * from experiment_rule_changes where experiment_id = ${exp.id} and user_id = ${uid}`;
  return { exp, days, change: change ?? null };
}

// 오늘(서울) 값을 미리 계산한다. 기록 버튼을 누르면 같은 함수로 다시 계산해 저장한다.
// 반환: { ok, value, numerator, denominator, detail, reason }
export async function computeToday(uid, exp, sql = db()) {
  const tasks = await sql`
    select t.id, t.title, t.status, t.estimated_minutes,
           (select coalesce(sum(l.actual_minutes), 0)::int from task_logs l
             where l.task_id = t.id and l.user_id = ${uid}) as actual_minutes,
           (select count(*)::int from task_logs l where l.task_id = t.id and l.user_id = ${uid}) as log_count
    from tasks t
    where t.user_id = ${uid} and t.due_date = (now() at time zone 'Asia/Seoul')::date
    order by t.id`;
  const detail = tasks.map((t) => ({
    id: Number(t.id), title: t.title, status: t.status,
    estimated_minutes: t.estimated_minutes, actual_minutes: t.actual_minutes,
  }));
  if (exp.metric_kind === 'completion_rate') {
    const denominator = tasks.length;
    const numerator = tasks.filter((t) => t.status === '완료').length;
    if (!denominator) return { ok: false, reason: '오늘 마감인 할 일이 없어요. 빠진 값 규칙대로 오늘은 기록하지 않아요.', detail };
    const tenths = roundHalfAway((numerator * 1000) / denominator);
    return { ok: true, value: fmtTenths(tenths).replace('−', '-'), numerator, denominator, detail };
  }
  if (exp.metric_kind === 'time_gap') {
    if (!tasks.length || !tasks.some((t) => t.log_count > 0)) {
      return { ok: false, reason: '오늘 마감인 할 일이 없거나 실행 기록이 없어요. 빠진 값 규칙대로 오늘은 기록하지 않아요.', detail };
    }
    const actual = tasks.reduce((a, t) => a + t.actual_minutes, 0);
    const est = tasks.reduce((a, t) => a + t.estimated_minutes, 0);
    return { ok: true, value: String(actual - est), numerator: actual, denominator: est, detail };
  }
  return { ok: true, manual: true, detail };
}

// ── 쓰기 ──────────────────────────────────────────
export function readSettings(formData) {
  const kind = String(formData.get('metric_kind') ?? '');
  if (!KINDS[kind]) return { error: '지표 종류를 골라 주세요.' };
  const v = { metric_kind: kind };
  for (const [key, label, max] of SETTING_FIELDS) {
    const s = String(formData.get(key) ?? '').trim();
    if (!s) return { error: `${label}을(를) 적어 주세요.` };
    if (s.length > max) return { error: `${label}은(는) ${max}자까지 적을 수 있어요.` };
    v[key] = s;
  }
  const th = Number(String(formData.get('outlier_threshold') ?? '').trim());
  if (!Number.isFinite(th) || th <= 0 || th > 1e8) return { error: '"튐" 기준 숫자는 0보다 큰 수로 적어 주세요.' };
  v.outlier_threshold = th;
  const ws = String(formData.get('week_start') ?? '');
  if (ws !== '월요일' && ws !== '일요일') return { error: '주 시작 요일을 골라 주세요.' };
  v.week_start = ws;
  return { value: v };
}

export async function saveSettings(uid, v) {
  await ensureSchema();
  const sql = db();
  const cols = ['metric_kind', ...SETTING_FIELDS.map(([k]) => k), 'outlier_threshold', 'week_start'];
  const row = Object.fromEntries(cols.map((c) => [c, v[c]]));
  // 1일차 기록 뒤에 고치려 하면 트리거가 막는다
  await sql`
    insert into experiments ${sql({ user_id: uid, ...row })}
    on conflict (user_id) do update set ${sql(row)}`;
}

export async function addDay(uid, { note, manualValue }) {
  await ensureSchema();
  const sql = db();
  return sql.begin(async (tx) => {
    const [exp] = await tx`select * from experiments where user_id = ${uid} for update`;
    if (!exp) throw new UserError('먼저 질문과 지표를 정해 주세요.');
    const c = await computeToday(uid, exp, tx);
    if (!c.ok) throw new UserError(c.reason);
    let value = c.value;
    if (c.manual) {
      const n = Number(manualValue);
      if (manualValue === '' || !Number.isFinite(n) || Math.abs(n) >= 1e8) throw new UserError('오늘 값을 숫자로 적어 주세요.');
      value = fmtTenths(toTenths(n)).replace('−', '-');
    }
    const [row] = await tx`
      insert into experiment_days (experiment_id, user_id, day_no, record_date, plan_rule, value, numerator, denominator, detail, note)
      values (${exp.id}, ${uid}, 0, '2000-01-01', '', ${value}, ${c.numerator ?? null}, ${c.denominator ?? null},
              ${tx.json(c.detail)}, ${note})
      returning day_no`;
    return row.day_no;
  });
}

export async function addRuleChange(uid, { afterRule, reason }) {
  await ensureSchema();
  const sql = db();
  const [exp] = await sql`select id from experiments where user_id = ${uid}`;
  if (!exp) throw new UserError('먼저 질문과 지표를 정해 주세요.');
  await sql`
    insert into experiment_rule_changes (experiment_id, user_id, day1_id, day2_id, before_rule, after_rule, reason)
    values (${exp.id}, ${uid}, 0, 0, '', ${afterRule}, ${reason})`;
}

export class UserError extends Error {}

// DB 트리거가 낸 문구(한국어)는 그대로 보여 주고, 그 밖의 오류 원문은 감춘다
export function friendlyError(e) {
  if (e instanceof UserError) return e.message;
  if (e?.code === 'P0001' && typeof e.message === 'string') return e.message;
  if (e?.code === '23505') return '오늘(서울)은 이미 기록했어요. 내일 다시 남겨 주세요.';
  console.error('days failed', e?.code ?? e?.name);
  return '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
}
