"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ViewTransition } from "react";
import { emotionColor, formatDate } from "@/lib/emotions";
import { EASE_OUT_QUINT } from "@/lib/motion";

export type DiaryListItem = {
  id: string;
  content: string;
  createdAt: string;
  analysis: { primaryEmotion: string; summary: string } | null;
};

const MAX_STAGGERED = 8;

export function DiaryList({ diaries }: { diaries: DiaryListItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {diaries.map((diary, i) => (
        <motion.li
          key={diary.id}
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-40px" }}
          // 처음 8개만 순서대로, 나머지는 바로 보여준다.
          transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: i < MAX_STAGGERED ? i * 0.06 : 0 }}
        >
          <DiaryCard diary={diary} />
        </motion.li>
      ))}
    </ul>
  );
}

function DiaryCard({ diary }: { diary: DiaryListItem }) {
  const date = formatDate(diary.createdAt);
  const color = emotionColor(diary.analysis?.primaryEmotion);

  return (
    <Link href={`/diary/${diary.id}`} prefetch className="group block h-full">
      <motion.article
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileFocus="hover"
        variants={{
          rest: { y: 0, rotate: 0, boxShadow: "0 10px 30px -24px rgb(31 27 46 / 0.4)" },
          hover: { y: -4, rotate: 0.5, boxShadow: "0 22px 40px -22px rgb(31 27 46 / 0.45)" },
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative flex h-full gap-5 overflow-hidden rounded-3xl bg-paper-deep/70 p-6"
      >
        {/* 감정 컬러 띠 */}
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ backgroundColor: color }}
          variants={{ rest: { width: 2 }, hover: { width: 6 } }}
        />
        <ViewTransition name={`diary-date-${diary.id}`} share="morph" default="none">
          <div className="flex w-12 shrink-0 flex-col items-center leading-none">
            <span className="font-numeral-soft text-sm text-ink-soft">{date.month}</span>
            <span className="font-numeral-soft text-4xl text-ink">{date.day}</span>
          </div>
        </ViewTransition>
        <div className="min-w-0 flex-1">
          {diary.analysis ? (
            <span
              className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-caption font-semibold text-ink"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` }}
            >
              {diary.analysis.primaryEmotion}
            </span>
          ) : (
            <span className="mb-2 inline-block rounded-full bg-ink/5 px-2.5 py-0.5 text-caption text-ink-soft">
              답장 대기 중
            </span>
          )}
          <p className="line-clamp-3 text-ink/85">{diary.analysis?.summary ?? diary.content}</p>
        </div>
      </motion.article>
    </Link>
  );
}
