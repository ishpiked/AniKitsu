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
    "Live Kitsu service health, project updates, and operator tools while the app moves to Bedrot.",
  openGraph: {
    type: "website",
    siteName: "Kitsu",
    title: "Kitsu | Service status and updates",
    description:
      "Live health for the Kitsu API and Telegram bot, plus project updates and operator tools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitsu | Service status and updates",
    description:
      "Live health for the Kitsu API and Telegram bot, plus project updates and operator tools.",
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
