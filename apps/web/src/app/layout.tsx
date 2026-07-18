import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "분리샷", template: "%s | 분리샷" },
  description: "사진 한 장에서 시작하는 사용자 확인형 분리배출 안내",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        <main>{children}</main>
        <footer className="container" style={{ padding: "40px 0 56px", color: "var(--muted)", fontSize: 14 }}>
          분리샷은 일반적인 안내를 제공합니다. 실제 배출 전 지역 기준을 확인해주세요.
        </footer>
      </body>
    </html>
  );
}
