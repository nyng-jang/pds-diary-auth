-- 카드 4: 돌아보기(See)에서 정한 고칠 점 한 줄 → 다음 계획
-- review_notes : 돌아보기 화면에서 정한 "고칠 점 한 가지".
--   period_from / period_to : 그때 보던 기간 (null = 처음부터 / 끝까지)
--   basis_plan_id           : 어느 계획의 숫자를 보고 정했는지 (null = 모든 계획 합계)
--   snapshot                : 정할 때 본 집계 숫자 그대로 (나중에 기록이 늘어도 그때 근거가 남는다)
--   next_plan_id            : 이 고칠 점을 넘긴 다음 계획. "새 계획으로"를 고르면 계획을 저장할 때 한 번 채운다.
-- 고칠 점은 지우거나 바꾸지 않는다. next_plan_id를 비어 있을 때 한 번 채우는 것만 된다.

create table if not exists review_notes (
  id             bigint generated always as identity primary key,
  request_key    uuid not null unique,                   -- 저장 버튼을 연달아 눌러도 한 건만
  period_from    date,
  period_to      date,
  basis_plan_id  bigint references plans(id) on delete restrict,
  lesson         text not null check (length(trim(lesson)) between 1 and 200 and lesson !~ '[\r\n]'),
  snapshot       jsonb not null,
  next_plan_id   bigint references plans(id) on delete restrict,
  carried_at     timestamptz,
  created_at     timestamptz not null default now(),
  check (period_from is null or period_to is null or period_from <= period_to),
  check ((next_plan_id is null) = (carried_at is null))
);

create index if not exists review_notes_next_plan_idx on review_notes (next_plan_id, created_at);

create or replace function review_notes_before_update() returns trigger
language plpgsql as $$
begin
  if old.next_plan_id is not null or new.next_plan_id is null
     or (new.id, new.request_key, new.period_from, new.period_to, new.basis_plan_id, new.lesson, new.snapshot, new.created_at)
        is distinct from (old.id, old.request_key, old.period_from, old.period_to, old.basis_plan_id, old.lesson, old.snapshot, old.created_at) then
    raise exception '고칠 점은 넘길 계획을 한 번 정하는 것 말고는 바꿀 수 없습니다';
  end if;
  return new;
end $$;

create or replace function review_notes_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception '고칠 점은 지울 수 없습니다';
end $$;

create or replace trigger review_notes_before_update before update on review_notes
  for each row execute function review_notes_before_update();

create or replace trigger review_notes_no_delete before delete on review_notes
  for each row execute function review_notes_no_delete();

-- 서버(DATABASE_URL)로만 읽고 쓴다
alter table review_notes enable row level security;
