import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import { User, type IUser } from "@/models/User";
import { jsonError, parseWith, readJson, serverError, tooManyRequests } from "../../_lib/http";

export const dynamic = "force-dynamic";

const GENERIC_FAILURE = "Email or password is incorrect";

export async function POST(req: Request) {
  try {
    const parsed = parseWith(loginSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    const ip = await getClientIp();
    const limit = rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many sign-in attempts. Try again shortly.");
    }

    await connectDB();

    const user = await User.findOne({ email })
      .select("+passwordHash")
      .lean<IUser | null>()
      .exec();

    // Identical response whether the account exists or the password is wrong,
    // so the endpoint can't be used to enumerate registered emails.
    if (!user) return jsonError(GENERIC_FAILURE, 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return jsonError(GENERIC_FAILURE, 401);

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    await createSession({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    // Reading the cart now is what triggers the guest -> account merge.
    await getOrCreateCart();

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    return serverError("auth/login", err);
  }
}
