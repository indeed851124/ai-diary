import "server-only";
import { analyzeDiary } from "./claude";
import { prisma } from "./prisma";

/** 로그인한 사용자의 일기 목록 (최신순). */
export function listDiaries(userId: string) {
  return prisma.diary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { analysis: { select: { primaryEmotion: true, summary: true } } },
  });
}

/** 본인 일기만 찾는다. 다른 사람의 일기는 null. */
export function findDiary(userId: string, id: string) {
  return prisma.diary.findFirst({
    where: { id, userId },
    include: { analysis: true },
  });
}

/** AI 분석을 실행하고 저장한다. 실패하면 null을 돌려주고 일기는 그대로 둔다. */
export async function analyzeAndSave(diaryId: string, content: string) {
  try {
    const result = await analyzeDiary(content);
    return await prisma.analysis.upsert({
      where: { diaryId },
      create: { diaryId, ...result },
      update: result,
    });
  } catch (error) {
    console.error("[analysis] 분석 실패", diaryId, error);
    return null;
  }
}
