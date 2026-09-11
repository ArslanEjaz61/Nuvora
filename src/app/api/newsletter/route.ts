import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { Subscriber } from "@/models/Subscriber";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  source: z.string().trim().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = rateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await connectDB();

    // Re-subscribing is idempotent and never reveals whether the email was known.
    await Subscriber.updateOne(
      { email: parsed.data.email },
      { $set: { active: true }, $setOnInsert: { source: parsed.data.source ?? "footer" } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
