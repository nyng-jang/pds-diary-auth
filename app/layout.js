import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: '플랜두씨 다이어리',
  description: '계획 → 실제로 한 일 → 돌아보기를 잇는 다이어리',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="top">
          <Link href="/" className="brand"><span className="brand-mark">P·D·S</span>플랜두씨 다이어리</Link>
          <nav className="nav" aria-label="주 메뉴">
            <Link href="/">계획</Link>
            <Link href="/tasks">할 일</Link>
            <Link href="/review">돌아보기</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
