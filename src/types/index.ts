export type Severity = "warning" | "info";
export type InsightKind = "duplicate" | "price-increase" | "unusual";
export type DisputeReason =
  | "duplicate"
  | "not-recognised"
  | "wrong-amount"
  | "other";

export type Tab = "overview" | "transactions";
export interface Insight {
  kind: InsightKind;
  severity: Severity;
  title: string;
  detail: string;
  txnIds: string[];
}

export interface MonthTotals {
  month: string;
  income: number;
  spending: number;
}
export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface Overview {
  account: {
    holder: string;
    name: string;
    mask: string;
    currency: string;
    balance: number;
  };
  months: number;
  income: number;
  spending: number;
  net: number;
  savingsRate: number;
  byMonth: MonthTotals[];
  byCategory: CategoryTotal[];
  insights: Insight[];
}

export interface Dispute {
  caseId: string;
  reason: DisputeReason;
  comment: string;
}

export interface Txn {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  note?: string;
  flagged?: boolean;
  dispute?: Dispute;
}

export interface TxnQuery {
  months: number;
  category?: string;
  query?: string;
  ids?: string[];
}

export interface TxnFilter {
  category?: string;
  ids?: string[];
  label?: string;
  query: string;
}

export interface Tooltip {
  x: number;
  y: number;
  text: string;
}

export interface BarSpec {
  key: string;
  className: "s1" | "s2";
  label: string;
  path: string;
}
export interface GroupSpec {
  month: string;
  label: string;
  centerX: number;
  bars: BarSpec[];
}
export interface ChartLayout {
  ticks: { value: number; y: number; label: string }[];
  groups: GroupSpec[];
}
