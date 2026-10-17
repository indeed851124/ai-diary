# AI 일기 서비스 구현 계획

## 1. 개요
사용자가 일기를 작성하면 AI(Claude)가 감정을 분석하고, 그 결과를 바탕으로 위로와 응원 메시지를 돌려주는 풀스택 웹 서비스.

### 확정된 결정 사항
| 항목 | 선택 |
| --- | --- |
| 스택 | Next.js 풀스택 (App Router, TypeScript) |
| DB / 인증 | PostgreSQL + 이메일/비밀번호 로그인 |
| AI | Claude API (`claude-opus-5-5`) |
| MVP 범위 | 감정 분석 + 위로/응원 메시지 |

### 구현하면서 달라진 점 (2026-10-11)
설치된 최신 버전(Next.js 16.4, Prisma 7.10)에 맞추느라 아래 항목은 본문과 다르게 구현했다. 본문과 이 표가 다르면 이 표가 맞다.

| 계획 | 실제 구현 | 이유 |
| --- | --- | --- |
| Auth.js Credentials, `/api/auth/[...nextauth]` | `jose`로 서명한 JWT를 httpOnly 쿠키에 저장 (`src/lib/session.ts`), `/api/login`, `/api/logout` | Next 16의 Cache Components와 호환성이 확실하고 의존성이 적다 |
| `middleware.ts` | `src/proxy.ts` | Next 16에서 Middleware가 Proxy로 이름이 바뀌었다 |
| `AUTH_SECRET` | `SESSION_SECRET` | 자체 세션 구현 |
| Pretendard를 `next/font/local`로 로드 | `pretendard` 패키지의 다이나믹 서브셋 CSS를 `globals.css`에서 import | 한글 서브셋 조각별 `unicode-range`를 그대로 쓰기 위해 (셀프 호스팅은 동일) |
| 페이지 전환에 `layoutId` | React `<ViewTransition>`으로 목록 카드의 날짜를 상세 헤더로 morph | App Router에서는 페이지 간 `layoutId`가 동작하지 않는다 |
| Docker로 Postgres 실행 | 운영 DB는 **Supabase**, 로컬은 `npx prisma dev` (Docker 없이) | 이 PC에 Docker가 없다 |
| `DATABASE_URL` 하나 | `DATABASE_URL`(Transaction pooler 6543, 앱용) + `DIRECT_URL`(Session pooler 5432, 마이그레이션용) + `DATABASE_SSL_CA`(Supabase CA 인증서) + `DATABASE_POOL_MAX` | Supabase 풀러 구조와 자체 CA 인증서 때문. 설정은 `src/lib/db-config.ts` |
| 위기 감지 안내는 MVP 이후 | AI 시스템 프롬프트에 자해·자살 표현이 있으면 109 상담전화를 부드럽게 권하도록 넣음 | 감정을 다루는 서비스라 최소한의 안전 장치는 처음부터 둔다. 별도 UI 배너는 아직 없음 |
| 분석 응답 JSON 파싱 | Claude 구조화 출력(`betaZodOutputFormat`) + 거절 시 서버 측 fallback(`fallbacks: "default"`) | 형식 오류 가능성을 API 차원에서 줄인다 |
| 이메일/비밀번호 로그인만 | Google 로그인 추가 (2026-10-17). OAuth 인가 코드 + PKCE를 직접 구현(`src/lib/google.ts`, `/api/auth/google`, `/api/auth/google/callback`), `User.passwordHash`는 선택, `User.googleId` 추가 | 자체 세션 구조를 그대로 쓰고 의존성을 늘리지 않기 위해. 확인된 같은 이메일 계정은 자동으로 연결한다 |

## 2. 기술 스택
- **프레임워크**: Next.js (App Router) + TypeScript
- **스타일**: Tailwind CSS
- **DB**: PostgreSQL + Prisma ORM
- **인증**: Auth.js (NextAuth v5) Credentials Provider, bcrypt 비밀번호 해시, JWT 세션
- **AI**: `@anthropic-ai/sdk`. 서버에서만 호출하고 API 키는 `.env`에 둔다
- **검증**: zod (요청 바디와 AI 응답 JSON)
- **폰트**: `next/font/google` (Hahmlet, Fraunces, Nanum Pen Script) + `next/font/local` (Pretendard Variable)
- **애니메이션**: `motion` (Framer Motion, `motion/react`) — 스태거, 스프링, 레이아웃 애니메이션

## 3. 데이터 모델 (`prisma/schema.prisma`)
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  diaries      Diary[]
}

model Diary {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  content   String
  createdAt DateTime  @default(now())
  analysis  Analysis?

  @@index([userId, createdAt])
}

model Analysis {
  id             String   @id @default(cuid())
  diaryId        String   @unique
  diary          Diary    @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  primaryEmotion String   // 예: "슬픔", "기쁨", "불안"
  emotions       Json     // { "기쁨": 0.1, "슬픔": 0.7, ... } 0~1 점수
  summary        String   // 일기 내용 한두 문장 요약
  comfortMessage String   // 위로 메시지
  encouragement  String   // 응원 메시지
  createdAt      DateTime @default(now())
}
```

## 4. API 설계
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/signup` | 이메일/비밀번호 회원가입 (중복 이메일은 409) |
| * | `/api/auth/[...nextauth]` | 로그인/로그아웃 (Auth.js) |
| POST | `/api/diaries` | 일기 저장 → AI 분석 → 분석 결과 저장 후 함께 반환 |
| GET | `/api/diaries` | 내 일기 목록 (최신순, 분석 요약 포함) |
| GET | `/api/diaries/[id]` | 일기 상세 + 분석 결과 |
| POST | `/api/diaries/[id]/analyze` | 분석 재시도 (AI 실패 시) |

- 모든 일기 API는 세션을 확인하고, 조회할 때 반드시 `userId`로 필터링한다. 다른 사람의 일기는 404를 반환한다.
- 일기 본문은 1~5,000자로 제한한다 (zod).

## 5. AI 분석 설계 (`src/lib/claude.ts`)
### 흐름
1. 일기를 먼저 DB에 저장한다. AI가 실패해도 일기는 남는다.
2. Claude를 호출해 JSON 형태의 분석 결과를 받는다.
3. zod로 파싱하고, 실패하면 1회 재시도한다.
4. 성공하면 Analysis를 저장한다. 끝내 실패하면 `analysis: null`과 오류 메시지를 반환하고, UI에 재시도 버튼을 띄운다.

### 시스템 프롬프트 요지
- 역할: 따뜻하고 공감적인 상담 동료. 판단하거나 훈계하지 않는다.
- 항상 한국어로, 사용자의 표현을 구체적으로 인용하며 공감한다.
- 의학적 진단이나 처방은 하지 않는다.
- 아래 JSON만 출력한다.

```json
{
  "primaryEmotion": "슬픔",
  "emotions": { "기쁨": 0.1, "슬픔": 0.7, "불안": 0.4, "분노": 0.0, "평온": 0.1 },
  "summary": "…",
  "comfortMessage": "…",
  "encouragement": "…"
}
```

- 감정 카테고리는 기쁨, 슬픔, 불안, 분노, 평온, 피로로 고정해 이후 통계 기능에 쓸 수 있게 한다.

## 6. 화면 구성
| 경로 | 내용 |
| --- | --- |
| `/signup` | 회원가입 폼 |
| `/login` | 로그인 폼 |
| `/` | (로그인 필요) 일기 작성 폼 + 최근 일기 목록 |
| `/diary/[id]` | 일기 원문, 주요 감정 배지, 감정 점수 막대, 위로/응원 메시지 카드 |

- `middleware.ts`로 `/`와 `/diary/*` 경로를 보호한다 (비로그인이면 `/login`으로 보낸다).
- 분석은 몇 초 걸리므로 작성 후 "AI가 일기를 읽고 있어요…" 로딩 상태를 보여준다.

## 7. 디자인 시스템

### 7.1 컨셉: "잉크와 종이, 그리고 답장"
사용자는 **종이에 잉크로** 일기를 쓰고, AI는 **손으로 쓴 편지처럼** 답장한다. 차가운 대시보드 느낌의 UI를 피하고, 따뜻한 종이 질감과 잉크가 번지는 모션으로 감정적인 몰입을 만든다.

### 7.2 폰트 조합
시스템 폰트를 쓰지 않는다. 역할마다 성격이 분명한 서체를 하나씩 배정한다.

| 역할 | 폰트 | 이유 | 사용처 |
| --- | --- | --- | --- |
| 디스플레이 (한글) | **Hahmlet** (가변, 100~900) | 붓의 맺음이 살아 있는 현대적 명조. 굵기를 키우면 강한 존재감이 생기고 가늘게 쓰면 우아하다 | 히어로 헤드라인, 페이지 제목, 주요 감정 단어 |
| 디스플레이 (라틴/숫자) | **Fraunces** (가변, opsz·SOFT·WONK 축) | 개성이 강한 올드스타일 세리프. 이탤릭은 날짜와 숫자를 장식처럼 보이게 한다 | 날짜 (`Oct 11`), 감정 점수 %, 큰 숫자 |
| 본문 / UI | **Pretendard Variable** | 한글과 라틴이 고르게 어울리는 고품질 산세리프. 명조 헤드라인과 대비되어 읽기 편하다 | 일기 본문, 버튼, 폼, 내비게이션 |
| 손글씨 액센트 | **Nanum Pen Script** | AI의 답장에 사람의 온기를 더한다 | 위로 메시지 첫 줄, 서명 ("— 오늘의 당신에게"), 빈 화면 문구 |

**타입 스케일** (Tailwind 토큰, 1.25 비율)
| 토큰 | 크기 / 행간 | 폰트 / 굵기 |
| --- | --- | --- |
| `display-xl` | 64 / 1.05, 자간 -0.03em | Hahmlet 800 |
| `display-lg` | 44 / 1.15, 자간 -0.02em | Hahmlet 700 |
| `title` | 28 / 1.3 | Hahmlet 600 |
| `body-lg` | 18 / 1.8 | Pretendard 400 (일기 본문, 넉넉한 행간) |
| `body` | 16 / 1.6 | Pretendard 400 |
| `caption` | 13 / 1.4, 자간 0.02em | Pretendard 500 |
| `numeral` | 가변 | Fraunces italic 500, `font-variation-settings: "SOFT" 100, "WONK" 1` |
| `hand` | 26 / 1.4 | Nanum Pen Script |

**로딩 전략**
- `next/font`로 셀프 호스팅해서 레이아웃 이동(CLS)과 외부 요청을 없앤다. 각 폰트를 CSS 변수(`--font-display`, `--font-numeral`, `--font-sans`, `--font-hand`)로 노출하고 Tailwind `@theme`에 연결한다.
- 한글 웹폰트는 용량이 크다. Pretendard는 `pretendard` 패키지의 다이나믹 서브셋 woff2를 `next/font/local`로 불러온다. Hahmlet과 Nanum Pen Script는 `preload: false`, `display: "swap"`으로 설정해 첫 화면을 막지 않게 한다.

### 7.3 컬러 팔레트
| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `paper` | `#F6F1E7` | 배경 (따뜻한 미색 종이) |
| `paper-deep` | `#ECE4D3` | 카드, 입력창 배경 |
| `ink` | `#1F1B2E` | 본문 텍스트 (보랏빛이 도는 먹색) |
| `ink-soft` | `#5B556B` | 보조 텍스트 |
| `accent` | `#C8553D` | 주 강조색 (테라코타, 버튼과 포커스) |
| `night` | `#2B2A4C` | 히어로와 답장 카드 배경 (밤하늘) |
| `glow` | `#F2C57C` | 답장 카드의 강조와 하이라이트 (촛불빛) |

**감정 컬러** (감정 배지와 점수 막대): 기쁨 `#F2B544` · 슬픔 `#5B7DB1` · 불안 `#8E6CB5` · 분노 `#D0573F` · 평온 `#6FA58A` · 피로 `#9A8F84`

- 배경에는 SVG `feTurbulence`로 만든 은은한 종이 노이즈(opacity 4%)를 깐다.
- 다크 모드에서는 `night`를 배경으로, `paper`를 텍스트로 뒤집는다.
- 모든 텍스트·배경 조합이 WCAG AA 대비(4.5:1)를 넘는지 확인한다.

### 7.4 스태거 효과
공통 원칙: 자식 요소 간격은 **60~90ms**, 이징은 `cubic-bezier(0.22, 1, 0.36, 1)` (easeOutQuint), 등장은 `opacity 0 → 1` + `y 16px → 0` + `blur 6px → 0`. `src/lib/motion.ts`에 variants를 모아 재사용한다.

| 위치 | 연출 |
| --- | --- |
| **히어로 헤드라인** ("오늘, 마음은 어땠나요?") | 어절 단위로 쪼개 70ms 간격으로 아래에서 떠오른다. 마지막 어절이 끝나면 밑줄이 왼쪽에서 오른쪽으로 잉크처럼 그려진다 (SVG `pathLength` 0 → 1) |
| **로그인 / 회원가입 폼** | 제목 → 설명 → 입력창 → 버튼 순으로 80ms 간격 등장 |
| **일기 목록** | 카드가 60ms 간격으로 떠오른다. 뷰포트에 들어올 때(`whileInView`, `once: true`) 실행하고, 한 번에 최대 8개까지만 스태거를 적용한 뒤 나머지는 즉시 보여준다 |
| **분석 결과 공개 (핵심 연출)** | 결과 화면에서 순서대로 펼쳐진다. ① 주요 감정 단어가 Hahmlet 800으로 커지며 등장 (scale 0.9 → 1, 스프링) → ② 감정 막대 6개가 90ms 간격으로 왼쪽부터 차오르고, 옆의 Fraunces 숫자가 0%에서 카운트업 → ③ 요약 한 줄 페이드인 → ④ 답장 카드가 아래에서 펼쳐지며 위로 메시지가 문장 단위로 120ms 간격 등장 → ⑤ 응원 메시지와 손글씨 서명이 마지막으로 나타난다. 전체 약 2.2초 |

### 7.5 마이크로 인터랙션
| 요소 | 인터랙션 |
| --- | --- |
| **일기 입력창** | 포커스하면 테두리가 `accent` 색으로 번지듯 나타난다 (box-shadow 확산). 입력할수록 하단의 얇은 잉크 바가 글자 수에 비례해 채워지고, 5,000자에 가까워지면 `accent`로 바뀐다. 글자 수 숫자는 Fraunces로 부드럽게 갱신 |
| **"마음 보내기" 버튼** | hover 시 1.02배 커지고 그림자가 깊어진다. 누르면 0.97배로 눌렸다가 스프링으로 복귀. 전송하면 버튼이 원형으로 줄어들며 잉크 방울 아이콘으로 바뀐다 (`layout` 애니메이션) |
| **AI 분석 대기** | "AI가 일기를 읽고 있어요" 문구 아래로 잉크 방울 3개가 순서대로 떨어지며 퍼진다. 3초가 넘으면 문구가 "마음을 담아 답장을 쓰는 중이에요…"로 크로스페이드된다 |
| **일기 카드 (목록)** | hover 시 y -4px로 떠오르고 살짝 기울어진다 (rotate 0.5°, 종이를 집어 드는 느낌). 왼쪽 감정 컬러 띠가 2px에서 6px로 두꺼워진다 |
| **감정 배지** | hover 시 해당 감정 컬러의 은은한 glow가 퍼진다 |
| **답장 카드** | 마우스 위치에 따라 `glow` 빛이 카드 위를 따라다닌다 (radial-gradient 위치를 CSS 변수로 갱신). 터치 기기에서는 끈다 |
| **페이지 전환** | 목록에서 상세로 갈 때 카드가 상세 화면 헤더로 이어진다 (`layoutId` 공유 레이아웃) |
| **토스트 / 에러** | 위에서 스프링으로 내려온다. 분석 실패 시 재시도 버튼이 좌우로 살짝 흔들려(shake 4px, 2회) 시선을 끈다 |
| **빈 상태** | 첫 일기가 없으면 Nanum Pen Script로 "첫 페이지를 기다리고 있어요"가 손으로 쓰듯 한 글자씩 나타난다 |

### 7.6 접근성과 성능
- `prefers-reduced-motion: reduce`이면 이동·블러·스태거를 끄고 opacity 페이드(150ms)만 남긴다. `motion`의 `useReducedMotion`과 `MotionConfig reducedMotion="user"`를 함께 쓴다.
- 애니메이션은 `transform`, `opacity`, `filter`만 사용해 레이아웃 재계산을 피한다.
- 분석 공개 연출은 다시 방문할 때 건너뛸 수 있게 "바로 보기" 버튼을 둔다. 이미 본 결과는 연출 없이 바로 보여준다.
- 포커스 링은 항상 보이게 한다 (`focus-visible`, `accent` 2px 아웃라인).

## 8. 디렉터리 구조
```
ai-diary/
  documents/plan.md
  docker-compose.yml          # postgres (Docker 사용 시)
  .env.example                # DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY
  prisma/schema.prisma
  src/
    middleware.ts
    lib/
      prisma.ts               # PrismaClient 싱글턴
      auth.ts                 # Auth.js 설정
      claude.ts               # 프롬프트, 호출, JSON 파싱, 재시도
      validators.ts           # zod 스키마
      fonts.ts                # next/font 설정, CSS 변수 노출
      motion.ts               # 공통 이징, 스태거 variants
    app/
      layout.tsx
      page.tsx                # 작성 + 목록
      login/page.tsx
      signup/page.tsx
      diary/[id]/page.tsx
      api/
        auth/[...nextauth]/route.ts
        signup/route.ts
        diaries/route.ts
        diaries/[id]/route.ts
        diaries/[id]/analyze/route.ts
    components/
      DiaryForm.tsx
      DiaryList.tsx
      AnalysisCard.tsx        # 분석 결과 공개 시퀀스
      EmotionBar.tsx          # 차오르는 막대 + 카운트업 숫자
      ReplyLetter.tsx         # 답장 카드 (커서 glow, 손글씨 서명)
      StaggerText.tsx         # 어절/문장 단위 스태거 텍스트
      InkLoader.tsx           # 잉크 방울 로딩
      InkButton.tsx           # 눌림/전송 모핑 버튼
    styles/globals.css        # Tailwind @theme 토큰 (폰트, 색, 타입 스케일), 종이 노이즈
```

## 9. 환경 변수 (`.env`)
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_diary"
AUTH_SECRET="<npx auth secret 으로 생성>"
ANTHROPIC_API_KEY="sk-ant-..."
```

## 10. 사전 준비: PostgreSQL 실행 환경
현재 PC에 Docker가 설치되어 있지 않아서(Node v22.17.0은 설치됨) 아래 중 하나를 골라야 한다.
1. **Docker Desktop 설치** 후 `docker compose up -d`
2. **로컬 PostgreSQL 설치** (Windows 설치 프로그램)
3. **호스팅 DB** (Neon, Supabase 무료 플랜). 설치 없이 `DATABASE_URL`만 바꾸면 된다.

## 11. 구현 순서
1. 프로젝트 초기화: `create-next-app` (TS, Tailwind, App Router, src 디렉터리), 의존성 설치 (`motion`, `pretendard` 포함)
2. 디자인 기반: `fonts.ts`, `globals.css` 토큰(폰트·색·타입 스케일), 종이 노이즈 배경, `motion.ts` 공통 variants
3. DB: Prisma 설정, 스키마 작성, `prisma migrate dev`
4. 인증: 회원가입 API, Auth.js Credentials, 미들웨어, 로그인/회원가입 페이지 (폼 스태거 적용)
5. AI: `lib/claude.ts`를 구현하고 샘플 일기를 넣는 단독 스크립트로 응답 품질과 JSON 파싱을 먼저 확인
6. 일기 API: 작성/목록/상세/재분석
7. UI: 히어로, 작성 폼(입력창·버튼 인터랙션), 목록(카드 스태거·hover), 잉크 로더
8. 분석 결과 공개 시퀀스: `AnalysisCard`, `EmotionBar`, `ReplyLetter`, 공유 레이아웃 전환
9. 마무리: reduced-motion 대응, 대비 점검, 타입 체크, 빌드, 수동 E2E 확인

## 12. 검증
- `npx prisma migrate dev` 성공
- `npm run dev`로 회원가입 → 로그인 → 일기 작성 → 분석 카드 표시까지 브라우저에서 확인
- 두 번째 계정으로 첫 계정의 `/diary/[id]`에 접근하면 404
- `ANTHROPIC_API_KEY`가 잘못된 상태로 작성해도 일기는 저장되고, 키를 고친 뒤 재시도 버튼으로 분석 성공
- `npx tsc --noEmit`, `npm run build` 통과
- **디자인**: 개발자 도구 Network 탭에서 4개 폰트가 셀프 호스팅으로 로드되는지, 시스템 폰트로 대체된 텍스트가 없는지 확인
- **모션**: 분석 공개 시퀀스가 ①~⑤ 순서로 약 2.2초 안에 끝나는지, 목록 카드가 순차적으로 등장하는지 확인
- **reduced-motion**: OS의 "애니메이션 줄이기"를 켜면 이동과 스태거 없이 페이드만 남는지 확인
- **성능**: Lighthouse에서 CLS 0.1 미만, 애니메이션 중 Performance 패널에 레이아웃 재계산(Layout)이 없는지 확인

## 13. MVP 이후 확장 후보
- **위기 감지 안내 (우선 권장)**: 자해·자살 관련 표현이 나오면 상담 기관 안내를 보여준다 (자살예방상담전화 109, 정신건강위기상담 1577-0199). 감정을 다루는 서비스라 가장 먼저 추가하는 것이 좋다.
- 감정 통계 차트 (주간/월간 추이)
- 캘린더 보기, 일기 수정/삭제
- 응답 스트리밍으로 체감 속도 개선
