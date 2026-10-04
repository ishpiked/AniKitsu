import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ · Kitsu",
  description:
    "Honest answers about watching, Watch Together rooms, the Telegram bot, and the status pages.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
