import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin, type SessionPayload } from "@/lib/auth";
import { authError } from "@/app/api/_lib/http";

export type AdminGuard =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

/**
 * Defence in depth: middleware only checks the JWT claim, this re-reads the role
 * from the database on every admin API call.
 */
export async function guardAdmin(): Promise<AdminGuard> {
  try {
    const session = await requireAdmin();
    return { ok: true, session };
  } catch (err) {
    const res = authError(err);
    if (res) return { ok: false, response: res };
    return {
      ok: false,
      response: NextResponse.json({ error: "Something went wrong." }, { status: 500 }),
    };
  }
}
