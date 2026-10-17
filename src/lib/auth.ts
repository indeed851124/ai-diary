import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSessionUserId } from "./session";

export type CurrentUser = { id: string; email: string };

/** 세션의 사용자를 확인한다. 없으면 null. Route Handler용. */
export async function getUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
}

/** 페이지용. 로그인하지 않았으면 /login으로 보낸다. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
