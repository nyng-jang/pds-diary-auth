import { setTaskStatusAction } from '@/app/actions';
import Icon from './Icon';

// 진행 중이면 "완료로", 완료면 "진행 중으로 되돌리기" 버튼이 된다.
export default function TaskStatusButton({ task, back }) {
  const done = task.status === '완료';
  return (
    <form action={setTaskStatusAction} className="status-form">
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={done ? '진행 중' : '완료'} />
      {back && <input type="hidden" name="back" value={back} />}
      <button type="submit" className="wide-btn">
        <Icon name={done ? 'history' : 'check'} />
        {done ? '진행 중으로 되돌리기' : '완료로 바꾸기'}
      </button>
    </form>
  );
}
