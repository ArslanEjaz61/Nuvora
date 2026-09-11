import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Unexpected failures are logged in full but never described to the client. */
export function serverError(scope: string, err: unknown) {
  console.error(`[api:${scope}]`, err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/** Maps the sentinel errors thrown by requireUser/requireAdmin to HTTP codes. */
export function authError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return jsonError("You need to be signed in.", 401);
  }
  if (err instanceof Error && err.message === "FORBIDDEN") {
    return jsonError("You don't have access to that.", 403);
  }
  return null;
}

export function tooManyRequests(retryAfter: number, message = "Too many requests. Try again later.") {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export function parseWith<T>(schema: ZodType<T>, payload: unknown): ParseResult<T> {
  try {
    return { ok: true, data: schema.parse(payload) };
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: issue?.message ?? "That input isn't valid.",
            field: issue?.path?.join("."),
          },
          { status: 400 }
        ),
      };
    }
    throw err;
  }
}

export function pageParams(url: URL, defaultLimit = 12, maxLimit = 50) {
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const rawLimit = Number(url.searchParams.get("limit") ?? defaultLimit);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)))
    : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/** Strips markup so user text is only ever stored and re-rendered as plain text. */
export function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
