import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TelegramScript } from "@/components/telegram-script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    "Discover movies, series, and anime with Kitsu. Explore available playback sources, watch in your browser, and start synced rooms through Telegram.",
  openGraph: {
    type: "website",
    siteName: "Kitsu",
    title: "Kitsu | Discover something. Watch together.",
    description:
      "Discover movies, series, and anime. Explore available playback sources and watch in sync through Telegram.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitsu | Discover something. Watch together.",
    description:
      "Discover movies, series, and anime. Explore available playback sources and watch in sync through Telegram.",
  },
};

export const viewport: Viewport = {
  themeColor: "#090909",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <SiteHeader />
          {children}
        </TooltipProvider>
        <Toaster />
        <TelegramScript />
      </body>
    </html>
  );
}
