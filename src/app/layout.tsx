import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ashley AI - Unified App",
  description: "AI-powered chat interface with unified Next.js + Python architecture",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}