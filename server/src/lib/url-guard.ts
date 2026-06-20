import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { env } from "./env.js";

// ======================================================
// SSRF PROTECTION
//
// Untrusted URLs come straight from the request body and
// are fetched server-side (both via plain fetch and via a
// headless Chrome that Lighthouse drives). Without guards
// an attacker could point us at internal services, cloud
// metadata endpoints (169.254.169.254), or localhost.
//
// We validate twice:
//   1. assertSafeUrl()  — protocol + hostname shape, called
//      synchronously at the route boundary for a fast 400.
//   2. assertSafeResolvedHost() — resolves DNS and rechecks
//      every returned IP, and re-runs on each redirect hop.
//
// Residual: a strong mitigation, not a complete defense against
// DNS rebinding — `fetch` performs its own resolution after our
// check, so a sub-second TTL flip between validation and connect
// is still theoretically possible. Fully closing it would require
// pinning the connection to the validated IP.
// ======================================================

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
]);

/**
 * Whether local/private URLs may be analyzed. True when RankLens runs on the
 * user's own machine (dev / self-hosted), so loopback and LAN targets are the
 * user's own services. Default: allowed outside production. Override with
 * ALLOW_LOCAL_URLS = "true" | "false".
 */
export function localUrlsAllowed(): boolean {
  const flag = (env.ALLOW_LOCAL_URLS ?? "").toLowerCase();
  if (["true", "1", "yes"].includes(flag)) return true;
  if (["false", "0", "no"].includes(flag)) return false;
  return env.NODE_ENV !== "production";
}

/**
 * Returns true when the given IP address is in a private,
 * loopback, link-local, or otherwise non-public range.
 */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const a = parts[0]!;
    const b = parts[1]!;

    // 0.0.0.0/8 (current network / "this host")
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local, incl. cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 (carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24 (IETF protocol assignments), 198.18.0.0/15 (benchmarking),
    // 240.0.0.0/4 (reserved). Note 192.0.0.0/24 — NOT /16: 192.0.78.x etc. is public.
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 240) return true;

    return false;
  }

  if (family === 6) {
    const normalized = ip.toLowerCase().split("%")[0] ?? ""; // strip zone id

    // ::1 loopback, :: unspecified
    if (normalized === "::1" || normalized === "::") return true;
    // fc00::/7 unique local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    // fe80::/10 link-local
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
        normalized.startsWith("fea") || normalized.startsWith("feb")) return true;

    // IPv4-mapped (::ffff:…) and NAT64 (64:ff9b::…) — recheck the embedded IPv4
    // in BOTH dotted-decimal (::ffff:127.0.0.1) and hex (::ffff:7f00:1) forms.
    const embedded = normalized.match(/^(?:::ffff:|64:ff9b::)(.+)$/);
    if (embedded && embedded[1]) {
      const tail = embedded[1];
      if (tail.includes(".")) return isPrivateIp(tail);
      const groups = tail.split(":");
      if (groups.length === 2) {
        const hi = Number.parseInt(groups[0]!, 16);
        const lo = Number.parseInt(groups[1]!, 16);
        if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
          return isPrivateIp(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
        }
      }
      // Unrecognized embedded form — block conservatively.
      return true;
    }

    return false;
  }

  // Not a valid IP literal — caller handles hostname resolution separately.
  return false;
}

/**
 * Synchronous, fast validation of protocol and hostname shape.
 * Throws UnsafeUrlError on any disallowed input. Returns the
 * parsed URL so callers can reuse it.
 */
export function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL. Use a full address like https://example.com.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Only http:// and https:// URLs can be analyzed.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!hostname) {
    throw new UnsafeUrlError("The URL is missing a hostname.");
  }

  // When local URLs are permitted (running on the user's own machine), skip the
  // loopback/private-address rejections — the protocol guard above still stands.
  if (localUrlsAllowed()) {
    return parsed;
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new UnsafeUrlError("Local and internal addresses cannot be analyzed.");
  }

  // If the host is an IP literal, validate it immediately.
  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new UnsafeUrlError("Private, loopback, and link-local addresses cannot be analyzed.");
  }

  return parsed;
}

/**
 * Resolves the hostname and rejects if ANY resolved address is
 * private/reserved. Defeats DNS rebinding. Skips resolution when
 * the host is already an IP literal (validated in assertSafeUrl).
 */
export async function assertSafeResolvedHost(hostname: string): Promise<void> {
  // Local/self-hosted: trust the operator's own network; skip DNS rebind checks.
  if (localUrlsAllowed()) return;

  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new UnsafeUrlError("Private, loopback, and link-local addresses cannot be analyzed.");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError("The domain could not be resolved. Check the URL and try again.");
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("The domain could not be resolved. Check the URL and try again.");
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new UnsafeUrlError("This hostname resolves to a private or internal address and cannot be analyzed.");
    }
  }
}

/** Convenience: full validation (shape + DNS) in one call. */
export async function validatePublicUrl(rawUrl: string): Promise<URL> {
  const parsed = assertSafeUrl(rawUrl);
  await assertSafeResolvedHost(parsed.hostname);
  return parsed;
}
