-- 카드 2: 계획에 딸린 할 일
-- 할 일은 반드시 계획 하나에 속한다. 계획은 지울 수 없으니 할 일이 주인 없이 남지 않는다.
-- status : '진행 중' ↔ '완료' 를 오갈 수 있다. 완료로 바꾼 시각은 completed_at 에 남긴다.

create table if not exists tasks (
  id                bigint generated always as identity primary key,
  plan_id           bigint not null references plans(id) on delete restrict,
  title             text not null check (length(trim(title)) between 1 and 100),
  note              text not null default '' check (length(note) <= 500),
  due_date          date,                                -- 마감일 (null = 마감 없음)
  priority          text not null check (priority in ('높음', '보통', '낮음')),
  tags              text[] not null default '{}' check (cardinality(tags) <= 10),
  estimated_minutes integer not null check (estimated_minutes between 1 and 10000),
  status            text not null default '진행 중' check (status in ('진행 중', '완료')),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((status = '완료') = (completed_at is not null))
);

create index if not exists tasks_plan_id_idx on tasks (plan_id);
create index if not exists tasks_tags_idx on tasks using gin (tags);

create or replace function tasks_before_update() returns trigger
language plpgsql as $$
begin
  new.id         := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

create or replace trigger tasks_before_update before update on tasks
  for each row execute function tasks_before_update();

-- 서버(DATABASE_URL)로만 읽고 쓴다
alter table tasks enable row level security;
