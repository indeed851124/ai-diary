import type { Metadata } from "next";
import { MotionProvider } from "@/components/MotionProvider";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "마음 일기 — 오늘의 당신에게 답장을",
  description: "일기를 쓰면 AI가 마음을 읽고 위로와 응원의 답장을 보내드려요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${fontVariables} h-full`}>
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
