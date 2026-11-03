'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', '계획', (p) => p === '/' || p.startsWith('/plans')],
  ['/tasks', '할 일', (p) => p.startsWith('/tasks')],
  ['/review', '돌아보기', (p) => p.startsWith('/review')],
  ['/days', '5일 기록', (p) => p.startsWith('/days')],
];

// 위 메뉴. 지금 보고 있는 화면의 칸을 흰색으로 띄워 표시한다.
export default function NavLinks() {
  const path = usePathname() ?? '';
  return (
    <nav className="nav" aria-label="주 메뉴">
      {ITEMS.map(([href, label, on]) => (
        <Link key={href} href={href} aria-current={on(path) ? 'page' : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
