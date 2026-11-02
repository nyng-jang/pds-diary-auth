import PasswordForm from '@/components/PasswordForm';
import { requireUser } from '@/lib/auth';

export const metadata = { title: '비밀번호 바꾸기 · 플랜두씨 다이어리' };

export default async function PasswordPage() {
  const user = await requireUser();
  return (
    <section className="auth-page" aria-labelledby="pw-h">
      <div className="page-head">
        <h1 id="pw-h">비밀번호 바꾸기</h1>
      </div>
      <p className="muted">
        <strong>{user.email}</strong> 계정의 비밀번호를 바꿔요. 바꾸면 <strong>이 브라우저를 뺀 다른 곳의 로그인은 모두 끊겨요.</strong>
      </p>
      <PasswordForm />
    </section>
  );
}
