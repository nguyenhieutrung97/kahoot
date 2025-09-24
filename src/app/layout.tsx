import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ClientProviders from "./ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BD Kahoot - Interactive Quiz Game",
    template: "%s | BD Kahoot"
  },
  description: "An interactive quiz game platform where players can join rooms, answer questions, and compete on leaderboards.",
  keywords: ["quiz", "game", "education", "interactive", "learning", "competition"],
  authors: [{ name: "DevLikeCode" }],
  creator: "DevLikeCode",
  publisher: "DevLikeCode",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "BD Kahoot - Interactive Quiz Game",
    description: "An interactive quiz game platform where players can join rooms, answer questions, and compete on leaderboards.",
    siteName: "BD Kahoot",
  },
  twitter: {
    card: "summary_large_image",
    title: "BD Kahoot - Interactive Quiz Game",
    description: "An interactive quiz game platform where players can join rooms, answer questions, and compete on leaderboards.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  );
}
