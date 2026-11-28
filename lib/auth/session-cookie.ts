/**
 * Whether the request carries a Clerk session: clerk-js keeps a
 * `__client_uat` cookie (also suffixed, `__client_uat_<id>`, per instance)
 * on our domain holding the time of the last sign-in, and sets it to "0" on
 * sign-out. Never set for someone who has never signed in. Only a hint for
 * whether to load Clerk (lib/auth/auth-root.tsx) — never for authorization,
 * which the API routes do with the session token itself (lib/clerk-auth.ts).
 */
export function hasClerkSession(cookies: { name: string; value: string }[]): boolean {
  return cookies.some(({ name, value }) => /^__client_uat(_|$)/.test(name) && value !== "" && value !== "0");
}
