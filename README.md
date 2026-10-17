# 마음 일기 (dear, today)

일기를 쓰면 Claude가 감정을 분석하고 위로와 응원의 답장을 보내 주는 웹 서비스입니다.
설계는 [`documents/plan.md`](documents/plan.md)에 있습니다.

- Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4
- PostgreSQL · Prisma 7
- Claude API (`claude-opus-5-5`, 구조화 출력)
- motion (스태거, 스프링, 마이크로 인터랙션)
- 폰트: Hahmlet · Fraunces · Pretendard · Nanum Pen Script

## 실행

```bash
npm install            # prisma generate도 함께 실행된다
cp .env.example .env   # 값 채우기 (아래 "DB: Supabase" 참고)
npm run db:check       # DB 연결·SSL·테이블 확인
npm run db:deploy      # 테이블 생성 (마이그레이션 적용)
npm run dev
```

`SESSION_SECRET`은 32자 이상 랜덤 문자열이어야 합니다.

### DB: Supabase

1. Supabase 프로젝트를 만들고, 대시보드 상단 **Connect** 버튼에서 연결 문자열 두 개를 복사합니다.
   - **Transaction pooler** (포트 6543) → `DATABASE_URL`: 앱이 쓰는 연결입니다.
   - **Session pooler** (포트 5432) → `DIRECT_URL` (끝에 `?sslmode=require`): 마이그레이션이 쓰는 연결입니다. Transaction pooler로는 마이그레이션이 실패할 수 있습니다.
   - `[YOUR-PASSWORD]`를 DB 비밀번호로 바꿉니다. 비밀번호에 특수문자가 있으면 URL 인코딩합니다 (`@` → `%40`).
2. **Database Settings > SSL Configuration**에서 CA 인증서를 내려받아 `certs/supabase-ca.crt`로 저장합니다. Supabase는 자체 루트 CA를 쓰기 때문에, 이 인증서가 없으면 앱이 연결을 거부합니다(인증서 검증을 끄지 않고 이 CA로 검증합니다).
   - 배포 환경(Vercel 등)에서는 파일 대신 `DATABASE_SSL_CA`에 PEM 내용을 그대로 넣습니다 (줄바꿈은 `\n`).
3. `npm run db:check` → `npm run db:deploy` 순서로 실행합니다.

서버리스로 배포할 때는 `DATABASE_POOL_MAX=1`~`2`로 낮춰서 커넥션이 바닥나지 않게 합니다.

### DB: 로컬 (Supabase 없이)

```bash
npx prisma dev --name ai-diary --detach
# 출력된 주소의 DB 이름을 postgres로 바꿔 DATABASE_URL에 넣고, DIRECT_URL·DATABASE_SSL_CA는 비워 둔다
# 예: postgres://postgres:postgres@localhost:51214/postgres?sslmode=disable
npm run db:migrate
```

API 키가 없거나 AI 호출이 실패해도 일기는 저장되고, 상세 화면의 "답장 다시 받기" 버튼으로 다시 분석할 수 있습니다.

### Google 로그인 (선택)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 **OAuth 동의 화면**을 설정합니다 (외부, 범위는 `openid`·`email`만).
2. **사용자 인증 정보 > OAuth 클라이언트 ID > 웹 애플리케이션**을 만들고, 승인된 리디렉션 URI에 `http://localhost:3000/api/auth/google/callback`을 넣습니다. 배포 주소도 따로 추가합니다.
3. 발급된 값을 `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 넣고 서버를 다시 시작합니다.

라이브러리 없이 인가 코드 + PKCE 흐름으로 직접 구현했습니다 (`src/lib/google.ts`). ID 토큰은 Google 공개 키로 서명·`aud`·`iss`·`nonce`를 검증하고, 확인된 이메일(`email_verified`)만 받습니다. 같은 이메일로 이미 가입한 계정이 있으면 그 계정에 Google을 연결합니다.

## 배포 (Vercel)

GitHub 저장소가 Vercel 프로젝트와 연결돼 있어서 `main`에 push하면 자동으로 운영 배포된다. 함수 지역은 Supabase와 가까운 시드니(`syd1`, `vercel.json`)다.

Vercel 환경 변수 (Production):

| 이름 | 값 |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | 로컬 `.env`와 같은 Supabase 주소 |
| `DATABASE_SSL_CA` | `certs/supabase-ca.crt`의 PEM 내용 전체 (파일 경로가 아님) |
| `DATABASE_POOL_MAX` | `1` (서버리스) |
| `SESSION_SECRET` | 로컬과 다른 운영용 랜덤 값 |
| `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 쓸 때만. Google은 리디렉션 URI에 `https://<배포 주소>/api/auth/google/callback`도 추가 |

환경 변수를 바꾼 뒤에는 다시 배포해야 반영된다 (`npx vercel redeploy <배포 주소>` 또는 대시보드의 Redeploy).

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | 라우트 타입 생성 + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:dev` | 로컬 Postgres 실행 (`prisma dev`) |
| `npm run db:migrate` | 마이그레이션 생성·적용 (개발용, 스키마를 바꿀 때) |
| `npm run db:deploy` | 기존 마이그레이션만 적용 (Supabase·운영 DB용) |
| `npm run db:check` | 앱과 같은 설정으로 DB 연결·SSL·테이블 확인 |
| `npm run e2e` | API 통합 점검 (개발 서버가 3100 포트에서 실행 중이어야 함) |

## 구조

```
src/
  proxy.ts              # 비로그인 사용자를 /login으로 (낙관적 검사)
  lib/
    session.ts          # JWT 세션 쿠키
    google.ts           # Google OAuth (PKCE, ID 토큰 검증)
    auth.ts             # 현재 사용자 확인
    claude.ts           # 프롬프트, 구조화 출력, 재시도
    diaries.ts          # 일기 조회·분석 저장 (항상 userId로 필터)
    validators.ts       # zod 스키마
    fonts.ts, motion.ts, emotions.ts
  app/
    page.tsx            # 작성 + 지난 일기
    diary/[id]/page.tsx # 원문 + 분석 결과 공개
    login/, signup/
    api/                # signup, login, logout, auth/google(+callback), diaries, diaries/[id], diaries/[id]/analyze
  components/           # AnalysisCard, EmotionBar, ReplyLetter, StaggerText, InkButton, InkLoader ...
```
