# 플랜두씨 다이어리

계획(Plan) → 실제로 한 일(Do) → 돌아보기(See)를 하나로 잇는 다이어리입니다.

> 아직 로그인이 없습니다. 주소를 아는 사람은 누구나 보고 고칠 수 있으니 남이 봐도 괜찮은 내용만 넣습니다.

## 카드 1 — 계획과 수정 이력

| 표 | 하는 일 |
|---|---|
| `plans` | 계획의 지금 값. `id`는 처음 만들 때 정해지고 바뀌지 않습니다. |
| `plan_revisions` | 계획의 모든 버전. `version 1`이 처음 세운 계획입니다. 쌓기만 하고 고치거나 지울 수 없습니다. |

계획 항목: 이름 · 분야 · 기간(시작/끝) · 우선순위(높음/보통/낮음) · 성공 기준 · 예상 시간(분, 하루 기준 또는 기간 전체 기준).

이력은 앱 코드가 아니라 DB 트리거가 남깁니다 (`db/001_plans.sql`).
계획을 만들거나 고치면 그 순간의 내용이 `plan_revisions`에 한 줄 추가되고, 고칠 때는 `version`만 1 오릅니다.
그래서 SQL로 직접 고쳐도 이력이 빠지지 않습니다.

## 실행

```bash
cp .env.example .env.local   # DATABASE_URL 채우기
npm install
npm run dev
```

표가 없으면 첫 요청 때 `db/001_plans.sql`을 한 번 적용합니다. 직접 적용하려면 `npm run db:migrate`.

## 배포 (Vercel + Supabase)

1. Vercel에서 이 저장소를 Import 합니다.
2. Vercel 프로젝트 > Storage 에서 Supabase를 연결하거나, Supabase 프로젝트의
   Connection string(Transaction pooler, 6543)을 `DATABASE_URL` 환경 변수로 넣습니다.
3. 다시 배포합니다.

`DATABASE_URL`은 서버에서만 씁니다. 브라우저로 내려가지 않고, 두 표에는 RLS를 켜 두어 Supabase 공개 키로는 읽거나 쓸 수 없습니다.
