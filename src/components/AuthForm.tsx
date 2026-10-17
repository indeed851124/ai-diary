"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rise, staggerContainer } from "@/lib/motion";
import { GoogleMark } from "./GoogleMark";
import { InkButton } from "./InkButton";
import { Notice } from "./Notice";

const COPY = {
  login: {
    title: "다시 만나서 반가워요",
    description: "오늘의 마음을 들려주세요.",
    submit: "로그인",
    endpoint: "/api/login",
    switchText: "아직 계정이 없나요?",
    switchLabel: "회원가입",
    switchHref: "/signup",
  },
  signup: {
    title: "첫 페이지를 펼쳐요",
    description: "일기를 쓰면 AI가 다정한 답장을 보내드려요.",
    submit: "시작하기",
    endpoint: "/api/signup",
    switchText: "이미 계정이 있나요?",
    switchLabel: "로그인",
    switchHref: "/login",
  },
} as const;

// /api/auth/google/callback이 실패하면 /login?error=코드로 돌려보낸다.
const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google 로그인을 취소했어요.",
  google_failed: "Google 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
  google_conflict: "이 이메일은 이미 다른 Google 계정과 연결돼 있어요.",
  google_unavailable: "지금은 Google 로그인을 쓸 수 없어요. 이메일로 로그인해 주세요.",
};

const inputClass =
  "h-12 w-full rounded-2xl border border-ink/10 bg-paper-deep/60 px-4 text-ink outline-none transition-[box-shadow,border-color] duration-300 placeholder:text-ink-soft/60 focus:border-accent/60 focus:shadow-[0_0_0_6px_rgb(200_85_61_/_0.12)]";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const copy = COPY[mode];
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("error");
    if (!code) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소창의 값을 한 번만 옮겨 담는다
    setError(GOOGLE_ERRORS[code] ?? GOOGLE_ERRORS.google_failed);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url);
  }, []);

  function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    // OAuth는 전체 페이지 이동이어야 하므로 router가 아니라 location을 쓴다 (페이지가 아니라 Route Handler).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/auth/google");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "잠시 후 다시 시도해 주세요.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-sm flex-col gap-5"
    >
      <motion.h1 variants={rise} className="font-display text-display-lg font-bold">
        {copy.title}
      </motion.h1>
      <motion.p variants={rise} className="-mt-2 text-ink-soft">
        {copy.description}
      </motion.p>
      <motion.label variants={rise} className="flex flex-col gap-2">
        <span className="text-caption font-medium text-ink-soft">이메일</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={inputClass} />
      </motion.label>
      <motion.label variants={rise} className="flex flex-col gap-2">
        <span className="text-caption font-medium text-ink-soft">비밀번호</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="8자 이상"
          className={inputClass}
        />
      </motion.label>
      <Notice message={error} />
      <motion.div variants={rise} className="flex flex-col items-center gap-4 pt-2">
        <InkButton type="submit" loading={loading} disabled={googleLoading} className="w-full">
          {copy.submit}
        </InkButton>
        <div className="flex w-full items-center gap-3 text-caption text-ink-soft/70" aria-hidden>
          <span className="h-px flex-1 bg-ink/10" />
          또는
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <InkButton variant="ghost" onClick={handleGoogle} loading={googleLoading} disabled={loading} className="w-full">
          <span className="inline-flex items-center gap-2.5">
            <GoogleMark className="h-4.5 w-4.5" />
            Google로 계속하기
          </span>
        </InkButton>
        <p className="text-sm text-ink-soft">
          {copy.switchText}{" "}
          <Link href={copy.switchHref} className="font-semibold text-accent underline-offset-4 hover:underline">
            {copy.switchLabel}
          </Link>
        </p>
      </motion.div>
    </motion.form>
  );
}
