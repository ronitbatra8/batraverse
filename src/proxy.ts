import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const upstream = new URL(`${pathname}${search}`, `${API_BASE}/`);
  return fetch(upstream, {
    headers: { "ngrok-skip-browser-warning": "true" },
    cache: "no-store",
  })
    .then((res) => {
      const headers = new Headers();
      const ct = res.headers.get("content-type");
      if (ct) headers.set("Content-Type", ct);
      headers.set("Cache-Control", "public, max-age=3600, immutable");
      if (res.status !== 200) return new NextResponse(null, { status: res.status });
      return new NextResponse(res.body, { status: 200, headers });
    })
    .catch(() => new NextResponse(null, { status: 404 }));
}

export const config = {
  matcher: "/uploads/:path*",
};