import "server-only";

/**
 * Secure by default in production. `COOKIE_SECURE=false` is an explicit,
 * temporary opt-out for serving over plain HTTP (e.g. an IP-only deployment
 * before a domain + TLS cert exist) — remove it once HTTPS is in place.
 */
export function isSecureCookie() {
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}
