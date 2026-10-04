import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Kitsu",
    template: "%s · Kitsu",
  },
  description:
    "Kitsu: Telegram-native title discovery, streaming, and Watch Together.",
  openGraph: {
    type: "website",
    siteName: "Kitsu",
    title: "Kitsu · Find it. Resolve it. Watch it together.",
    description:
      "Telegram-native title discovery and streaming engine with synced Watch Together rooms.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitsu · Find it. Resolve it. Watch it together.",
    description:
      "Telegram-native title discovery and streaming engine with synced Watch Together rooms.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider>
            <SiteHeader />
            {children}
          </TooltipProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
