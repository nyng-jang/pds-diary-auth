-- 과제 7 카드 1: 자료마다 주인(로그인한 사람)을 붙인다.
-- user_id : Supabase Auth의 사용자 번호(auth.users.id). 모든 표에서 반드시 채워야 한다.
--
-- 주인이 엇갈리지 않게 데이터베이스가 막는다.
--  - 할 일은 "같은 주인의" 계획에만 붙는다: (plan_id, user_id) → plans(id, user_id)
--  - 실행 기록·완료 기록은 같은 주인의 할 일에만: (task_id, user_id) → tasks(id, user_id)
--  - 고칠 점의 근거 계획·넘길 계획도 같은 주인의 계획만
--  - 계획 이력은 트리거가 계획의 주인을 그대로 옮겨 적는다
-- 화면·Server Action의 모든 SQL은 "user_id = 로그인한 사람" 조건을 함께 건다 (lib/*.js).
--
-- 이 파일은 빈 DB에 처음 적용한다고 보고 not null로 바로 만든다.

alter table plans          add column if not exists user_id uuid not null references auth.users(id);
alter table plan_revisions add column if not exists user_id uuid not null references auth.users(id);
alter table tasks          add column if not exists user_id uuid not null references auth.users(id);
alter table task_logs      add column if not exists user_id uuid not null references auth.users(id);
alter table task_completions add column if not exists user_id uuid not null references auth.users(id);
alter table review_notes   add column if not exists user_id uuid not null references auth.users(id);

create index if not exists plans_user_idx on plans (user_id, id);
create index if not exists tasks_user_idx on tasks (user_id, id);
create index if not exists task_logs_user_idx on task_logs (user_id);
create index if not exists task_completions_user_idx on task_completions (user_id);
create index if not exists review_notes_user_idx on review_notes (user_id, created_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plans_id_user_key') then
    alter table plans add constraint plans_id_user_key unique (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_id_user_key') then
    alter table tasks add constraint tasks_id_user_key unique (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_plan_owner_fkey') then
    alter table tasks add constraint tasks_plan_owner_fkey
      foreign key (plan_id, user_id) references plans (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'plan_revisions_owner_fkey') then
    alter table plan_revisions add constraint plan_revisions_owner_fkey
      foreign key (plan_id, user_id) references plans (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'task_logs_owner_fkey') then
    alter table task_logs add constraint task_logs_owner_fkey
      foreign key (task_id, user_id) references tasks (id, user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'task_completions_owner_fkey') then
    alter table task_completions add constraint task_completions_owner_fkey
      foreign key (task_id, user_id) references tasks (id, user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'review_notes_basis_owner_fkey') then
    alter table review_notes add constraint review_notes_basis_owner_fkey
      foreign key (basis_plan_id, user_id) references plans (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'review_notes_next_owner_fkey') then
    alter table review_notes add constraint review_notes_next_owner_fkey
      foreign key (next_plan_id, user_id) references plans (id, user_id);
  end if;
end $$;

-- 계획을 만들거나 고칠 때 이력에 주인도 함께 적는다 (001_plans.sql의 함수를 바꾼다)
create or replace function plans_after_write() returns trigger
language plpgsql as $$
begin
  insert into plan_revisions (plan_id, user_id, version, title, area, start_date, end_date, priority,
                              success_criteria, estimated_minutes, estimate_basis, change_note)
  values (new.id, new.user_id, new.version, new.title, new.area, new.start_date, new.end_date, new.priority,
          new.success_criteria, new.estimated_minutes, new.estimate_basis, new.change_note);
  return null;
end $$;

-- 주인은 바꿀 수 없다
create or replace function plans_before_update() returns trigger
language plpgsql as $$
begin
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.version    := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

create or replace function tasks_before_update() returns trigger
language plpgsql as $$
begin
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

-- 완료 기록·고칠 점도 주인을 바꿀 수 없게 비교 칸에 user_id를 더한다 (003·004의 함수를 바꾼다)
create or replace function task_completions_before_update() returns trigger
language plpgsql as $$
begin
  if old.reopened_at is not null or new.reopened_at is null
     or (new.id, new.task_id, new.user_id, new.request_key, new.completed_at)
        is distinct from (old.id, old.task_id, old.user_id, old.request_key, old.completed_at) then
    raise exception '완료 기록은 되돌린 시각만 한 번 적을 수 있습니다';
  end if;
  return new;
end $$;

create or replace function review_notes_before_update() returns trigger
language plpgsql as $$
begin
  if old.next_plan_id is not null or new.next_plan_id is null
     or (new.id, new.user_id, new.request_key, new.period_from, new.period_to, new.basis_plan_id, new.lesson, new.snapshot, new.created_at)
        is distinct from (old.id, old.user_id, old.request_key, old.period_from, old.period_to, old.basis_plan_id, old.lesson, old.snapshot, old.created_at) then
    raise exception '고칠 점은 넘길 계획을 한 번 정하는 것 말고는 바꿀 수 없습니다';
  end if;
  return new;
end $$;
