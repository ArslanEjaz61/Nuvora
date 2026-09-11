import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validation";
import { ContactMessage } from "@/models/ContactMessage";
import {
  jsonError,
  parseWith,
  readJson,
  serverError,
  stripHtml,
  tooManyRequests,
} from "../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = await getClientIp();
    const limit = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter, "Too many messages sent. Try again later.");
    }

    const parsed = parseWith(contactSchema, await readJson(req));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

    // Markup is removed before storage so the admin inbox can render it as text.
    const subject = stripHtml(input.subject);
    const message = stripHtml(input.message);

    if (!subject || message.length < 10) {
      return jsonError("Tell us a little more about what you need.", 400);
    }

    await connectDB();

    await ContactMessage.create({
      name: stripHtml(input.name),
      email: input.email,
      orderNumber: input.orderNumber ? stripHtml(input.orderNumber).toUpperCase() : undefined,
      subject,
      message,
      status: "new",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return serverError("contact", err);
  }
}
