import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeatureFlagProvider } from "@/context/FeatureFlagContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KnowledgePaat | From Knowledge to Opportunity",
  description: "KnowledgePaat is an EdTech and career development platform helping students and job seekers learn, practice, interview, and discover verified career opportunities.",
  keywords: ["KnowledgePaat", "fresher jobs", "interview preparation", "study notes", "AI mock interview", "career platform", "campus placement"],
  openGraph: {
    title: "KnowledgePaat — From Knowledge to Opportunity",
    description: "Learn high-demand skills, practice real interview questions, simulate AI mock interviews, and discover verified direct job openings.",
    siteName: "KnowledgePaat",
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
          <FeatureFlagProvider>
            {children}
          </FeatureFlagProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}