import { BackendError, getAdminRooms } from "@/lib/kitsu/client";
import type { AdminRoomsResponse } from "@/lib/kitsu/types";
import RoomsView, { type Initial } from "./view";

export const metadata = {
  title: "Watch Together · Kitsu dev",
};

const PAGE_SIZE = 20;

function normalize(value: unknown): AdminRoomsResponse {
  if (Array.isArray(value)) return { rooms: value };
  if (value !== null && typeof value === "object") {
    const rooms = (value as { rooms?: unknown }).rooms;
    return { ...(value as object), rooms: Array.isArray(rooms) ? rooms : [] };
  }
  return { rooms: [] };
}

export default async function RoomsPage() {
  let initial: Initial<AdminRoomsResponse>;
  try {
    initial = { data: normalize(await getAdminRooms(PAGE_SIZE, 0)), error: null };
  } catch (err) {
    initial = {
      data: null,
      error: err instanceof Error ? err.message : "Request failed.",
      code:
        err instanceof BackendError && err.status === 503
          ? "not-configured"
          : null,
    };
  }

  const generated = initial.data?.generated_at;
  const generatedMs = generated ? Date.parse(generated) : NaN;

  return (
    <RoomsView
      initialRooms={initial}
      initialOffset={0}
      fetchedAt={Number.isFinite(generatedMs) ? generatedMs : null}
    />
  );
}
