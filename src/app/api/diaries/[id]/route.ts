import { getUser } from "@/lib/auth";
import { findDiary } from "@/lib/diaries";

export async function GET(_request: Request, { params }: RouteContext<"/api/diaries/[id]">) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });

  const diary = await findDiary(user.id, (await params).id);
  if (!diary) return Response.json({ error: "일기를 찾을 수 없어요." }, { status: 404 });

  return Response.json({ diary });
}
