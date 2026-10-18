import type { DisputeReason, Tab, TxnFilter } from "../types";

export const PERIOD_OPTIONS = [3, 6] as const;

export const ICON = { warning: "⚠", info: "ⓘ" } as const;

export const NO_FILTER: TxnFilter = { query: "" };

export const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "disputes", label: "Disputes" },
];

export const TOOL = {
  overview: "get-overview",
  transactions: "get-transactions",
  dispute: "dispute-transaction",
  disputes: "get-disputes",
} as const;

export const CHART = {
  width: 640,
  height: 220,
  left: 44,
  bottom: 26,
  top: 12,
  maxBarWidth: 26,
  corner: 4,
  axisStep: 1000,
} as const;

export const DISPUTE_REASONS: Record<DisputeReason, string> = {
  duplicate: "Charged twice",
  "not-recognised": "I don't recognise it",
  "wrong-amount": "Wrong amount",
  other: "Other",
};

export const WHAT_IF_EXCLUDED_CATEGORIES = ["Housing", "Utilities"];
export const WHAT_IF_DEFAULT_CATEGORY = "Dining";
export const WHAT_IF_DEFAULT_PERCENT = 20;
export const WHAT_IF_MAX_PERCENT = 50;
export const WHAT_IF_STEP_PERCENT = 5;
export const TXN_FETCH_DEBOUNCE_MS = 150;

export const REQUEST_TIMEOUT_MS = 15_000;
export const CONNECT_TIMEOUT_MS = 10_000;
export const FIRST_RESULT_WAIT_MS = 3_000;
export const MAX_MESSAGE_LENGTH = 160;
