---
name: verify
description: 마음 일기 프로젝트의 변경 사항을 검증한다. 타입 체크, ESLint, 프로덕션 빌드, API 통합 점검(scripts/e2e.mjs)을 차례로 실행한다. 기능을 고친 뒤나 작업을 마무리하기 전에 사용한다.
---

아래 순서대로 실행하고, 실패하면 거기서 멈추고 원인을 고친 뒤 다시 실행한다. 결과는 단계별 통과/실패와 실패 출력으로 보고한다.

1. `npm run typecheck` — `tsc`만 단독으로 실행하지 않는다 (라우트 타입은 typegen으로 생성됨).
2. `npm run lint`
3. `npm run build` — Cache Components 위반(Suspense 밖에서 cookies/DB 읽기)은 여기서 드러난다.
4. API 통합 점검 (DB와 개발 서버가 필요하다):
   - DB 확인: `npx prisma migrate status`. 연결이 실패하면 `npx prisma dev --name ai-diary --detach`로 띄운다. 출력된 포트가 `.env`의 `DATABASE_URL`과 다르면 고친다 (DB 이름은 `postgres`). 그다음 `npx prisma migrate dev`를 실행한다.
   - 개발 서버를 백그라운드로 띄운다: `npx next dev --port 3100` (PowerShell에서 `npm run dev -- --port`는 동작하지 않는다).
   - `npm run e2e`를 실행한다. 모든 줄이 PASS여야 한다.
   - 끝나면 개발 서버를 종료한다.

`ANTHROPIC_API_KEY`가 비어 있으면 "create diary"의 `analysis=null`은 정상이다 (분석 실패 경로를 검증하는 것). 키가 있는데도 `analysis=null`이면 개발 서버 로그의 `[analysis] 분석 실패` 줄을 확인한다.

화면 디자인이나 애니메이션은 이 점검으로 확인되지 않는다. UI를 바꿨다면 브라우저로 직접 확인했는지 여부를 보고에 분명히 적는다.
