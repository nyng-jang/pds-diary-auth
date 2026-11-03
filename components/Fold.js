'use client';

import { useEffect, useRef } from 'react';

// 긴 입력 칸을 접어 두는 틀. 눌러서 펼치고, 주소 끝이 #id 이면(예: 메뉴의 "계획 고치기") 저절로 펼친다.
// 자바스크립트가 없어도 details/summary라서 열고 닫을 수 있다.
export default function Fold({ id, label, defaultOpen = false, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const sync = () => {
      if (id && window.location.hash === `#${id}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: 'start' });
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [id]);
  return (
    <details ref={ref} id={id} className="fold" open={defaultOpen || undefined}>
      <summary>
        <span className="fold-open">＋ {label}</span>
        <span className="fold-close">접기</span>
      </summary>
      {children}
    </details>
  );
}
