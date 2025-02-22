import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Healja - Mental Health Support",
  description: "Get a calming, rational perspective on your concerns.",
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ECEFF4' },
    { media: '(prefers-color-scheme: dark)', color: '#2E3440' }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ECEFF4" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#2E3440" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
