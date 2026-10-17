import { getUser } from "@/lib/auth";
import { analyzeAndSave, listDiaries } from "@/lib/diaries";
import { prisma } from "@/lib/prisma";
import { diarySchema, firstIssue } from "@/lib/validators";

// AI 분석은 수십 초가 걸릴 수 있다.
export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  return Response.json({ diaries: await listDiaries(user.id) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const parsed = diarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  // 분석이 실패해도 일기는 먼저 저장해 둔다.
  const diary = await prisma.diary.create({
    data: { userId: user.id, content: parsed.data.content },
  });
  const analysis = await analyzeAndSave(diary.id, diary.content);

  return Response.json(
    {
      diary: { ...diary, analysis },
      ...(analysis ? {} : { error: "AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요." }),
    },
    { status: 201 },
  );
}
