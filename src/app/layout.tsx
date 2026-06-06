import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puzzel Hub - Interactive Jigsaw Challenge",
  description: "Select a group and solve the 50-piece jigsaw puzzle to unlock glowing neon secrets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
