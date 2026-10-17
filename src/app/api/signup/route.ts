import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { credentialsSchema, firstIssue } from "@/lib/validators";

export async function POST(request: Request) {
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });
  if (existing) {
    const error = existing.passwordHash
      ? "이미 가입된 이메일이에요."
      : "Google로 가입한 이메일이에요. 'Google로 계속하기'를 눌러 주세요.";
    return Response.json({ error }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true },
  });
  await createSession(user.id);
  return Response.json({ ok: true }, { status: 201 });
}
