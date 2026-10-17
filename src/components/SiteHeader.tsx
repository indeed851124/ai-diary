import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-display text-xl font-bold tracking-tight">
        마음 일기
        <span className="ml-1.5 font-numeral-soft text-base font-normal text-accent">dear, today</span>
      </Link>
      <LogoutButton />
    </header>
  );
}
