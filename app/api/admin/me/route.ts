import { isAdminRequest } from "@/lib/admin";

// Whether the caller is the site's admin — all the browser ever learns about it.
export async function GET(request: Request) {
  return Response.json({ admin: await isAdminRequest(request) }, { headers: { "Cache-Control": "no-store" } });
}
