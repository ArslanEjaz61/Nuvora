import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { User, type IUser } from "@/models/User";
import { authError, jsonError, parseWith, readJson, serverError } from "../_lib/http";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(60).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  marketingOptIn: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireUser();

    const parsed = parseWith(profileSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;

    const update: Partial<Pick<IUser, "firstName" | "lastName" | "phone" | "marketingOptIn">> = {};
    if (parsed.data.firstName !== undefined) update.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) update.lastName = parsed.data.lastName;
    if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;
    if (parsed.data.marketingOptIn !== undefined) update.marketingOptIn = parsed.data.marketingOptIn;

    if (Object.keys(update).length === 0) return jsonError("Nothing to update.", 400);

    await connectDB();
    const user = await User.findByIdAndUpdate(session.userId, { $set: update }, { new: true })
      .lean<IUser | null>()
      .exec();

    if (!user) return jsonError("Account not found.", 404);

    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone ?? "",
        marketingOptIn: user.marketingOptIn,
      },
    });
  } catch (err) {
    return authError(err) ?? serverError("account:PATCH", err);
  }
}
