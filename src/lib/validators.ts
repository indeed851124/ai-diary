import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해 주세요.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 해요.")
    .max(72, "비밀번호는 72자 이하여야 해요."),
});

export const DIARY_MAX_LENGTH = 5000;

export const diarySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "일기 내용을 입력해 주세요.")
    .max(DIARY_MAX_LENGTH, `일기는 ${DIARY_MAX_LENGTH.toLocaleString()}자까지 쓸 수 있어요.`),
});

export const EMOTIONS = ["기쁨", "슬픔", "불안", "분노", "평온", "피로"] as const;
export type Emotion = (typeof EMOTIONS)[number];

const score = z.number().min(0).max(1);

export const analysisSchema = z.object({
  primaryEmotion: z.enum(EMOTIONS),
  emotions: z.object({
    기쁨: score,
    슬픔: score,
    불안: score,
    분노: score,
    평온: score,
    피로: score,
  }),
  summary: z.string(),
  comfortMessage: z.string(),
  encouragement: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

/** zod 에러에서 사용자에게 보여줄 첫 메시지를 꺼낸다. */
export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "입력값을 확인해 주세요.";
}
