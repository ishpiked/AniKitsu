import { NextResponse } from "next/server";
import { BACKEND_TIMEOUT_MS, backendBaseUrl } from "@/lib/kitsu/client";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await context.params;
  if (!/^[0-9a-f]{24}$/.test(imageId)) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  let response: Response;
  try {
    response = await fetch(
      `${backendBaseUrl()}/api/blog/images/${imageId}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        headers: { accept: "image/jpeg,image/png,image/gif,image/webp" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Blog image storage is temporarily unavailable." },
      { status: 502 }
    );
  }
  if (response.status === 404) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: `Backend responded ${response.status}.` },
      { status: 502 }
    );
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0];
  if (!contentType || !IMAGE_TYPES.has(contentType) || !response.body) {
    return NextResponse.json(
      { error: "Backend returned an invalid blog image." },
      { status: 502 }
    );
  }
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
