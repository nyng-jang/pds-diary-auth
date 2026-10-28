-- 카드 3: 실제로 한 일(Do)
-- task_logs        : 실행 기록. 언제 시작해 언제 끝났고, 실제로 몇 분 걸렸고, 어디서 막혔는지.
--                    할 일(tasks)·계획(plans)과 다른 표라서, 기록을 남겨도 원래 계획 값은 그대로다.
--                    한 번 남긴 기록은 고칠 수 없다(쌓기만). 할 일을 지우면 그 기록도 함께 지워진다.
-- task_completions : 완료 기록. 돌아보기의 "완료 수"는 이 표에서 센다.
--
-- 같은 완료가 두 번 쌓이지 않게 데이터베이스가 막는다 (버튼 잠금에 기대지 않는다).
--  1) request_key unique : 화면을 그릴 때마다 새 키를 폼에 넣는다. 같은 버튼을 연달아 눌러
--                          같은 요청이 두 번 와도 키가 같아서 두 번째는 들어가지 않는다.
--  2) 할 일마다 "아직 되돌리지 않은 완료"는 하나만 (부분 unique 인덱스) : 다른 탭에서 눌러
--                          키가 달라도, 이미 완료된 할 일에는 완료가 하나 더 생기지 않는다.
-- 진행 중으로 되돌리면 그 완료 기록에 reopened_at만 적는다(지우지 않음).

create table if not exists task_logs (
  id             bigint generated always as identity primary key,
  task_id        bigint not null references tasks(id) on delete cascade,
  request_key    uuid not null unique,
  started_at     timestamptz not null,                  -- 시작 시각
  ended_at       timestamptz not null,                  -- 끝난 시각
  actual_minutes integer not null,                      -- 실제로 걸린 시간 (쉰 시간을 빼면 시작~끝보다 짧을 수 있다)
  blocker        text not null default '' check (length(blocker) <= 500),  -- 막혔던 이유 ('' = 막힌 곳 없음)
  created_at     timestamptz not null default now(),
  check (ended_at > started_at),
  check (ended_at - started_at <= interval '24 hours'),
  check (actual_minutes >= 1 and actual_minutes <= ceil(extract(epoch from (ended_at - started_at)) / 60))
);

create index if not exists task_logs_task_id_idx on task_logs (task_id, started_at);

create table if not exists task_completions (
  id           bigint generated always as identity primary key,
  task_id      bigint not null references tasks(id) on delete cascade,
  request_key  uuid not null unique,
  completed_at timestamptz not null default now(),
  reopened_at  timestamptz,                              -- 진행 중으로 되돌린 시각 (null = 지금도 완료)
  check (reopened_at is null or reopened_at >= completed_at)
);

create unique index if not exists task_completions_one_open
  on task_completions (task_id) where reopened_at is null;

-- 실행 기록은 고칠 수 없다
create or replace function task_logs_no_update() returns trigger
language plpgsql as $$
begin
  raise exception '실행 기록은 고칠 수 없습니다';
end $$;

create or replace trigger task_logs_no_update before update on task_logs
  for each row execute function task_logs_no_update();

-- 완료 기록은 reopened_at을 한 번 적는 것 말고는 고칠 수 없다
create or replace function task_completions_before_update() returns trigger
language plpgsql as $$
begin
  if old.reopened_at is not null or new.reopened_at is null
     or (new.id, new.task_id, new.request_key, new.completed_at)
        is distinct from (old.id, old.task_id, old.request_key, old.completed_at) then
    raise exception '완료 기록은 되돌린 시각만 한 번 적을 수 있습니다';
  end if;
  return new;
end $$;

create or replace trigger task_completions_before_update before update on task_completions
  for each row execute function task_completions_before_update();

-- 카드 2에서 이미 완료한 할 일도 완료 기록을 하나씩 갖게 한다 (여러 번 적용해도 한 번만 들어간다)
insert into task_completions (task_id, request_key, completed_at)
select t.id, gen_random_uuid(), t.completed_at
from tasks t
where t.status = '완료'
  and not exists (select 1 from task_completions c where c.task_id = t.id and c.reopened_at is null);

-- 서버(DATABASE_URL)로만 읽고 쓴다
alter table task_logs enable row level security;
alter table task_completions enable row level security;
