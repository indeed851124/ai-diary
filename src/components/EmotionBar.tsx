"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import { emotionColor } from "@/lib/emotions";
import { EASE_OUT_QUINT } from "@/lib/motion";

type Props = {
  emotion: string;
  value: number;
  /** 애니메이션 시작 지연 (초). instant이면 무시. */
  delay?: number;
  instant?: boolean;
};

/** 왼쪽부터 차오르는 막대와 0%부터 올라가는 숫자. */
export function EmotionBar({ emotion, value, delay = 0, instant = false }: Props) {
  const reduce = useReducedMotion();
  const skip = instant || reduce;
  const progress = useMotionValue(skip ? value : 0);
  const percent = useTransform(progress, (v) => `${Math.round(v * 100)}%`);

  useEffect(() => {
    if (skip) {
      progress.set(value);
      return;
    }
    const controls = animate(progress, value, { duration: 1.1, delay, ease: EASE_OUT_QUINT });
    return () => controls.stop();
  }, [progress, value, delay, skip]);

  const color = emotionColor(emotion);

  return (
    <div className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-3">
      <span className="text-sm font-medium text-ink">{emotion}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/5">
        <motion.div className="h-full origin-left rounded-full" style={{ scaleX: progress, backgroundColor: color }} />
      </div>
      <motion.span className="text-right font-numeral-soft text-lg text-ink">{percent}</motion.span>
    </div>
  );
}
