import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeatureFlagProvider } from "@/context/FeatureFlagContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B1D3A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.knowledgepaat.com"),
  title: {
    default: "KnowledgePaat | AI-Powered Career & Learning Platform",
    template: "%s | KnowledgePaat",
  },
  description:
    "KnowledgePaat helps students and job seekers learn skills, prepare for interviews, discover jobs, and grow their careers with AI-powered tools.",
  applicationName: "KnowledgePaat",
  authors: [{ name: "KnowledgePaat Team", url: "https://www.knowledgepaat.com" }],
  generator: "Next.js",
  keywords: [
    "KnowledgePaat",
    "Knowledge Paat",
    "fresher jobs",
    "interview preparation",
    "AI mock interview",
    "study notes",
    "campus placement",
    "software engineer jobs",
    "career platform",
    "aptitude preparation",
  ],
  referrer: "origin-when-cross-origin",
  creator: "KnowledgePaat",
  publisher: "KnowledgePaat",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://www.knowledgepaat.com/",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "KnowledgePaat | AI-Powered Career & Learning Platform",
    description:
      "KnowledgePaat helps students and job seekers learn skills, prepare for interviews, discover jobs, and grow their careers with AI-powered tools.",
    url: "https://www.knowledgepaat.com/",
    siteName: "KnowledgePaat",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "KnowledgePaat — From Knowledge to Opportunity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KnowledgePaat | AI-Powered Career & Learning Platform",
    description:
      "KnowledgePaat helps students and job seekers learn skills, prepare for interviews, discover jobs, and grow their careers with AI-powered tools.",
    creator: "@knowledgepaat",
    site: "@knowledgepaat",
    images: ["/logo.png"],
  },
  category: "education",
};

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.knowledgepaat.com/#website",
      "url": "https://www.knowledgepaat.com/",
      "name": "KnowledgePaat",
      "alternateName": ["Knowledge Paat", "KnowledgePaat Platform"],
      "description": "AI-Powered Career & Learning Platform for students and job seekers",
      "publisher": {
        "@id": "https://www.knowledgepaat.com/#organization",
      },
      "inLanguage": "en-US",
    },
    {
      "@type": "Organization",
      "@id": "https://www.knowledgepaat.com/#organization",
      "name": "KnowledgePaat",
      "alternateName": ["Knowledge Paat"],
      "url": "https://www.knowledgepaat.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.knowledgepaat.com/logo.png",
      },
      "sameAs": [
        "https://www.linkedin.com/company/knowledgepaat",
        "https://twitter.com/knowledgepaat",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
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