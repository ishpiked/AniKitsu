import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { isOwnerUser } from "@/lib/owner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  return NextResponse.json(
    {
      authenticated: session !== null,
      isOwner: session !== null && isOwnerUser(session.userId),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
