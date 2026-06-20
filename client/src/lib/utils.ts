import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a user-entered URL. Prepends a protocol when missing —
 * `http://` for local/private hosts (localhost, 127.x, LAN IPs, which rarely
 * have TLS) and `https://` for everything else.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const host = trimmed.split("/")[0]!.toLowerCase();
  const isLocal =
    /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host === "localhost" ||
    host.startsWith("localhost:");

  return `${isLocal ? "http" : "https"}://${trimmed}`;
}
