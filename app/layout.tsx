import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeAlchemist",
  description: "Paper trading and Stock Market Simulator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
