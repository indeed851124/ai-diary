import { getUser } from "@/lib/auth";
import { analyzeAndSave, findDiary } from "@/lib/diaries";

export const maxDuration = 60;

export async function POST(_request: Request, { params }: RouteContext<"/api/diaries/[id]/analyze">) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const diary = await findDiary(user.id, (await params).id);
  if (!diary) return Response.json({ error: "일기를 찾을 수 없어요." }, { status: 404 });

  const analysis = await analyzeAndSave(diary.id, diary.content);
  if (!analysis) {
    return Response.json({ error: "AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  return Response.json({ analysis });
}
