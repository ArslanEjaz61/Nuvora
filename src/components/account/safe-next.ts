/**
 * Only ever redirect to a path on this site — a raw `?next=` is attacker
 * controlled, and `//evil.com` is a valid protocol-relative URL.
 */
export function safeNext(value: string | string[] | undefined, fallback = "/account") {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
