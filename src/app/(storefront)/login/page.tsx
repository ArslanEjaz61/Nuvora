import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/AuthShell";
import { LoginForm } from "@/components/account/LoginForm";
import { safeNext } from "@/components/account/safe-next";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Nuvora account to track orders, manage addresses and see your saved pieces.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safeNext(nextParam);

  const session = await getSession();
  if (session) redirect(next);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track orders, manage addresses and pick up where you left off."
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
