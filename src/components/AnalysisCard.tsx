"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { emotionColor } from "@/lib/emotions";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { REVEAL_KEY } from "@/lib/reveal";
import { EMOTIONS } from "@/lib/validators";
import { EmotionBar } from "./EmotionBar";
import { ReplyLetter } from "./ReplyLetter";
import { StaggerText } from "./StaggerText";

export type AnalysisView = {
  primaryEmotion: string;
  emotions: Record<string, number>;
  summary: string;
  comfortMessage: string;
  encouragement: string;
};

// 공개 시퀀스 타이밍 (초): ① 감정 단어 → ② 막대 → ③ 요약 → ④ 답장 → ⑤ 응원과 서명
const T = { emotion: 0, bars: 0.45, summary: 1.0, letter: 1.25, comfort: 1.45, closing: 2.0 };

/** 일기를 막 쓴 직후에만 순차 공개 연출을 보여주고, 다시 방문하면 바로 보여준다. */
export function AnalysisCard({ diaryId, analysis }: { diaryId: string; analysis: AnalysisView }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"pending" | "reveal" | "instant">("pending");

  useEffect(() => {
    const key = REVEAL_KEY(diaryId);
    const fresh = sessionStorage.getItem(key) === "1";
    sessionStorage.removeItem(key);
    // 마운트 후 sessionStorage를 읽어야 해서 effect 안에서 상태를 정한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(fresh && !reduce ? "reveal" : "instant");
  }, [diaryId, reduce]);

  if (mode === "pending") return <div className="min-h-[36rem]" aria-hidden />;

  const instant = mode === "instant";
  const at = (t: number) => (instant ? 0 : t);
  const enter = (t: number) => ({
    initial: instant ? false : ({ opacity: 0, y: 24, filter: "blur(6px)" } as const),
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { delay: at(t), duration: 0.8, ease: EASE_OUT_QUINT },
  });

  const color = emotionColor(analysis.primaryEmotion);

  return (
    <div className="relative flex flex-col gap-10">
      <AnimatePresence>
        {!instant && (
          <motion.button
            type="button"
            onClick={() => setMode("instant")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.6 } }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 right-0 rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-deep hover:text-ink"
          >
            바로 보기
          </motion.button>
        )}
      </AnimatePresence>

      {/* ① 주요 감정 */}
      <section className="flex flex-col gap-2">
        <p className="text-caption font-medium text-ink-soft">오늘 가장 크게 느껴진 마음</p>
        <motion.p
          initial={instant ? false : { opacity: 0, scale: 0.9, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 160, damping: 16, delay: at(T.emotion) }}
          className="origin-left font-display text-display-xl font-extrabold"
          style={{ color }}
        >
          {analysis.primaryEmotion}
        </motion.p>
      </section>

      {/* ② 감정 막대 */}
      <section className="grid gap-3 rounded-3xl bg-paper-deep/60 p-6 sm:p-8">
        {EMOTIONS.map((emotion, i) => (
          <EmotionBar
            key={emotion}
            emotion={emotion}
            value={analysis.emotions[emotion] ?? 0}
            delay={T.bars + i * 0.09}
            instant={instant}
          />
        ))}
      </section>

      {/* ③ 요약 */}
      <motion.p {...enter(T.summary)} className="font-display text-title text-ink">
        {analysis.summary}
      </motion.p>

      {/* ④ 답장 카드 */}
      <motion.div
        initial={instant ? false : { opacity: 0, y: 40, scaleY: 0.92 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        transition={{ delay: at(T.letter), duration: 0.9, ease: EASE_OUT_QUINT }}
        className="origin-top"
      >
        <ReplyLetter>
          <p className="mb-6 font-hand text-hand text-glow">오늘의 당신에게,</p>
          {instant ? (
            <p className="text-body-lg text-paper/90">{analysis.comfortMessage}</p>
          ) : (
            <StaggerText
              text={analysis.comfortMessage}
              by="sentence"
              stagger={0.12}
              delay={T.comfort}
              className="text-body-lg text-paper/90"
            />
          )}

          {/* ⑤ 응원과 서명 */}
          <motion.div {...enter(T.closing)} className="mt-10 border-t border-paper/15 pt-8">
            <p className="font-display text-title font-semibold text-glow">{analysis.encouragement}</p>
            <p className="mt-6 text-right font-hand text-hand text-paper/70">— 마음 일기가</p>
          </motion.div>
        </ReplyLetter>
      </motion.div>
    </div>
  );
}
