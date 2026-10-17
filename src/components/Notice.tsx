"use client";

import { AnimatePresence, motion } from "motion/react";

/** 위에서 스프링으로 내려오는 알림. message가 비면 사라진다. */
export function Notice({ message, tone = "error" }: { message: string | null; tone?: "error" | "info" }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          key={message}
          role="alert"
          initial={{ opacity: 0, y: -14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={`rounded-2xl px-4 py-3 text-sm ${
            tone === "error" ? "bg-accent/10 text-accent-deep" : "bg-night/5 text-ink-soft"
          }`}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
