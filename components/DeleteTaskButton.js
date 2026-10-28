'use client';

import { deleteTaskAction } from '@/app/actions';

export default function DeleteTaskButton({ id, title }) {
  return (
    <form
      action={deleteTaskAction}
      onSubmit={(e) => {
        if (!confirm(`할 일 #${id} "${title}"을(를) 지울까요? 지우면 되돌릴 수 없어요.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="danger">할 일 지우기</button>
    </form>
  );
}
