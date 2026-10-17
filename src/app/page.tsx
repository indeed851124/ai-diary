import { Suspense } from "react";
import { DiaryForm } from "@/components/DiaryForm";
import { DiaryList } from "@/components/DiaryList";
import { EmptyState } from "@/components/EmptyState";
import { SiteHeader } from "@/components/SiteHeader";
import { StaggerText } from "@/components/StaggerText";
import { requireUser } from "@/lib/auth";
import { listDiaries } from "@/lib/diaries";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-6 pb-24">
        <section className="pb-10 pt-8 sm:pt-14">
          <StaggerText
            as="h1"
            text="오늘, 마음은 어땠나요?"
            underline
            className="font-display text-display-lg font-extrabold sm:text-display-xl"
          />
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            있었던 일, 스쳐 간 생각, 말하지 못한 기분까지. 적어 주시면 AI가 천천히 읽고 답장을 써 드릴게요.
          </p>
        </section>

        <DiaryForm />

        <section className="mt-20">
          <h2 className="mb-6 font-display text-title font-semibold">지난 페이지</h2>
          <Suspense fallback={<ListSkeleton />}>
            <RecentDiaries />
          </Suspense>
        </section>
      </main>
    </>
  );
}

async function RecentDiaries() {
  const user = await requireUser();
  const diaries = await listDiaries(user.id);

  if (diaries.length === 0) return <EmptyState />;

  return (
    <DiaryList
      diaries={diaries.map((d) => ({
        id: d.id,
        content: d.content,
        createdAt: d.createdAt.toISOString(),
        analysis: d.analysis,
      }))}
    />
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl bg-paper-deep/70" />
      ))}
    </div>
  );
}
