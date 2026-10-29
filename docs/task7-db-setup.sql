-- 과제 7 DB 준비 (과제 6과 같은 Supabase 프로젝트를 나눠 쓴다)
-- Supabase 대시보드 > SQL Editor 에서 한 번 실행한다.
--
-- 과제 6 사이트는 public 스키마의 표를 postgres 역할로 쓴다. 과제 7은 따로 만든 역할 diary2_app으로
-- 접속하고, 이 역할의 기본 스키마를 diary2로 정해 두어 같은 이름의 표(plans 등)를 diary2 안에 따로 만든다.
--  - 과제 6의 public 표에는 diary2_app 권한이 없어 읽거나 바꿀 수 없다.
--  - diary2는 Supabase API(PostgREST)에 공개된 스키마가 아니라 공개 키로는 닿지 않는다.
--  - 표는 앱이 첫 요청 때 db/*.sql로 diary2 안에 만든다 (lib/db.js ensureSchema).
--
-- 아래 '여기에-새-비밀번호' 를 직접 정한 긴 비밀번호로 바꾼 뒤 실행한다. 이 비밀번호는 어디에도 적어 두지 말고
-- Vercel 환경 변수 DATABASE_URL 에만 넣는다.

-- 여러 번 실행해도 된다 (역할이 이미 있으면 비밀번호만 다시 정한다)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'diary2_app') then
    create role diary2_app login noinherit;
  end if;
end $$;
alter role diary2_app password '여기에-새-비밀번호';
-- Postgres 16부터는 스키마 주인을 남으로 정하려면 그 역할로 SET ROLE 할 수 있어야 해서, postgres에 역할을 붙인다
grant diary2_app to postgres;
create schema if not exists diary2 authorization diary2_app;
alter role diary2_app set search_path = diary2;

-- 확인: diary2 | diary2_app 한 줄이 나오면 된다
select nspname, pg_get_userbyid(nspowner) from pg_namespace where nspname = 'diary2';
