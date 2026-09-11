import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin, type SessionPayload } from "@/lib/auth";
import { connectDB } from "@/lib/db";

/** Every admin page guards itself; the layout and middleware are only extra gates. */
export async function requireAdminPage(nextPath = "/admin"): Promise<SessionPayload> {
  let session: SessionPayload;
  try {
    session = await requireAdmin();
  } catch {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  await connectDB();
  return session;
}
