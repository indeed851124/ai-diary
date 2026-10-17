"use client";

import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  variant?: "solid" | "ghost";
  className?: string;
};

/** hover 시 살짝 커지고, 누르면 눌렸다 튕기며, 전송 중에는 잉크 방울로 줄어드는 버튼. */
export function InkButton({
  children,
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  variant = "solid",
  className = "",
}: Props) {
  const solid = variant === "solid";
  return (
    <motion.button
      layout
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      transition={spring}
      whileHover={loading ? undefined : { scale: 1.02, boxShadow: "0 10px 24px -10px rgb(200 85 61 / 0.55)" }}
      whileTap={loading ? undefined : { scale: 0.97 }}
      style={{ borderRadius: 999 }}
      className={`relative inline-flex h-12 items-center justify-center overflow-hidden font-semibold disabled:cursor-not-allowed ${
        solid ? "bg-accent text-paper disabled:opacity-60" : "border border-ink/15 text-ink hover:bg-paper-deep"
      } ${loading ? "w-12" : "px-7"} ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {loading ? (
          <motion.svg
            key="drop"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            initial={{ opacity: 0, scale: 0.4, y: -6 }}
            animate={{ opacity: 1, scale: [1, 0.85, 1], y: [0, 2, 0] }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ scale: { repeat: Infinity, duration: 1.1 }, y: { repeat: Infinity, duration: 1.1 } }}
            aria-label="전송 중"
          >
            <path d="M12 2.5C9 7 6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-3-7-6-11.5Z" fill="currentColor" />
          </motion.svg>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="whitespace-nowrap"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
