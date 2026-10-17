"use client";

import { motion, useAnimationControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { REVEAL_KEY } from "@/lib/reveal";
import { InkButton } from "./InkButton";
import { InkLoader } from "./InkLoader";
import { Notice } from "./Notice";

/** 분석이 없거나 실패했을 때. 재시도 버튼이 살짝 흔들려 시선을 끈다. */
export function RetryAnalysis({ diaryId }: { diaryId: string }) {
  const router = useRouter();
  const shake = useAnimationControls();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shake.start({ x: [0, -4, 4, -4, 4, 0], transition: { delay: 0.5, duration: 0.45 } });
  }, [shake, error]);

  async function retry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/diaries/${diaryId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "AI 분석에 실패했어요.");
        return;
      }
      sessionStorage.setItem(REVEAL_KEY(diaryId), "1");
      router.refresh();
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] bg-paper-deep/70 px-6 py-10">
        <InkLoader />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-dashed border-ink/15 px-6 py-14 text-center">
      <p className="font-hand text-hand text-ink-soft">답장이 아직 도착하지 않았어요</p>
      <p className="max-w-sm text-sm text-ink-soft">
        일기는 안전하게 저장되어 있어요. 버튼을 누르면 AI가 다시 읽어 볼게요.
      </p>
      <Notice message={error} />
      <motion.div animate={shake}>
        <InkButton onClick={retry}>답장 다시 받기</InkButton>
      </motion.div>
    </div>
  );
}
