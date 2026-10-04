import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const metadata = {
  title: "Dev sign in · Kitsu",
};

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const secret = process.env.DASHBOARD_SESSION_SECRET ?? "";
  const store = await cookies();
  if (
    (await verifySession(store.get(SESSION_COOKIE)?.value, secret)) !== null
  ) {
    redirect("/dev");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <span className="flex items-center gap-2">
        <Logo />
        <span className="text-sm font-medium tracking-tight">Kitsu · dev</span>
      </span>
      <LoginForm />
    </main>
  );
}
