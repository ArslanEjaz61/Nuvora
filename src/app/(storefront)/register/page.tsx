import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/AuthShell";
import { RegisterForm } from "@/components/account/RegisterForm";
import { safeNext } from "@/components/account/safe-next";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a Nuvora account to check out faster, follow your orders and save the pieces you love.",
  robots: { index: false },
};

export default async function RegisterPage({
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
      title="Create your account"
      subtitle="Check out faster, follow your orders and keep a wishlist of the pieces you love."
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
