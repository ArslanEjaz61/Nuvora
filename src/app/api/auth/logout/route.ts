import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { serverError } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("auth/logout", err);
  }
}
