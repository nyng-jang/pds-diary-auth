import Icon from './Icon';

// 카드 5 통과 기준(T06-C82)의 문장을 그대로 쓴다. 잠그는 기능은 7번 과제에서 붙인다.
export const PUBLIC_NOTICE = '지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요';

export default function NoLoginNotice() {
  return (
    <aside className="notice" role="note">
      <Icon name="alert" size={18} />
      <p>
        <strong>{PUBLIC_NOTICE}.</strong> 다른 사람의 이름·연락처나 민감한 일기는 잠그는 기능이 붙은 뒤에 넣어 주세요.
      </p>
    </aside>
  );
}
