import Link from 'next/link';
export default function NotFound() {
  return (<><h1>계획을 찾을 수 없어요</h1><p><Link href="/">내 계획으로 돌아가기</Link></p></>);
}
