"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";

/** 밤하늘 답장 카드. 마우스(정밀 포인터)를 따라 촛불빛이 움직인다. */
export function ReplyLetter({ children }: { children: React.ReactNode }) {
  const x = useSpring(useMotionValue(70), { stiffness: 120, damping: 20 });
  const y = useSpring(useMotionValue(10), { stiffness: 120, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(420px circle at ${x}% ${y}%, rgb(242 197 124 / 0.22), transparent 65%)`;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return; // 터치 기기에서는 끈다
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - rect.left) / rect.width) * 100);
    y.set(((event.clientY - rect.top) / rect.height) * 100);
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      className="relative overflow-hidden rounded-[2rem] bg-night px-7 py-10 text-paper sm:px-12 sm:py-14"
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glow }} />
      <div className="relative">{children}</div>
    </div>
  );
}
