---
name: ui-design
description: 마음 일기의 디자인 시스템 규칙 (폰트 역할, 색 토큰, 스태거·마이크로 인터랙션, 동작 줄이기 대응). src/components나 src/app의 화면, 스타일, 애니메이션을 만들거나 고칠 때 사용한다.
---

컨셉은 "잉크와 종이, 그리고 답장"이다. 전체 명세는 `documents/plan.md`의 7장에 있고, 토큰의 실제 값은 `src/app/globals.css`의 `@theme`에 있다. 아래는 코드를 쓸 때 지켜야 할 규칙이다.

## 폰트 (시스템 폰트 금지)
| 클래스 | 폰트 | 쓰는 곳 |
| --- | --- | --- |
| `font-display` | Hahmlet | 헤드라인, 페이지 제목, 주요 감정 단어 |
| `font-numeral-soft` | Fraunces italic (SOFT/WONK 축) | 날짜, 숫자, 퍼센트, 글자 수 |
| `font-sans` (기본) | Pretendard | 본문, 버튼, 폼 |
| `font-hand` | Nanum Pen Script | AI 답장의 첫 줄과 서명, 빈 화면 문구 |

크기는 `text-display-xl`, `text-display-lg`, `text-title`, `text-body-lg`, `text-caption`, `text-hand` 토큰을 쓴다. 일기 본문은 `text-body-lg`(행간 1.8)로 쓴다.

## 색
- `paper`, `paper-deep`, `ink`, `ink-soft`, `accent`, `accent-deep`, `night`, `glow` 토큰만 쓴다. 새 hex 값을 쓰지 않는다.
- 감정 색은 `emotionColor()`(`src/lib/emotions.ts`)로 얻는다. 감정을 하드코딩하지 말고 `EMOTIONS`(`src/lib/validators.ts`)를 순회한다.

## 모션 (`motion/react`)
- 공통 값은 `src/lib/motion.ts`를 재사용한다: `rise`(opacity + y 16px + blur 6px), `staggerContainer(stagger, delay)`, `EASE_OUT_QUINT`, `spring`.
- 스태거 간격은 60~90ms, 문장 단위는 120ms 정도로 한다. 목록은 처음 8개까지만 스태거하고 나머지는 즉시 보여준다 (`DiaryList`).
- 텍스트 스태거는 `StaggerText`(어절/문장), 버튼은 `InkButton`(hover 1.02, tap 0.97, 로딩 시 잉크 방울로 모핑), 대기 화면은 `InkLoader`, 알림은 `Notice`를 쓴다. 새로 만들기 전에 기존 컴포넌트를 확장한다.
- `transform`, `opacity`, `filter`, `box-shadow`만 애니메이션한다. width/height 같은 레이아웃 속성은 피한다 (예외: `DiaryCard`의 2→6px 감정 띠).
- 분석 결과 공개 시퀀스(`AnalysisCard`의 `T` 타이밍, 총 약 2.2초)는 일기를 막 쓴 직후에만 재생한다. 이 동작은 `REVEAL_KEY` sessionStorage 플래그로 제어하며, 다시 방문하면 바로 보여준다. "바로 보기" 버튼은 유지한다.

## 접근성
- `MotionProvider`의 `reducedMotion="user"`가 전역으로 적용된다. JS로 직접 돌리는 애니메이션(`animate()`, 카운트업 등)은 `useReducedMotion()`을 확인해서 건너뛴다.
- 글자를 쪼개 애니메이션할 때는 부모에 `aria-label`로 원문을 주고, 조각에는 `aria-hidden`을 붙인다.
- 포커스 링(`:focus-visible`, accent 2px)을 지우지 않는다. 마우스 추적 효과(`ReplyLetter`)는 `pointerType === "mouse"`일 때만 동작하게 한다.
