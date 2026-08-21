import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GradZenX | Launch Your Career With Confidence",
  description: "GradZenX helps students and fresh graduates find verified jobs, prepare for interviews, and access expert study resources — all in one platform.",
  keywords: ["fresher jobs", "interview preparation", "study notes", "career platform", "campus placement"],
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
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}