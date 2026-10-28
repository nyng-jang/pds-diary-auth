'use client';

export default function Error() {
  return (
    <>
      <h1>잠시 문제가 생겼어요</h1>
      <p>데이터베이스에 연결하지 못했을 수 있어요. <a href="/api/health">연결 상태 확인</a></p>
    </>
  );
}
