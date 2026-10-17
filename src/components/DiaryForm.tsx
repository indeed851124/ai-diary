"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { REVEAL_KEY } from "@/lib/reveal";
import { DIARY_MAX_LENGTH } from "@/lib/validators";
import { InkButton } from "./InkButton";
import { InkLoader } from "./InkLoader";
import { Notice } from "./Notice";

export function DiaryForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const length = content.length;
  const ratio = Math.min(length / DIARY_MAX_LENGTH, 1);
  const nearLimit = ratio > 0.9;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "일기를 저장하지 못했어요.");
        setLoading(false);
        return;
      }
      // 상세 화면에서 이번 한 번만 공개 연출을 보여준다.
      sessionStorage.setItem(REVEAL_KEY(data.diary.id), "1");
      router.push(`/diary/${data.diary.id}`);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-paper-deep/70 px-6 py-10"
          >
            <InkLoader />
          </motion.div>
        ) : (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <motion.div
              animate={{
                boxShadow: focused
                  ? "0 0 0 6px rgb(200 85 61 / 0.12), 0 24px 48px -28px rgb(31 27 46 / 0.35)"
                  : "0 0 0 0px rgb(200 85 61 / 0), 0 12px 32px -24px rgb(31 27 46 / 0.25)",
              }}
              transition={{ duration: 0.35 }}
              className={`relative overflow-hidden rounded-[2rem] border bg-paper-deep/60 transition-colors duration-300 ${
                focused ? "border-accent/50" : "border-ink/10"
              }`}
            >
              <label htmlFor="diary" className="sr-only">
                오늘의 일기
              </label>
              <textarea
                id="diary"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, DIARY_MAX_LENGTH))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="오늘은 어떤 일이 있었나요? 떠오르는 대로 편하게 적어 보세요."
                rows={8}
                className="block min-h-56 w-full resize-y bg-transparent px-7 pb-10 pt-7 text-body-lg text-ink outline-none placeholder:text-ink-soft/60"
              />
              {/* 글자 수만큼 차오르는 잉크 바 */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/5" aria-hidden>
                <motion.div
                  className="h-full origin-left"
                  animate={{
                    scaleX: ratio,
                    backgroundColor: nearLimit ? "var(--color-accent)" : "var(--color-ink)",
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
              </div>
              <div className="pointer-events-none absolute bottom-3 right-6 text-caption text-ink-soft">
                <motion.span
                  key={length}
                  initial={{ y: -4, opacity: 0.4 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`font-numeral-soft text-sm ${nearLimit ? "text-accent" : ""}`}
                >
                  {length.toLocaleString()}
                </motion.span>
                <span className="font-numeral-soft text-sm"> / {DIARY_MAX_LENGTH.toLocaleString()}</span>
              </div>
            </motion.div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <Notice message={error} />
              </div>
              <InkButton type="submit" disabled={!content.trim()} loading={loading}>
                마음 보내기
              </InkButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
