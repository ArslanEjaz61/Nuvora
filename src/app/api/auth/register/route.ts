import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { jsonError, parseWith, readJson, serverError, tooManyRequests } from "../../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many sign-up attempts. Try again later.");
    }

    const parsed = parseWith(registerSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { firstName, lastName, email, password, marketingOptIn } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) return jsonError("An account with that email already exists.", 409);

    let user;
    try {
      user = await User.create({
        firstName,
        lastName,
        email,
        passwordHash: await hashPassword(password),
        // Role is never read from the body — self-registration is always a customer.
        role: "customer",
        marketingOptIn,
      });
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
        return jsonError("An account with that email already exists.", 409);
      }
      throw err;
    }

    await createSession({
      userId: String(user._id),
      email: user.email,
      role: "customer",
      firstName: user.firstName,
    });

    // Pulls the guest cart across to the new account.
    await getOrCreateCart();

    return NextResponse.json(
      {
        user: {
          id: String(user._id),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return serverError("auth/register", err);
  }
}
