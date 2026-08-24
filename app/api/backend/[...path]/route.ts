import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/config";

/**
 * The backend's Origin allowlist covers the old Vite dev server (localhost:5173)
 * and production, but not this app's dev/prod origins — direct browser fetches
 * get a 403. Server-to-server requests have no Origin header and aren't affected,
 * so this route proxies the handful of genuinely client-side calls (live search
 * suggestions, "check for new episodes", actor latest-works, etc.) through our
 * own same-origin API instead of hitting the gateway directly from the browser.
 */
async function proxy(request: NextRequest, path: string[]) {
  const targetUrl = `${API_BASE_URL}/${path.join("/")}${request.nextUrl.search}`;

  const init: RequestInit = { method: request.method };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.headers = { "Content-Type": "application/json" };
    init.body = await request.text();
  }

  try {
    const response = await fetch(targetUrl, init);
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}
