-- 과제 7 카드 5: 계정 지우기 (로그인 정보까지)
-- Supabase 대시보드 > SQL Editor 에서 한 번 실행한다. 여러 번 실행해도 된다.
--
-- 앱 전용 DB 역할(diary2_app)은 auth.users(로그인 정보)를 건드릴 권한이 없다.
-- 그래서 postgres가 주인인 함수 하나를 만들어, diary2_app에게는 "번호 하나로 계정 하나 지우기"만 허락한다.
-- 새 비밀키(service role key)를 Vercel에 두지 않아도 된다.
--
-- 앱은 이 함수를 계정 지우기 트랜잭션 안에서, 서버가 getUser()로 확인한 로그인한 사람의 번호로만 부른다 (lib/account.js).
-- auth.users 줄이 지워지면 그 계정의 세션·로그인 수단(auth.sessions, auth.identities 등)도 Supabase가 함께 지운다.

create or replace function diary2.delete_auth_user(target uuid) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = target;
  return found;
end $$;

revoke all on function diary2.delete_auth_user(uuid) from public;
grant execute on function diary2.delete_auth_user(uuid) to diary2_app;

-- 확인: delete_auth_user | postgres | t 한 줄이 나오면 된다
select p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'diary2' and p.proname = 'delete_auth_user';
