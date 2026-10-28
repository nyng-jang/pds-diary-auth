import { setTaskStatusAction } from '@/app/actions';
import Icon from './Icon';

// 진행 중이면 "완료로", 완료면 "진행 중으로 되돌리기" 버튼이 된다.
// 완료 폼에는 화면을 그릴 때마다 새 요청 키를 넣는다. 버튼을 연달아 눌러도 같은 키가 가서
// 데이터베이스가 완료를 한 번만 받는다 (db/003_logs.sql). 그래서 버튼을 잠그지 않는다.
export default function TaskStatusButton({ task, back }) {
  const done = task.status === '완료';
  return (
    <form action={setTaskStatusAction} className="status-form">
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={done ? '진행 중' : '완료'} />
      {!done && <input type="hidden" name="request_key" value={crypto.randomUUID()} />}
      {back && <input type="hidden" name="back" value={back} />}
      <button type="submit" className="wide-btn">
        <Icon name={done ? 'history' : 'check'} />
        {done ? '진행 중으로 되돌리기' : '완료로 바꾸기'}
      </button>
    </form>
  );
}
