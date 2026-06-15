import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AmorphSentiment · a living sentiment organism",
  description:
    "An amorphous, bioluminescent sentiment analysis demo. Feed it text and watch a living organism bloom, spike, or drift with the mood.",
  openGraph: {
    title: "AmorphSentiment",
    description:
      "A living, blob-like sentiment analysis organism built with Next.js, React Three Fiber and shaders.",
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
      <body className="h-full bg-[#03040a] font-sans text-white">{children}</body>
    </html>
  );
}
