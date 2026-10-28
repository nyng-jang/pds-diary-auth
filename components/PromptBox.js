import Icon from './Icon';

// 프롬프트 박스 모양의 폼 틀: 연두색 상태줄(왼쪽 제목, 오른쪽 상태) 위에 흰 입력 박스.
// state: idle(입력 대기) · busy(저장 중) · error(확인 필요)
const STATE_TEXT = { idle: '입력 대기', busy: '저장 중…', error: '확인 필요' };

export default function PromptBox({ title, icon = 'sparkle', state = 'idle', stateText, headingId, children }) {
  return (
    <div className="prompt" data-state={state}>
      <div className="prompt-status">
        <span className="prompt-title">
          <Icon name={icon} size={18} className="icon spin-on-busy" />
          <h2 id={headingId}>{title}</h2>
        </span>
        <span className="prompt-state" aria-live="polite">
          <span className="dot" />{stateText ?? STATE_TEXT[state]}
        </span>
      </div>
      <div className="prompt-box">{children}</div>
    </div>
  );
}
