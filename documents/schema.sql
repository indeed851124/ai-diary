-- 마음 일기 데이터베이스 스키마 (PostgreSQL)
-- documents/plan.md 3장 "데이터 모델"을 SQL로 옮긴 것.
--
-- 이 파일은 참고·수동 설치용이다. 실제 스키마의 기준은 prisma/schema.prisma이고,
-- 앱에 적용할 때는 `npm run db:migrate`(prisma migrate)를 쓴다.
-- 아래 쿼리는 prisma/migrations/20261011141238_init/migration.sql과 같은 구조를 만든다.
-- 테이블 이름과 컬럼 이름은 Prisma 규칙대로 큰따옴표가 붙은 camelCase다.
--
-- id 기본값은 DB가 만들지 않는다. Prisma 클라이언트가 cuid를 만들어 넣으므로,
-- SQL로 직접 INSERT할 때는 id를 직접 넣어야 한다.

BEGIN;

-- 사용자: 이메일/비밀번호 로그인
CREATE TABLE "User" (
    "id"           TEXT         NOT NULL,
    "email"        TEXT         NOT NULL,
    "passwordHash" TEXT         NOT NULL,              -- bcrypt 해시 (cost 12)
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

-- 일기: 사용자 한 명이 여러 개를 쓴다
CREATE TABLE "Diary" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "content"   TEXT         NOT NULL,                 -- 1~5,000자 (앱에서 검증)
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diary_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Diary_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 내 일기 목록을 최신순으로 볼 때 쓰는 인덱스
CREATE INDEX "Diary_userId_createdAt_idx" ON "Diary" ("userId", "createdAt");

-- AI 분석 결과: 일기 하나에 최대 하나 (재분석하면 덮어쓴다)
CREATE TABLE "Analysis" (
    "id"             TEXT         NOT NULL,
    "diaryId"        TEXT         NOT NULL,
    "primaryEmotion" TEXT         NOT NULL,            -- 기쁨, 슬픔, 불안, 분노, 평온, 피로 중 하나
    "emotions"       JSONB        NOT NULL,            -- {"기쁨": 0.1, "슬픔": 0.7, ...} 0~1 점수
    "summary"        TEXT         NOT NULL,            -- 하루 요약 한두 문장
    "comfortMessage" TEXT         NOT NULL,            -- 위로 메시지
    "encouragement"  TEXT         NOT NULL,            -- 응원 메시지
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Analysis_diaryId_fkey" FOREIGN KEY ("diaryId")
        REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Analysis_diaryId_key" ON "Analysis" ("diaryId");

COMMIT;
