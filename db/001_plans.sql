-- 카드 1: 계획(Plan)과 수정 이력
-- plans          : 계획의 "지금 값". id는 처음 만들 때 정해지고 바뀌지 않는다.
-- plan_revisions : 계획의 모든 버전. version 1이 처음 세운 계획이다.
--                  트리거만 쓰고, 고치거나 지울 수 없다.

create table if not exists plans (
  id                bigint generated always as identity primary key,
  title             text not null check (length(trim(title)) > 0),
  area              text not null,                       -- 운동·공부·업무·게임 연습·ALEPH·생활 등
  start_date        date not null,                       -- 기간 시작
  end_date          date,                                -- 기간 끝 (null = 끝 없이 계속)
  priority          text not null check (priority in ('높음', '보통', '낮음')),
  success_criteria  text not null check (length(trim(success_criteria)) > 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  estimate_basis    text not null default 'per_day' check (estimate_basis in ('per_day', 'total')),
  change_note       text,                                -- 이 버전을 만든 이유
  version           integer not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists plan_revisions (
  id                bigint generated always as identity primary key,
  plan_id           bigint not null references plans(id) on delete restrict,
  version           integer not null,
  title             text not null,
  area              text not null,
  start_date        date not null,
  end_date          date,
  priority          text not null,
  success_criteria  text not null,
  estimated_minutes integer not null,
  estimate_basis    text not null,
  change_note       text,
  saved_at          timestamptz not null default now(),
  unique (plan_id, version)
);

-- 고칠 때: id는 그대로, version은 +1
create or replace function plans_before_update() returns trigger
language plpgsql as $$
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.version    := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

-- 만들 때와 고칠 때 모두: 그 순간의 내용을 이력에 한 줄 추가
create or replace function plans_after_write() returns trigger
language plpgsql as $$
begin
  insert into plan_revisions (plan_id, version, title, area, start_date, end_date, priority,
                              success_criteria, estimated_minutes, estimate_basis, change_note)
  values (new.id, new.version, new.title, new.area, new.start_date, new.end_date, new.priority,
          new.success_criteria, new.estimated_minutes, new.estimate_basis, new.change_note);
  return null;
end $$;

-- 이력은 쌓기만 한다
create or replace function plan_revisions_readonly() returns trigger
language plpgsql as $$
begin
  raise exception '계획 이력은 고치거나 지울 수 없습니다';
end $$;

-- 계획은 지우지 않는다 (나중에 실행 기록·돌아보기가 이 계획을 가리킨다)
create or replace function plans_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception '계획은 지울 수 없습니다';
end $$;

create or replace trigger plans_before_update before update on plans
  for each row execute function plans_before_update();

create or replace trigger plans_after_write after insert or update on plans
  for each row execute function plans_after_write();

create or replace trigger plans_no_delete before delete on plans
  for each row execute function plans_no_delete();

create or replace trigger plan_revisions_readonly before update or delete on plan_revisions
  for each row execute function plan_revisions_readonly();

-- Supabase는 public 표를 브라우저용 공개 키(anon)로도 열어 둔다.
-- RLS를 켜고 정책을 두지 않아, 서버(DATABASE_URL)로만 읽고 쓰게 한다.
alter table plans enable row level security;
alter table plan_revisions enable row level security;
