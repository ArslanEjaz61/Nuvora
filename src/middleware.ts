import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nuvora_session";

// src/lib/auth.ts imports "server-only", which cannot run on the edge runtime,
// so the token is verified here with jose directly rather than reused from there.
function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function readRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const role = await readRole(req);

  if (role === "admin") return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { error: role ? "You don't have access to that." : "You need to be signed in." },
      { status: role ? 403 : 401 }
    );
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
