"use client";

import { motion } from "motion/react";

const TEXT = "첫 페이지를 기다리고 있어요";

/** 손으로 쓰듯 한 글자씩 나타나는 빈 화면 문구. */
export function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-ink/15 px-6 py-14 text-center">
      <p className="font-hand text-hand text-ink-soft" aria-label={TEXT}>
        {Array.from(TEXT).map((char, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.06, duration: 0.25 }}
          >
            {char}
          </motion.span>
        ))}
      </p>
    </div>
  );
}
