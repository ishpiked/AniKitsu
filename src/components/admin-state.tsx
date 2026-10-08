"use client";

import { PanelEmpty, PanelError } from "@/components/charts";

/**
 * Shared empty/error states for admin-API panels. The backend token lives
 * server-side, so "not configured" and "rejected" are setup problems to
 * surface plainly, never silent zeros.
 */
export function AdminState({
  code,
  error,
  onRetry,
}: {
  code: string | null | undefined;
  error: string | null;
  onRetry: () => void;
}) {
  if (code === "not-configured") {
    return (
      <PanelEmpty
        title="Admin API not configured"
        detail="Set KITSU_OWNER_API_TOKEN alongside the backend's owner API token. This panel stays empty until then."
      />
    );
  }
  if (code === "forbidden") {
    return (
      <PanelEmpty
        title="Admin credential rejected"
        detail="The backend refused the configured owner token. Check that KITSU_OWNER_API_TOKEN matches the backend secret."
      />
    );
  }
  return (
    <PanelError
      message={error ?? "The admin request failed."}
      onRetry={onRetry}
    />
  );
}
