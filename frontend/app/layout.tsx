import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerLaunch MVP | Get Your First Job Faster",
  description: "CareerLaunch empowers students to land their first job faster with verified opportunities and expert preparation resources.",
  openGraph: {
    title: 'CareerLaunch MVP',
    description: 'Empowering students to land their first job faster with verified opportunities and expert preparation resources.',
    url: 'https://careerlaunch.com',
    siteName: 'CareerLaunch',
    images: [
      {
        url: 'https://careerlaunch.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg text-text">
        {children}
      </body>
    </html>
  );
}