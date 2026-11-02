-- 과제 7 카드 5: 잠긴 앱으로 5일 써 보기, 그리고 계정 지우기
--
-- experiments              : 1일차에 정한 질문·지표·단위·계산 규칙·계획 규칙. 계정마다 하나.
--                            1일차 기록을 남긴 뒤에는 고칠 수 없다 (같은 규칙으로 5일을 비교하려고).
-- experiment_days          : 날마다 한 줄. 1~5일차. 날짜는 DB가 "기록한 순간의 서울 날짜"로 정한다
--                            (앱이 보낸 날짜를 믿지 않음 → 지난 날짜로 몰아서 적을 수 없다). 고치거나 지울 수 없다.
-- experiment_rule_changes  : 계획 규칙을 바꾼 기록. 계정마다 한 번. 2일차 기록이 있고 3일차 기록이 없을 때만 들어가고,
--                            1일차·2일차 기록 번호를 함께 적는다. 3일차 기록은 이 기록이 있어야 들어간다.
-- 모든 순서는 앱이 아니라 아래 트리거가 지킨다.
--
-- 계정 지우기: 지울 수 없게 막아 둔 표(계획·계획 이력·고칠 점·5일 기록)도, 계정을 지우는 트랜잭션 안에서
-- `set local diary.account_delete = 'on'` 을 켠 때만 지울 수 있게 한다 (lib/account.js).

create table if not exists experiments (
  id                bigint generated always as identity primary key,
  user_id           uuid not null unique,
  metric_kind       text not null check (metric_kind in ('completion_rate', 'time_gap', 'manual')),
  question          text not null check (length(trim(question)) between 1 and 300),
  metric_name       text not null check (length(trim(metric_name)) between 1 and 100),
  unit              text not null check (length(trim(unit)) between 1 and 20),
  calc_rule         text not null check (length(trim(calc_rule)) between 1 and 500),
  missing_rule      text not null check (length(trim(missing_rule)) between 1 and 300),
  duplicate_rule    text not null check (length(trim(duplicate_rule)) between 1 and 300),
  outlier_rule      text not null check (length(trim(outlier_rule)) between 1 and 300),
  outlier_threshold numeric(10,1) not null check (outlier_threshold > 0),
  rounding_rule     text not null check (length(trim(rounding_rule)) between 1 and 300),
  week_start        text not null check (week_start in ('월요일', '일요일')),
  plan_rule         text not null check (length(trim(plan_rule)) between 1 and 300),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists experiment_days (
  id            bigint generated always as identity primary key,
  experiment_id bigint not null,
  user_id       uuid not null,
  day_no        integer not null check (day_no between 1 and 5),
  record_date   date not null,                 -- 서울 날짜. 트리거가 정한다
  plan_rule     text not null,                 -- 이날 따른 계획 규칙. 트리거가 정한다
  value         numeric(10,1) not null,        -- 지표 값 (단위는 experiments.unit)
  numerator     integer,                       -- 완료율일 때: 끝낸 할 일 수
  denominator   integer,                       -- 완료율일 때: 그날 마감인 할 일 수
  detail        jsonb not null default '[]',   -- 값을 계산할 때 쓴 할 일 목록 (손으로 다시 셀 수 있게)
  note          text not null default '' check (length(note) <= 500),
  created_at    timestamptz not null default now(),
  foreign key (experiment_id, user_id) references experiments (id, user_id),
  unique (experiment_id, day_no),
  unique (experiment_id, record_date),
  unique (id, experiment_id)
);

create table if not exists experiment_rule_changes (
  id            bigint generated always as identity primary key,
  experiment_id bigint not null unique,        -- 규칙은 한 번만 바꾼다
  user_id       uuid not null,
  day1_id       bigint not null,               -- 바꾸기 전 1일차 기록
  day2_id       bigint not null,               -- 바꾸기 전 2일차 기록 (이 기록 바로 뒤에 놓인다)
  before_rule   text not null,
  after_rule    text not null check (length(trim(after_rule)) between 1 and 300),
  reason        text not null check (length(trim(reason)) between 1 and 500),
  changed_at    timestamptz not null default now(),
  foreign key (experiment_id, user_id) references experiments (id, user_id),
  foreign key (day1_id, experiment_id) references experiment_days (id, experiment_id),
  foreign key (day2_id, experiment_id) references experiment_days (id, experiment_id)
);

-- 설정: 1일차 기록 전에만 고칠 수 있다. 주인·번호·만든 시각은 바뀌지 않는다.
create or replace function experiments_before_update() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from experiment_days d where d.experiment_id = old.id) then
    raise exception '1일차 기록을 남긴 뒤에는 질문·지표·규칙을 고칠 수 없습니다';
  end if;
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

create or replace function experiment_days_before_insert() returns trigger
language plpgsql as $$
declare
  e    experiments;
  n    integer;
  last_date date;
  ch   experiment_rule_changes;
begin
  -- 같은 계정의 기록이 동시에 들어와도 차례대로 처리되게 설정 줄을 잠근다
  select * into e from experiments where id = new.experiment_id and user_id = new.user_id for update;
  if not found then raise exception '먼저 질문과 지표를 정해 주세요'; end if;
  select count(*), max(record_date) into n, last_date from experiment_days where experiment_id = e.id;
  if n >= 5 then raise exception '5일 기록을 모두 남겼습니다'; end if;
  new.day_no      := n + 1;
  new.record_date := (now() at time zone 'Asia/Seoul')::date;
  new.created_at  := now();
  if last_date is not null and new.record_date <= last_date then
    raise exception '오늘(서울)은 이미 기록했습니다. 내일 다시 남겨 주세요';
  end if;
  select * into ch from experiment_rule_changes where experiment_id = e.id;
  if new.day_no >= 3 and ch.id is null then
    raise exception '3일차를 남기기 전에 계획 규칙을 먼저 하나 바꿔 주세요';
  end if;
  new.plan_rule := case when ch.id is null then e.plan_rule else ch.after_rule end;
  return new;
end $$;

create or replace function experiment_rule_changes_before_insert() returns trigger
language plpgsql as $$
declare
  e  experiments;
  n  integer;
begin
  select * into e from experiments where id = new.experiment_id and user_id = new.user_id for update;
  if not found then raise exception '먼저 질문과 지표를 정해 주세요'; end if;
  select count(*) into n from experiment_days where experiment_id = e.id;
  if n <> 2 then
    raise exception '계획 규칙은 2일차 기록 뒤, 3일차 기록 앞에만 바꿀 수 있습니다 (지금 기록 %일)', n;
  end if;
  select id into new.day1_id from experiment_days where experiment_id = e.id and day_no = 1;
  select id into new.day2_id from experiment_days where experiment_id = e.id and day_no = 2;
  if trim(new.after_rule) = trim(e.plan_rule) then
    raise exception '지금 규칙과 다른 규칙을 적어 주세요';
  end if;
  new.before_rule := e.plan_rule;
  new.changed_at  := now();
  return new;
end $$;

-- 고치거나 지울 수 없다. 계정을 지우는 트랜잭션에서만 지울 수 있다.
create or replace function diary_append_only() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('diary.account_delete', true) = 'on' then
    return old;
  end if;
  raise exception '% 기록은 고치거나 지울 수 없습니다', tg_table_name;
end $$;

create or replace function experiments_before_delete() returns trigger
language plpgsql as $$
begin
  if current_setting('diary.account_delete', true) = 'on' then return old; end if;
  raise exception '질문·지표 설정은 지울 수 없습니다';
end $$;

create or replace trigger experiments_before_update before update on experiments
  for each row execute function experiments_before_update();
create or replace trigger experiments_before_delete before delete on experiments
  for each row execute function experiments_before_delete();
create or replace trigger experiment_days_before_insert before insert on experiment_days
  for each row execute function experiment_days_before_insert();
create or replace trigger experiment_days_append_only before update or delete on experiment_days
  for each row execute function diary_append_only();
create or replace trigger experiment_rule_changes_before_insert before insert on experiment_rule_changes
  for each row execute function experiment_rule_changes_before_insert();
create or replace trigger experiment_rule_changes_append_only before update or delete on experiment_rule_changes
  for each row execute function diary_append_only();

alter table experiments enable row level security;
alter table experiment_days enable row level security;
alter table experiment_rule_changes enable row level security;

-- 계정 지우기 때만 계획·계획 이력·고칠 점을 지울 수 있게 (001·004의 함수를 바꾼다)
create or replace function plans_no_delete() returns trigger
language plpgsql as $$
begin
  if current_setting('diary.account_delete', true) = 'on' then return old; end if;
  raise exception '계획은 지울 수 없습니다';
end $$;

create or replace function plan_revisions_readonly() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('diary.account_delete', true) = 'on' then return old; end if;
  raise exception '계획 이력은 고치거나 지울 수 없습니다';
end $$;

create or replace function review_notes_no_delete() returns trigger
language plpgsql as $$
begin
  if current_setting('diary.account_delete', true) = 'on' then return old; end if;
  raise exception '고칠 점은 지울 수 없습니다';
end $$;
