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
          <Link href="/" className="brand">플랜두씨 다이어리</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
