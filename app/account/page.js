import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { DeleteAccountForm } from '@/components/DaysForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: '내 계정 · 플랜두씨 다이어리' };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <section className="auth-page" aria-labelledby="acc-h">
      <div className="page-head">
        <h1 id="acc-h">내 계정</h1>
      </div>
      <p className="muted"><strong>{user.email}</strong> 으로 로그인해 있어요.</p>

      <section className="export" aria-labelledby="exp-h">
        <h2 id="exp-h">내 자료 전체 내보내기</h2>
        <p className="muted">
          계획·수정 이력·할 일·실행 기록·완료 기록·고칠 점·5일 기록(설정·날마다 기록·규칙 변경)을 JSON 파일 하나로 내려받아요.
          내 계정의 자료만 들어가요. 시각은 한국 시간(+09:00), 시간은 분 단위예요.
        </p>
        <a className="export-link" href="/api/export" download>내 자료 전체 내려받기 (.json)</a>
      </section>

      <section aria-labelledby="pw-link-h">
        <h2 id="pw-link-h">비밀번호</h2>
        <p className="muted"><Link href="/account/password">비밀번호 바꾸기</Link> — 바꾸면 다른 곳의 로그인은 모두 끊겨요.</p>
      </section>

      <section className="danger-zone" aria-labelledby="del-h">
        <h2 id="del-h">계정 지우기</h2>
        <p data-testid="delete-notice">
          <strong>계정을 지우면 내 자료도 모두 함께 지워져요.</strong> 계획·수정 이력·할 일·실행 기록·완료 기록·고칠 점·5일 기록과
          로그인 정보(이메일·비밀번호)가 한 번에 지워지고 되돌릴 수 없어요. 하나라도 지우지 못하면 아무것도 지우지 않아요.
          필요하면 먼저 위에서 내 자료를 내려받아 두세요.
        </p>
        <DeleteAccountForm />
      </section>
    </section>
  );
}
