import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Nextyra — Adaptive Fitness Platform",
  description: "AI-powered gamified fitness platform with multi-agent intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme="dark" suppressHydrationWarning>
      <body className="h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
