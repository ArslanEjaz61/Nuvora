import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, type IUser, type UserRole } from "@/models/User";

const SESSION_COOKIE = "nuvora_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of 32+ characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Verifies the session JWT. Returns null for anonymous or tampered cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: payload.role as UserRole,
      firstName: String(payload.firstName ?? ""),
    };
  } catch {
    return null;
  }
}

/** Loads the full user record. Use when you need more than the JWT claims. */
export async function getCurrentUser(): Promise<IUser | null> {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  return User.findById(session.userId).lean<IUser>().exec();
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/**
 * Re-reads the role from the database rather than trusting the JWT claim, so a
 * demoted admin loses access immediately instead of at token expiry.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  await connectDB();
  const user = await User.findById(session.userId).select("role").lean<{ role: UserRole }>();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");

  return session;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
