import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PanelEmpty } from "@/components/charts";

export const metadata = {
  title: "Watch Together · Kitsu operator",
};

export default function RoomsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Watch Together</h1>
        <p className="text-sm text-muted-foreground">
          Live room visibility for operators.
        </p>
      </div>

      <PanelEmpty
        title="No room-summary source yet"
        detail="There is no safe backend endpoint for live rooms. Room state lives on the player WebSocket (/api/party), which this dashboard must not join or duplicate. Add a read-only summary endpoint (for example /api/admin/v1/rooms) before building this view."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            What the endpoint should return
          </CardTitle>
          <CardDescription>
            Contract for the future backend work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>Room id, origin (group or inline host), and title context.</li>
            <li>Participant count, host/co-host presence, and locked state.</li>
            <li>Playback state (playing/paused), position, and idle expiry.</li>
            <li>
              Never expose participant credentials, Telegram identifiers beyond
              what moderation needs, share tokens, or stream URLs.
            </li>
            <li>
              Distinguish membership-verification failures (retryable) from
              confirmed non-members.
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Room controls reference:{" "}
        <Link href="/dev/catalog" className="font-medium underline">
          Watch Together section of the feature catalog
        </Link>
        .
      </p>
    </div>
  );
}
