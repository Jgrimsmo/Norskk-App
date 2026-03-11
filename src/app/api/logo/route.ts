/**
 * GET /api/logo?url=<firebase-storage-download-url>
 *
 * Server-side proxy for Firebase Storage images.
 * Bypasses CORS restrictions that block client-side fetches
 * from Codespaces / preview domains.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only proxy Firebase Storage URLs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed =
    ALLOWED_HOSTS.includes(parsed.hostname) ||
    parsed.hostname.endsWith(".firebasestorage.app");

  if (!isAllowed) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
