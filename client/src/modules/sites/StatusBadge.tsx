import type { SiteStatus } from "./types";

export function StatusBadge({ status }: { status: SiteStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
