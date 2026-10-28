import Link from 'next/link';
import Icon from './Icon';

// 워크플로 카드: 위에 작은 색 라벨 탭, 그 아래 흰 카드(아이콘+제목+⋯ 메뉴, 칩, 아래 메타 칩).
// kind: plan(노랑) · todo(파랑) · done(초록) · do(보라, 실행 기록)
const TABS = {
  plan: { icon: 'bolt', text: '계획' },
  todo: { icon: 'play', text: '할 일' },
  done: { icon: 'check', text: '완료' },
  do: { icon: 'clock', text: '실제로 한 일' },
};

export default function FlowCard({ kind, tab, icon, title, href, titleAs: H = 'h2', menu, children, meta, className = '', ...rest }) {
  const t = TABS[kind];
  return (
    <article className={`flow ${className}`} data-kind={kind} {...rest}>
      <span className="flow-tab"><Icon name={t.icon} size={12} />{tab ?? t.text}</span>
      <div className="flow-card">
        <div className="flow-title">
          {icon && <Icon name={icon} />}
          <H>{href ? <Link href={href}>{title}</Link> : title}</H>
          {menu?.length > 0 && (
            <details className="menu">
              <summary aria-label="메뉴 열기"><Icon name="more" size={18} /></summary>
              <div className="menu-list">
                {menu.map((m) => <Link key={m.href} href={m.href}>{m.label}</Link>)}
              </div>
            </details>
          )}
        </div>
        {children}
        {meta && <div className="flow-meta">{meta}</div>}
      </div>
    </article>
  );
}

// 회색 알약 칩. tone: warn(빨강) · soon(주황) · ok(초록)
export function Chip({ icon, tone, href, children, title }) {
  const cls = `chip${tone ? ` chip-${tone}` : ''}`;
  const body = <>{icon && <Icon name={icon} size={14} />}{children}</>;
  return href ? <Link href={href} className={cls} title={title}>{body}</Link> : <span className={cls} title={title}>{body}</span>;
}

// 카드 아래쪽 작은 테두리 칩 (번호·버전 같은 부가 정보)
export function Meta({ icon, children }) {
  return <span className="meta">{icon && <Icon name={icon} size={12} />}{children}</span>;
}
