import { createSign } from "crypto";

export interface IndexNowResult {
  success: boolean;
  message: string;
  platform: string;
  submissions?: IndexNowResult[];
}

const SUBMIT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = SUBMIT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitToIndexNow(url: string, host: string, key?: string): Promise<IndexNowResult> {
  const apiKey = key || makeKey(host);
  const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${apiKey}`;

  try {
    const res = await fetchWithTimeout(indexNowUrl);
    if (res.ok || res.status === 202) {
      return { success: true, message: "Submitted to IndexNow", platform: "indexnow" };
    }
    return { success: false, message: `IndexNow responded with ${res.status}`, platform: "indexnow" };
  } catch {
    return { success: false, message: "IndexNow request failed", platform: "indexnow" };
  }
}

function makeKey(host: string): string {
  return "ranklens-" + host.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

export async function submitToBing(url: string, host: string): Promise<IndexNowResult> {
  const key = makeKey(host);
  try {
    const res = await fetchWithTimeout(
      `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${encodeURIComponent(key)}`,
    );
    if (res.ok || res.status === 202) {
      return { success: true, message: "Submitted to Bing via IndexNow", platform: "bing" };
    }
    return { success: false, message: `Bing responded with ${res.status}`, platform: "bing" };
  } catch {
    return { success: false, message: "Bing submission failed", platform: "bing" };
  }
}

export async function submitToYandex(url: string, host: string): Promise<IndexNowResult> {
  const key = makeKey(host);
  try {
    const res = await fetchWithTimeout(
      `https://yandex.com/indexnow?url=${encodeURIComponent(url)}&key=${encodeURIComponent(key)}`,
    );
    if (res.ok || res.status === 202) {
      return { success: true, message: "Submitted to Yandex", platform: "yandex" };
    }
    return { success: false, message: `Yandex responded with ${res.status}`, platform: "yandex" };
  } catch {
    return { success: false, message: "Yandex submission failed", platform: "yandex" };
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function rs256Sign(payload: object, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 3600 };
  const signatureInput = base64UrlEncode(JSON.stringify(header)) + "." + base64UrlEncode(JSON.stringify(jwtPayload));
  const sign = createSign("RSA-SHA256");
  sign.update(signatureInput);
  const sig = sign.sign(privateKey, "base64");
  return signatureInput + "." + base64UrlEncode(sig);
}

export interface GoogleServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export async function submitToGoogle(url: string, sa: GoogleServiceAccountKey): Promise<IndexNowResult> {
  try {
    if (!sa.client_email || !sa.private_key) {
      return { success: false, message: "Invalid service account key: missing client_email or private_key", platform: "google" };
    }

    const scope = "https://www.googleapis.com/auth/indexing";
    const jwt = rs256Sign(
      {
        iss: sa.client_email,
        sub: sa.client_email,
        scope,
        aud: "https://oauth2.googleapis.com/token",
      },
      sa.private_key,
    );

    const tokenRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return { success: false, message: `Google auth failed: ${text}`, platform: "google" };
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const indexingRes = await fetchWithTimeout(
      "https://indexing.googleapis.com/v3/urlNotifications:publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url,
          type: "URL_UPDATED",
        }),
      },
    );

    if (indexingRes.ok) {
      return { success: true, message: "Submitted to Google Indexing API", platform: "google" };
    }

    const errText = await indexingRes.text();
    return { success: false, message: `Google Indexing API error: ${errText}`, platform: "google" };
  } catch (err: any) {
    return { success: false, message: `Google submission failed: ${err.message}`, platform: "google" };
  }
}

export async function submitUrl(url: string, platform: string, googleCreds?: any): Promise<IndexNowResult> {
  const host = new URL(url).hostname;
  if (typeof googleCreds === "string") {
    try { googleCreds = JSON.parse(googleCreds); } catch { googleCreds = undefined; }
  }

  switch (platform) {
    case "bing":
      return submitToBing(url, host);
    case "yandex":
      return submitToYandex(url, host);
    case "indexnow":
      return submitToIndexNow(url, host);
    case "google":
      if (googleCreds) {
        return submitToGoogle(url, googleCreds);
      }
      return { success: false, message: "Google submission requires service account key", platform: "google" };
    case "all":
      const results = await Promise.all([
        submitToBing(url, host),
        submitToYandex(url, host),
        submitToIndexNow(url, host),
      ]);
      return {
        success: results.some((r) => r.success),
        message: results.map((r) => `${r.platform}: ${r.success ? "ok" : "fail"} (${r.message})`).join("; "),
        platform: "all",
        submissions: results,
      };
    default:
      return submitToBing(url, host);
  }
}
