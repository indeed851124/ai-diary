import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { AnalysisCard, type AnalysisView } from "@/components/AnalysisCard";
import { RetryAnalysis } from "@/components/RetryAnalysis";
import { SiteHeader } from "@/components/SiteHeader";
import { requireUser } from "@/lib/auth";
import { findDiary } from "@/lib/diaries";
import { formatDate } from "@/lib/emotions";

export default function DiaryPage({ params }: PageProps<"/diary/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-6 pb-24">
        <Link
          href="/"
          className="group mb-8 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> 지난 페이지
        </Link>
        <Suspense fallback={<DetailSkeleton />}>
          {params.then(({ id }) => (
            <DiaryDetail id={id} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function DiaryDetail({ id }: { id: string }) {
  const user = await requireUser();
  const diary = await findDiary(user.id, id);
  if (!diary) notFound();

  const date = formatDate(diary.createdAt);

  return (
    <article className="flex flex-col gap-14">
      <header className="flex flex-col gap-6">
        <ViewTransition name={`diary-date-${diary.id}`} share="morph" default="none">
          <div className="flex items-baseline gap-3">
            <span className="font-numeral-soft text-6xl text-ink">{date.day}</span>
            <span className="font-numeral-soft text-2xl text-ink-soft">{date.month}</span>
          </div>
        </ViewTransition>
        <p className="text-caption text-ink-soft">{date.full}</p>
        <div className="whitespace-pre-wrap rounded-3xl bg-paper-deep/60 p-7 text-body-lg text-ink/90 sm:p-9">
          {diary.content}
        </div>
      </header>

      {diary.analysis ? (
        <AnalysisCard diaryId={diary.id} analysis={diary.analysis as AnalysisView} />
      ) : (
        <RetryAnalysis diaryId={diary.id} />
      )}
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="h-14 w-32 animate-pulse rounded-2xl bg-paper-deep/70" />
      <div className="h-48 animate-pulse rounded-3xl bg-paper-deep/70" />
    </div>
  );
}
