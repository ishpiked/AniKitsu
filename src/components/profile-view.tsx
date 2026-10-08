"use client";

import * as React from "react";
import { KpiCard, PanelError, PanelLoading } from "@/components/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PersonalProfile } from "@/lib/kitsu/types";
import { formatUtc } from "@/lib/kitsu/derive";

function errorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return null;
  }
  return typeof payload.error === "string" ? payload.error : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableSeconds(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

function isPersonalProfile(value: unknown): value is PersonalProfile {
  if (!isRecord(value)) return false;
  const user = value.user;
  const requests = value.watch_requests;
  const watchTime = value.watch_time_seconds;
  if (
    !isRecord(user) ||
    !Number.isSafeInteger(user.user_id) ||
    typeof user.user_id !== "number" ||
    !isNullableString(user.first_name) ||
    !isNullableString(user.username) ||
    !isNullableString(user.first_seen) ||
    !isNullableString(user.last_active) ||
    !isRecord(requests) ||
    !Number.isSafeInteger(requests.movies) ||
    typeof requests.movies !== "number" ||
    !Number.isSafeInteger(requests.series) ||
    typeof requests.series !== "number" ||
    !Number.isSafeInteger(requests.total) ||
    typeof requests.total !== "number" ||
    !isRecord(watchTime) ||
    !isNullableSeconds(watchTime.movies) ||
    !isNullableSeconds(watchTime.series) ||
    !isNullableSeconds(watchTime.total) ||
    !Array.isArray(value.recent_watches) ||
    !Array.isArray(value.recent_activity)
  ) {
    return false;
  }
  return (
    value.recent_watches.every(
      (watch) =>
        isRecord(watch) &&
        typeof watch.title === "string" &&
        typeof watch.media_type === "string" &&
        (watch.season === null || typeof watch.season === "number") &&
        (watch.episode === null || typeof watch.episode === "number") &&
        isNullableString(watch.updated_at) &&
        (watch.completed === null || typeof watch.completed === "boolean")
    ) &&
    value.recent_activity.every(
      (activity) =>
        isRecord(activity) &&
        typeof activity.event_type === "string" &&
        typeof activity.timestamp === "string"
    )
  );
}

function formatWatchTime(seconds: number | null): string {
  if (seconds === null) return "Unavailable";
  const totalMinutes = Math.floor(seconds / 60);
  if (seconds > 0 && totalMinutes === 0) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const dayLabel = days === 1 ? "day" : "days";
  return remainingHours > 0
    ? `${days} ${dayLabel} ${remainingHours} hr`
    : `${days} ${dayLabel}`;
}

export default function ProfileView() {
  const [profile, setProfile] = React.useState<PersonalProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/kitsu/profile", { cache: "no-store" })
      .then(async (response) => {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error("Profile service returned an unreadable response.");
        }
        if (!response.ok) {
          throw new Error(
            errorMessage(payload) ?? `Profile request failed (${response.status}).`
          );
        }
        if (!isPersonalProfile(payload)) {
          throw new Error("Profile service returned unexpected data.");
        }
        return payload;
      })
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Profile request failed."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading && profile === null) return <PanelLoading lines={5} />;
  if (error && profile === null) {
    return (
      <PanelError
        message={error}
        onRetry={() => setRefreshKey((current) => current + 1)}
      />
    );
  }
  if (!profile) {
    return (
      <PanelError
        message="Profile data was not returned."
        onRetry={() => setRefreshKey((current) => current + 1)}
      />
    );
  }

  const displayName =
    profile.user.first_name ??
    (profile.user.username ? `@${profile.user.username}` : "Kitsu viewer");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
          <CardDescription>
            Telegram user ID {profile.user.user_id}
            {profile.user.username ? ` · @${profile.user.username}` : ""}
            {profile.user.first_seen
              ? ` · Member since ${formatUtc(profile.user.first_seen)}`
              : ""}
            {profile.user.last_active
              ? ` · Last active ${formatUtc(profile.user.last_active)}`
              : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <section
        aria-label="Personal watch statistics"
        className="grid gap-3 sm:grid-cols-3"
      >
        <KpiCard
          label="Watch requests"
          value={profile.watch_requests.total.toLocaleString()}
          sub="Recorded movie and series requests"
        />
        <KpiCard
          label="Movie requests"
          value={profile.watch_requests.movies.toLocaleString()}
        />
        <KpiCard
          label="Series requests"
          value={profile.watch_requests.series.toLocaleString()}
        />
      </section>

      <section aria-label="Measured watch time" className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Measured watch time</h2>
          <p className="text-sm text-muted-foreground">
            Heartbeat-recorded playback activity, not proof of watching.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total"
            value={formatWatchTime(profile.watch_time_seconds.total)}
          />
          <KpiCard
            label="Movies"
            value={formatWatchTime(profile.watch_time_seconds.movies)}
          />
          <KpiCard
            label="Series"
            value={formatWatchTime(profile.watch_time_seconds.series)}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent watches</CardTitle>
            <CardDescription>
              The latest saved watch and resume entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.recent_watches.length > 0 ? (
              <ul className="divide-y">
                {profile.recent_watches.map((watch, index) => (
                  <li
                    key={`${watch.title}-${watch.season ?? ""}-${watch.episode ?? ""}-${index}`}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{watch.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {watch.media_type === "series" &&
                        watch.season !== null &&
                        watch.episode !== null
                          ? `Season ${watch.season}, episode ${watch.episode}`
                          : watch.media_type}
                        {watch.completed ? " · Completed" : ""}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {watch.updated_at
                        ? formatUtc(watch.updated_at)
                        : "Date unavailable"}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved watch history yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>
              Latest activity recorded for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.recent_activity.length > 0 ? (
              <ul className="divide-y">
                {profile.recent_activity.map((activity, index) => (
                  <li
                    key={`${activity.event_type}-${activity.timestamp}-${index}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm">
                      {activity.event_type.replaceAll("_", " ")}
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {formatUtc(activity.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {error ? (
        <p role="status" className="text-sm text-muted-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
