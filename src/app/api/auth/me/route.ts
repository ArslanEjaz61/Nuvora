import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serverError } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null });

    // Explicit allow-list — passwordHash must never leave the server.
    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone ?? "",
        marketingOptIn: user.marketingOptIn,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return serverError("auth/me", err);
  }
}
