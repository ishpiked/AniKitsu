"use client";

import * as React from "react";
import Link from "next/link";
import { useKitsu } from "@/hooks/use-kitsu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelEmpty } from "@/components/charts";
import { AdminState } from "@/components/admin-state";
import { StatusBadge } from "@/components/status";
import {
  formatAgo,
  formatDuration,
  formatNumber,
  formatUtc,
} from "@/lib/kitsu/derive";
import type { AdminRoom, AdminRoomsResponse } from "@/lib/kitsu/types";
import { cn } from "cn";

export interface Initial<T> {
  data: T | null;
  error: string | null;
  code?: string | null;
}

const PAGE_SIZE = 20;

function presenceLabel(value: boolean | null | undefined): string {
  if (value === true) return "present";
  if (value === false) return "absent";
  return "unknown";
}

export default function RoomsView({
  initialRooms,
  initialOffset,
  fetchedAt,
}: {
  initialRooms: Initial<AdminRoomsResponse>;
  initialOffset: number;
  fetchedAt: number | null;
}) {
  const [offset, setOffset] = React.useState(initialOffset);
  const [paused, setPaused] = React.useState(false);
  const rooms = useKitsu<AdminRoomsResponse>("api/admin/rooms", {
    query: { limit: PAGE_SIZE, offset },
    paused,
    initialData:
      offset === initialOffset ? (initialRooms.data ?? undefined) : undefined,
    initialError:
      offset === initialOffset ? initialRooms.error : null,
    initialCode:
      offset === initialOffset ? initialRooms.code : null,
    initialAt: offset === initialOffset ? fetchedAt : null,
  });

  // Tolerate a bare-array envelope as well as the object form.
  const raw = rooms.data as unknown;
  const list = (
    Array.isArray(raw) ? raw : ((raw as AdminRoomsResponse | null)?.rooms ?? [])
  ) as AdminRoom[];
  const envelope = (
    !Array.isArray(raw) ? (raw as AdminRoomsResponse | null) : null
  );
  const scope = envelope?.scope ?? "this_process";
  const total =
    typeof envelope?.total === "number" ? envelope.total : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Watch Together
          </h1>
          <p className="text-sm text-muted-foreground">
            Live room summaries from the room service, process-local
            {scope ? ` (${scope})` : ""}. The player WebSocket is never
            joined or duplicated from here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={rooms.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {rooms.sessionExpired ? (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          Operator session expired.{" "}
          <Link href="/login" className="underline">
            Sign in again
          </Link>
          .
        </p>
      ) : null}

      {rooms.data ? (
        <>
          {list.length === 0 ? (
            <PanelEmpty
              title="No active rooms"
              detail="The room service reports zero live rooms on this backend process right now."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((room) => (
                <Card key={room.room_id}>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {room.origin?.type ?? "unknown origin"}
                      </Badge>
                      {room.locked === true ? (
                        <Badge variant="outline">locked</Badge>
                      ) : null}
                      <StatusBadge
                        status={room.playback?.state ?? null}
                      />
                    </CardDescription>
                    <CardTitle className="text-base">
                      {room.title?.name ?? "Untitled context"}
                      {room.title?.media_type
                        ? ` · ${room.title.media_type}`
                        : ""}
                      {typeof room.title?.season === "number"
                        ? ` S${room.title.season}`
                        : ""}
                      {typeof room.title?.episode === "number"
                        ? ` E${room.title.episode}`
                        : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm">
                    <p>
                      Participants:{" "}
                      <strong className="tabular-nums">
                        {formatNumber(room.participant_count)}
                      </strong>{" "}
                      · host {presenceLabel(room.host_present)}
                      {room.cohost_present === true ? " · co-host present" : ""}
                    </p>
                    <p className="text-muted-foreground">
                      Position{" "}
                      {room.playback?.position_seconds !== null &&
                      room.playback?.position_seconds !== undefined
                        ? formatDuration(room.playback.position_seconds)
                        : "—"}
                      {room.playback?.idle_expires_at
                        ? ` · idles out ${formatAgo(room.playback.idle_expires_at)}`
                        : ""}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {room.room_id}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() =>
                setOffset((o) => Math.max(0, o - PAGE_SIZE))
              }
            >
              Previous
            </Button>
            <span className="text-muted-foreground tabular-nums">
              Offset {offset}
              {total !== null ? ` of ${total}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                total !== null
                  ? offset + PAGE_SIZE >= total
                  : list.length < PAGE_SIZE
              }
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </Button>
            {envelope?.generated_at ? (
              <span className="ml-auto text-xs text-muted-foreground">
                Generated {formatUtc(envelope.generated_at)}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <AdminState
          code={rooms.errorCode}
          error={rooms.error}
          onRetry={rooms.refresh}
        />
      )}

      <p className={cn("text-xs text-muted-foreground")}>
        Room summaries carry context only: no participant credentials, no
        share tokens, no stream URLs. A membership-verification failure is
        retryable and distinct from a confirmed non-member.
      </p>
    </div>
  );
}
