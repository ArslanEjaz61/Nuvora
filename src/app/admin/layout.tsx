import { redirect } from "next/navigation";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  const user = await getCurrentUser();
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : "Admin";

  return (
    <ToastProvider>
      <AdminShell adminName={name || "Admin"} adminEmail={user?.email ?? ""}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
