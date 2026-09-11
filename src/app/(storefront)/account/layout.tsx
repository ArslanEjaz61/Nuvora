import type { Metadata } from "next";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your Nuvora orders, addresses and profile.",
  robots: { index: false },
};

// Each page runs its own session guard (see components/account/guard.ts) so the
// sign-in redirect can carry the exact path the customer asked for.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
