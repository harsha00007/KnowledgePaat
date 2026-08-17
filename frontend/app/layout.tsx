import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GradZenX | Launch Your Career With Confidence",
  description: "GradZenX helps students and fresh graduates find verified jobs, prepare for interviews, and access expert study resources — all in one platform.",
  openGraph: {
    title: "GradZenX — Career Platform for Students",
    description: "Find verified jobs, prepare for interviews, and access study resources designed for freshers and recent graduates.",
    siteName: "GradZenX",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}