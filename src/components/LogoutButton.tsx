"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
    >
      로그아웃
    </button>
  );
}
