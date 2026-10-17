"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const MESSAGES = ["AI가 일기를 읽고 있어요", "마음을 담아 답장을 쓰는 중이에요…"];

/** 잉크 방울 세 개가 차례로 떨어지며 퍼지는 대기 화면. 3초가 지나면 문구가 바뀐다. */
export function InkLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setStep(1), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-10">
      <div className="relative h-8 grid min-w-28 place-items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.5 }}
            className="font-display text-title text-ink"
          >
            {MESSAGES[step]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex h-14 items-end gap-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative flex h-14 w-6 flex-col items-center justify-end">
            <motion.span
              className="block h-3 w-2.5 rounded-full rounded-t-[60%] bg-ink"
              animate={{ y: [-36, 0, 0], opacity: [0, 1, 0], scaleY: [1.3, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, times: [0, 0.55, 1] }}
            />
            <motion.span
              className="absolute bottom-0 block h-1.5 w-6 rounded-full bg-ink/40"
              animate={{ scaleX: [0, 0, 1.4], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, times: [0, 0.55, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
