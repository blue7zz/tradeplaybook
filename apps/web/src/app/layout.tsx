import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradePlaybook AI",
  description: "个人 AI 交易辅助系统 MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
