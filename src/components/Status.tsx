import {
  Check,
  Link2,
  AlertTriangle,
  RefreshCw,
  FileQuestion,
} from "lucide-react";
import { stateLabels, type ReviewState } from "../core/model";
const icons = {
  current: Check,
  unlinked: Link2,
  changed: RefreshCw,
  context: AlertTriangle,
  missing: FileQuestion,
};
export function Status({
  state,
  compact = false,
}: {
  state: ReviewState;
  compact?: boolean;
}) {
  const Icon = icons[state];
  return (
    <span
      className={`status status-${state} ${compact ? "status-compact" : ""}`}
    >
      <Icon size={13} aria-hidden="true" />
      {stateLabels[state]}
    </span>
  );
}
