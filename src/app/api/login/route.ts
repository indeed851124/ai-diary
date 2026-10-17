import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { credentialsSchema } from "@/lib/validators";

const INVALID = "이메일 또는 비밀번호가 맞지 않아요.";

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: INVALID }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // 구글로만 가입한 계정은 비밀번호가 없으므로 같은 안내를 돌려준다.
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: INVALID }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({ ok: true });
}
