import { StaggerText } from "./StaggerText";

/** 로그인·회원가입 공통 레이아웃: 왼쪽은 밤하늘 패널, 오른쪽은 폼. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-night p-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-glow/20 blur-3xl"
        />
        <p className="font-numeral-soft text-xl text-glow">Dear, today</p>
        <div className="relative">
          <StaggerText
            as="h2"
            text="오늘의 마음을 적으면, 다정한 답장이 도착해요"
            className="max-w-lg font-display text-display-xl font-extrabold"
            stagger={0.08}
          />
          <p className="mt-8 font-hand text-hand text-glow/90">— 마음 일기</p>
        </div>
        <p className="text-caption text-paper/50">당신의 일기는 당신만 볼 수 있어요.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">{children}</section>
    </main>
  );
}
