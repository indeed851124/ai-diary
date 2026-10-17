# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

설계 문서: `documents/plan.md`. 맨 앞의 "구현하면서 달라진 점" 표가 본문보다 우선한다.

## 언어
- 코드 주석, 화면 문구, 에러 메시지, 커밋 메시지는 모두 한국어로 쓴다. 사용자 문구는 다정한 존댓말("~해요")로 쓴다.

## 명령
- 타입 체크는 `npm run typecheck`로 한다 (`next typegen && tsc --noEmit`). `PageProps`, `LayoutProps`, `RouteContext` 전역 타입이 typegen으로 생성되므로 `tsc`만 단독으로 돌리면 실패한다.
- PowerShell에서 `npm run dev -- --port 3100`을 쓰면 `--`가 사라져 실패한다. 대신 `npx next dev --port 3100`을 쓴다.
- 전체 검증은 `/verify` 스킬로 한다.

## Next.js 16 (Cache Components 켜짐)
- `cookies()`, 세션, DB를 읽는 서버 컴포넌트는 반드시 `<Suspense>` 안에 둔다. 그렇지 않으면 빌드 에러가 난다. 페이지 최상단에서 `await`하지 말고 Suspense 안의 하위 async 컴포넌트로 내린다 (`src/app/page.tsx`의 `RecentDiaries` 패턴).
- 동적 라우트의 `params`도 런타임 데이터다. `params.then(...)`을 Suspense 안에서 쓴다 (`src/app/diary/[id]/page.tsx`).
- Middleware 대신 `src/proxy.ts`를 쓴다. 쿠키가 있는지만 보는 낙관적 검사다. `/login`에서 `/`로 되돌리는 리다이렉트를 넣으면, 만료된 쿠키가 있을 때 리다이렉트가 무한 반복되므로 넣지 않는다.
- 페이지 간 공유 요소 애니메이션은 motion의 `layoutId`가 아니라 React `<ViewTransition name share="morph" default="none">`으로 한다.

## 인증과 데이터 접근
- 인증은 Auth.js가 아니라 직접 구현했다: `src/lib/session.ts`(jose JWT, httpOnly 쿠키 `diary_session`), `src/lib/auth.ts`(`getUser`는 Route Handler용, `requireUser`는 페이지용).
- 일기 조회는 항상 `src/lib/diaries.ts`를 거치고 `where`에 `userId`를 넣는다. 다른 사람의 일기는 404로 처리한다. Route Handler마다 세션을 다시 확인한다.

## Prisma 7 / DB (운영은 Supabase)
- 클라이언트는 `@/generated/prisma/client`에서 import한다 (`src/generated/`는 gitignore 대상이며 `postinstall`에서 생성된다). 연결은 `@prisma/adapter-pg` 드라이버 어댑터를 쓰고, 풀 설정은 `src/lib/db-config.ts`의 `getPoolConfig()` 한 곳에서만 만든다.
- 연결은 두 개로 나뉜다. 앱(런타임)은 `DATABASE_URL`(Supabase Transaction pooler, 6543)을 쓰고, CLI(`prisma7.config.ts`)는 `DIRECT_URL`(Session pooler, 5432)이 있으면 그것을 쓴다. CLI 설정 파일 이름은 `prisma.config.ts`가 아니라 `prisma7.config.ts`다.
- Supabase SSL은 `DATABASE_SSL_CA`(CA 파일 경로 또는 PEM)로 검증한다. `rejectUnauthorized: false`로 검증을 끄지 말 것. CA가 있으면 URL의 `sslmode`는 코드에서 지운다 (pg에서는 URL의 sslmode가 ssl 객체 설정을 덮어쓰기 때문).
- Supabase에 마이그레이션을 적용할 때는 `npm run db:deploy`를 쓴다 (`db:migrate`는 shadow DB를 쓰는 개발용). 연결 확인은 `npm run db:check`.
- 로컬 DB는 Docker가 아니라 `npx prisma dev --name ai-diary --detach`로 띄운다. 재시작하면 포트가 바뀔 수 있으니, 연결이 실패하면 출력된 주소로 `.env`의 `DATABASE_URL`을 고친다 (DB 이름은 `postgres`).
- `npx prisma init`은 `.claude/skills` 등에 에이전트 스킬을 몰래 설치하므로 다시 실행하지 않는다.

## Claude API (`src/lib/claude.ts`)
- 모델은 `claude-opus-5-5`, `client.beta.messages.parse` + `betaZodOutputFormat(analysisSchema)` 구조화 출력, `fallbacks: "default"`(beta `server-side-fallback-2026-07-01`)를 쓴다. 응답 스키마를 바꿀 때는 `src/lib/validators.ts`의 `analysisSchema`와 Prisma `Analysis` 모델을 함께 고친다.
- Anthropic 클라이언트는 처음 호출할 때 만든다. 모듈 최상단에서 만들면 API 키가 없을 때 import 단계에서 터져 일기 저장까지 실패한다.
- 분석이 실패해도 일기는 먼저 저장하고, 분석만 `null`로 둔다 (`analyzeAndSave`).
- 시스템 프롬프트에 있는 자해·자살 표현 대응(109 안내)은 지우지 않는다.

## 디자인
- 화면이나 애니메이션을 고칠 때는 `ui-design` 스킬의 규칙을 따른다. 색과 폰트는 `src/app/globals.css`의 `@theme` 토큰만 쓰고 임의의 hex 값을 쓰지 않는다.
