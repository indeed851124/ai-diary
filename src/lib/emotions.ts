import type { Emotion } from "./validators";

export const EMOTION_COLORS: Record<Emotion, string> = {
  기쁨: "var(--color-joy)",
  슬픔: "var(--color-sadness)",
  불안: "var(--color-anxiety)",
  분노: "var(--color-anger)",
  평온: "var(--color-calm)",
  피로: "var(--color-fatigue)",
};

export function emotionColor(emotion: string | undefined | null) {
  return EMOTION_COLORS[emotion as Emotion] ?? "var(--color-ink-soft)";
}

export function formatDate(date: Date | string) {
  const d = new Date(date);
  return {
    month: d.toLocaleString("en-US", { month: "short" }),
    day: d.getDate(),
    full: d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
  };
}
