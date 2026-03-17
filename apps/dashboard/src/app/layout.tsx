import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassAction OS — Intelligence Dashboard",
  description:
    "AI-powered class action and refund intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
