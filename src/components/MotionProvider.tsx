"use client";

import { MotionConfig } from "motion/react";

/** OS의 "동작 줄이기" 설정을 따르면 이동·크기 애니메이션이 꺼지고 opacity만 남는다. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
