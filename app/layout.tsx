import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ToastContainer from "@/components/ui/Toasts";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentinel · real-time global sentiment intelligence",
  description:
    "Live multi-source sentiment analysis across Bluesky, Reddit, Hacker News, and news feeds. Real-time LLM-powered mood tracking with 3D visualization.",
  openGraph: {
    title: "Sentinel",
    description:
      "Real-time global sentiment intelligence — live mood tracking across social media and news.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#03040a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full bg-[#03040a] font-sans text-white">
        <ErrorBoundary>
          {children}
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
