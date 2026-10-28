// 카드·칩에 쓰는 작은 선 아이콘. 글자색(currentColor)을 따라간다.
const PATHS = {
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  play: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5v7l5.5-3.5z',
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-4-9 3 3 5-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  alert: 'M12 3 2 20h20zm0 6v5m0 3h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2',
  folder: 'M3 6h6l2 2h10v11H3z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  chevron: 'M6 9l6 6 6-6',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-12v4l2 2M9 2h6',
  note: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
};

export default function Icon({ name, size = 16, className = 'icon' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
