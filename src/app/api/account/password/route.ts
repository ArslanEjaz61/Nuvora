import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { User, type IUser } from "@/models/User";
import {
  authError,
  jsonError,
  parseWith,
  readJson,
  serverError,
  tooManyRequests,
} from "../../_lib/http";

export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/\d/, "Include a number"),
});

export async function POST(req: Request) {
  try {
    const session = await requireUser();

    const ip = await getClientIp();
    const limit = rateLimit(`password:${session.userId}:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many attempts. Try again later.");
    }

    const parsed = parseWith(changePasswordSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const { currentPassword, newPassword } = parsed.data;

    await connectDB();
    const user = await User.findById(session.userId)
      .select("+passwordHash")
      .lean<IUser | null>()
      .exec();

    if (!user) return jsonError("Account not found.", 404);

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return jsonError("Your current password is incorrect.", 400);

    if (await verifyPassword(newPassword, user.passwordHash)) {
      return jsonError("Choose a password you haven't used here before.", 400);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await hashPassword(newPassword) } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return authError(err) ?? serverError("account/password", err);
  }
}
