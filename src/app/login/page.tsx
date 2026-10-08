import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { isOwnerUser } from "@/lib/owner";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const metadata = {
  title: "Sign in · Kitsu",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requestedNext = (await searchParams).next;
  const nextPath =
    requestedNext === "/profile" || requestedNext === "/dev"
      ? requestedNext
      : null;
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value, secret);
  if (session !== null) {
    redirect(
      isOwnerUser(session.userId) && nextPath !== "/profile"
        ? "/dev"
        : "/profile"
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <span className="flex items-center gap-2">
        <Logo className="size-10" />
        <span className="text-sm font-medium tracking-tight">Kitsu</span>
      </span>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
