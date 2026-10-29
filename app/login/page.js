import AuthForm from '@/components/AuthForm';
import { signInAction } from '../auth-actions';

export const metadata = { title: '로그인 · 플랜두씨 다이어리' };

export default async function LoginPage({ searchParams }) {
  const { out } = await searchParams;
  return (
    <section className="auth-page" aria-labelledby="login-h">
      <div className="page-head">
        <h1 id="login-h">플랜두씨 다이어리</h1>
        <ol className="steps" aria-label="다이어리 흐름">
          <li data-kind="plan">계획</li>
          <li data-kind="todo">할 일</li>
          <li data-kind="see">돌아보기</li>
        </ol>
      </div>
      <p className="muted">내 계획과 기록은 로그인한 뒤에만 볼 수 있어요.</p>
      <AuthForm mode="login" action={signInAction} notice={out ? '로그아웃했어요.' : null} />
    </section>
  );
}
