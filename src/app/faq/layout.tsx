import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ · Kitsu",
  description:
    "Answers about the Bedrot migration, the Telegram bot, accounts, and the Kitsu status pages.",
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
