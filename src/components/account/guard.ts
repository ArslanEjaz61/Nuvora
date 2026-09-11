import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";

/**
 * Guards a signed-in page. Lives in the page rather than the account layout
 * because a layout can't read the current pathname, and we want `?next=` to
 * point back at the exact page the customer asked for.
 */
export async function requireSessionFor(path: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);
  return session;
}
