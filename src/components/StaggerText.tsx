"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_QUINT, rise, staggerContainer } from "@/lib/motion";

type Props = {
  text: string;
  /** "word": 어절 단위, "sentence": 문장 단위 */
  by?: "word" | "sentence";
  stagger?: number;
  delay?: number;
  className?: string;
  /** 마지막 조각이 나온 뒤 잉크 밑줄을 그린다. */
  underline?: boolean;
  as?: "h1" | "h2" | "p";
};

function split(text: string, by: "word" | "sentence") {
  if (by === "word") return text.split(" ");
  return text.match(/[^.!?。…]+[.!?。…]*\s*/g)?.map((s) => s.trim()) ?? [text];
}

export function StaggerText({
  text,
  by = "word",
  stagger = 0.07,
  delay = 0,
  className,
  underline = false,
  as = "p",
}: Props) {
  const reduce = useReducedMotion();
  const parts = split(text, by);
  const Tag = motion[as];
  const underlineDelay = delay + parts.length * stagger + 0.35;

  return (
    <Tag
      className={className}
      variants={staggerContainer(reduce ? 0 : stagger, delay)}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      <span className="relative inline">
        {parts.map((part, i) => (
          <motion.span key={i} variants={rise} aria-hidden className="inline-block whitespace-pre">
            {part}
            {i < parts.length - 1 ? " " : ""}
          </motion.span>
        ))}
        {underline && (
          <svg
            aria-hidden
            viewBox="0 0 300 12"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full overflow-visible"
          >
            <motion.path
              d="M2 8 C 60 2, 120 11, 180 6 S 270 3, 298 7"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: underlineDelay, duration: 0.9, ease: EASE_OUT_QUINT }}
            />
          </svg>
        )}
      </span>
    </Tag>
  );
}
