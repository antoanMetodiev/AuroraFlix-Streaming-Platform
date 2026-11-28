import "server-only";
import { getClerkUser } from "@/lib/clerk-auth";

/**
 * The site owner's tools (subtitle sources on players / cards, the
 * subtitle-source filter) are for the admin account only. Checked on the
 * server, from the Clerk session — the browser only ever learns yes / no.
 *
 * The repository is public, so the admin's address isn't written here:
 * only its SHA-256 (lowercased, trimmed). ADMIN_EMAILS (comma-separated,
 * plain) can add more without a code change.
 */
const ADMIN_EMAIL_SHA256 = new Set(["6384a778b6155e4a94996cda64e12ec9bf813abb1623bb93c45470fd2589b20a"]);

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  let user;
  try {
    user = await getClerkUser(request);
  } catch {
    return false;
  }
  if (!user) return false;
  const extra = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
  for (const address of user.emailAddresses) {
    if (address.verification?.status !== "verified") continue;
    const email = address.emailAddress.trim().toLowerCase();
    if (extra.has(email) || ADMIN_EMAIL_SHA256.has(await sha256(email))) return true;
  }
  return false;
}

export function forbidden() {
  return Response.json({ error: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
