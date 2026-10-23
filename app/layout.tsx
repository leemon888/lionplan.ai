import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lionplan",
  description: "Plan your four years at Columbia with an AI that edits your plan for you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
