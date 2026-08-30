import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeatureFlagProvider } from "@/context/FeatureFlagContext";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

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
  metadataBase: new URL("https://knowledgepaat.com"),
  title: {
    default: "KnowledgePaat | Learn, Prepare and Build Your Career",
    template: "%s | KnowledgePaat",
  },
  description:
    "KnowledgePaat is an online platform for students to learn, prepare for jobs and interviews, access useful resources, discover opportunities, and build their careers.",
  applicationName: "KnowledgePaat",
  authors: [{ name: "KnowledgePaat Team", url: "https://knowledgepaat.com" }],
  generator: "Next.js",
  keywords: [
    "KnowledgePaat",
    "Knowledge Paat",
    "knowledgepaat",
    "knowledge paat",
    "student learning platform",
    "job preparation",
    "interview preparation",
    "career opportunities",
    "student resources",
    "career development",
    "fresher jobs",
    "AI mock interview",
    "study notes",
    "campus placement",
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
    canonical: "https://knowledgepaat.com/",
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
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "KnowledgePaat | Learn, Prepare and Build Your Career",
    description:
      "KnowledgePaat is an online platform for students to learn, prepare for jobs and interviews, access useful resources, discover opportunities, and build their careers.",
    url: "https://knowledgepaat.com/",
    siteName: "KnowledgePaat",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/brand/knowledgepaat_logo.png",
        width: 1200,
        height: 630,
        alt: "KnowledgePaat — Learn, Prepare and Build Your Career",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KnowledgePaat | Learn, Prepare and Build Your Career",
    description:
      "KnowledgePaat is an online platform for students to learn, prepare for jobs and interviews, access useful resources, discover opportunities, and build their careers.",
    creator: "@knowledgepaat",
    site: "@knowledgepaat",
    images: ["/brand/knowledgepaat_logo.png"],
  },
  category: "education",
};

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://knowledgepaat.com/#website",
      "url": "https://knowledgepaat.com/",
      "name": "KnowledgePaat",
      "alternateName": ["Knowledge Paat", "knowledgepaat", "knowledge paat", "KnowledgePaat Platform"],
      "description": "KnowledgePaat is an online platform for students to learn, prepare for jobs and interviews, access useful resources, discover opportunities, and build their careers.",
      "publisher": {
        "@id": "https://knowledgepaat.com/#organization",
      },
      "inLanguage": "en-US",
    },
    {
      "@type": "Organization",
      "@id": "https://knowledgepaat.com/#organization",
      "name": "KnowledgePaat",
      "alternateName": ["Knowledge Paat", "knowledgepaat", "knowledge paat"],
      "url": "https://knowledgepaat.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://knowledgepaat.com/brand/knowledgepaat_logo.png",
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
        <GoogleAnalytics />
        <ThemeProvider>
          <FeatureFlagProvider>
            {children}
          </FeatureFlagProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}