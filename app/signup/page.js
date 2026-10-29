import AuthForm from '@/components/AuthForm';
import { signUpAction } from '../auth-actions';

export const metadata = { title: '가입 · 플랜두씨 다이어리' };

export default function SignupPage() {
  return (
    <section className="auth-page" aria-labelledby="signup-h">
      <div className="page-head">
        <h1 id="signup-h">플랜두씨 다이어리 가입</h1>
      </div>
      <p className="muted">이메일과 비밀번호로 계정을 만들어요. 비밀번호는 Supabase Auth가 해시로 바꿔 저장하고, 이 앱의 표에는 남지 않아요.</p>
      <AuthForm mode="signup" action={signUpAction} />
    </section>
  );
}
