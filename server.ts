import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  McpServer,
  type CallToolResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/server";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const SERVER_FILE = fileURLToPath(import.meta.url);
const DIST_DIR = SERVER_FILE.endsWith(".ts")
  ? path.join(path.dirname(SERVER_FILE), "dist")
  : path.dirname(SERVER_FILE);

export const CATEGORIES = [
  "Housing",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Utilities",
  "Subscriptions",
  "Travel",
  "Health",
] as const;
export type Category = (typeof CATEGORIES)[number] | "Income";

interface Txn {
  id: string;
  date: string;
  merchant: string;
  category: Category;
  amount: number;
  note?: string;
  dispute?: {
    caseId: string;
    reason: string;
    comment: string;
    openedAt: string;
  };
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261012);
const between = (a: number, b: number) =>
  Math.round((a + rand() * (b - a)) * 100) / 100;
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;

function monthStart(back: number): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1));
}
const iso = (y: number, m: number, day: number) =>
  new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);

const txns: Txn[] = [];
let seq = 1000;
const add = (
  date: string,
  merchant: string,
  category: Category,
  amount: number,
  note?: string,
) =>
  txns.push({
    id: `T${++seq}`,
    date,
    merchant,
    category,
    amount: Math.round(amount * 100) / 100,
    note,
  });

for (let back = 6; back >= 1; back--) {
  const s = monthStart(back);
  const y = s.getUTCFullYear(),
    m = s.getUTCMonth();
  const day = () => 1 + Math.floor(rand() * 27);

  add(iso(y, m, 1), "Northwind Payroll", "Income", 4200);
  if (rand() < 0.4)
    add(iso(y, m, 15), "Freelance invoice", "Income", between(250, 520));
  add(iso(y, m, 3), "Maple Court Rent", "Housing", -1350);
  add(iso(y, m, 8), "City Power & Light", "Utilities", -between(62, 118));
  add(iso(y, m, 9), "FiberNet Internet", "Utilities", -44.9);
  for (let i = 0; i < 8; i++)
    add(
      iso(y, m, day()),
      pick(["Fresh Basket", "Green Grocer", "Daily Mart"]),
      "Groceries",
      -between(18, 95),
    );
  for (let i = 0; i < 5; i++)
    add(
      iso(y, m, day()),
      pick(["Bistro Verde", "Noodle Bar", "Corner Cafe", "Pizza Lab"]),
      "Dining",
      -between(14, 62),
    );
  for (let i = 0; i < 4; i++)
    add(
      iso(y, m, day()),
      pick(["MetroGo Transit", "QuickFuel"]),
      "Transport",
      -between(11, 48),
    );
  for (let i = 0; i < 2; i++)
    add(
      iso(y, m, day()),
      pick(["Urban Outfit", "HomeNest", "TechShelf"]),
      "Shopping",
      -between(22, 140),
    );
  if (rand() < 0.6)
    add(iso(y, m, day()), "Apothecary Plus", "Health", -between(9, 38));
  add(iso(y, m, 12), "GymFit Membership", "Subscriptions", -39);
  add(iso(y, m, 14), "CloudBox Storage", "Subscriptions", -2.99);
  add(iso(y, m, 20), "Streamly", "Subscriptions", back <= 2 ? -13.99 : -9.99);
  if (back === 3)
    add(
      iso(y, m, 17),
      "SkyJet Airlines",
      "Travel",
      -640,
      "Flights, 2 passengers",
    );
  if (back === 1) {
    add(iso(y, m, 21), "Bistro Verde", "Dining", -48.5);
    add(iso(y, m, 21), "Bistro Verde", "Dining", -48.5);
    add(
      iso(y, m, 26),
      "QuickMart Ltd (London)",
      "Shopping",
      -389,
      "Card payment in GBP, converted",
    );
  }
}
txns.sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id),
);

const OPENING = 5200;
const balance = OPENING + txns.reduce((s, t) => s + t.amount, 0);

const monthKey = (d: string) => d.slice(0, 7);
const monthsBack = (n: number) => {
  const from = monthStart(n);
  return iso(from.getUTCFullYear(), from.getUTCMonth(), 1);
};
const inPeriod = (t: Txn, months: number) => t.date >= monthsBack(months);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

interface Insight {
  kind: "duplicate" | "price-increase" | "unusual";
  severity: "warning" | "info";
  title: string;
  detail: string;
  txnIds: string[];
}

function findInsights(): Insight[] {
  const out: Insight[] = [];
  const seen = new Map<string, Txn[]>();
  for (const t of txns)
    if (t.amount < 0) {
      const k = `${t.merchant}|${t.date}|${t.amount}`;
      seen.set(k, [...(seen.get(k) ?? []), t]);
    }
  for (const group of seen.values())
    if (group.length > 1) {
      const t = group[0]!;
      out.push({
        kind: "duplicate",
        severity: "warning",
        title: `Possible duplicate charge at ${t.merchant}`,
        detail: `${group.length} payments of ${Math.abs(t.amount).toFixed(2)} on ${t.date}.`,
        txnIds: group.map((g) => g.id),
      });
    }
  const subs = new Map<string, Txn[]>();
  for (const t of txns)
    if (t.category === "Subscriptions")
      subs.set(t.merchant, [...(subs.get(t.merchant) ?? []), t]);
  for (const [name, list] of subs) {
    const byDate = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = byDate[0]!,
      last = byDate[byDate.length - 1]!;
    if (Math.abs(last.amount) > Math.abs(first.amount) * 1.1) {
      out.push({
        kind: "price-increase",
        severity: "info",
        title: `${name} price went up`,
        detail: `From ${Math.abs(first.amount).toFixed(2)} to ${Math.abs(last.amount).toFixed(2)} per month (+${Math.round((Math.abs(last.amount) / Math.abs(first.amount) - 1) * 100)}%).`,
        txnIds: [last.id],
      });
    }
  }
  const byCat = new Map<string, number[]>();
  for (const t of txns)
    if (t.amount < 0)
      byCat.set(t.category, [
        ...(byCat.get(t.category) ?? []),
        Math.abs(t.amount),
      ]);
  for (const t of txns) {
    const xs = byCat.get(t.category);
    if (
      t.amount < 0 &&
      xs &&
      xs.length >= 8 &&
      Math.abs(t.amount) > 200 &&
      Math.abs(t.amount) > 3 * median(xs)
    ) {
      out.push({
        kind: "unusual",
        severity: "warning",
        title: `Unusually large ${t.category.toLowerCase()} payment`,
        detail: `${t.merchant}: ${Math.abs(t.amount).toFixed(2)} on ${t.date}, about ${Math.round(Math.abs(t.amount) / median(xs))}x the typical amount in this category.`,
        txnIds: [t.id],
      });
    }
  }
  return out;
}

export function overview(months: number) {
  const list = txns.filter((t) => inPeriod(t, months));
  const income = list
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const spending = -list
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0);
  const keys: string[] = [];
  for (let b = months; b >= 1; b--) {
    const d = monthStart(b);
    keys.push(iso(d.getUTCFullYear(), d.getUTCMonth(), 1).slice(0, 7));
  }
  const byMonth = keys.map((k) => {
    const inM = list.filter((t) => monthKey(t.date) === k);
    return {
      month: k,
      income: r2(
        inM.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      ),
      spending: r2(
        -inM.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
      ),
    };
  });
  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    total: r2(
      -list.filter((t) => t.category === c).reduce((s, t) => s + t.amount, 0),
    ),
    count: list.filter((t) => t.category === c).length,
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const flagged = findInsights();
  return {
    account: {
      holder: "Alex Morgan",
      name: "Everyday account",
      mask: "••4821",
      currency: "EUR",
      balance: r2(balance),
    },
    months,
    income: r2(income),
    spending: r2(spending),
    net: r2(income - spending),
    savingsRate:
      income > 0 ? Math.round(((income - spending) / income) * 100) : 0,
    byMonth,
    byCategory,
    insights: flagged,
  };
}

let caseSeq = 0;

const disputedTransactions = () =>
  txns
    .filter((t) => t.dispute)
    .sort((a, b) => (a.dispute!.openedAt < b.dispute!.openedAt ? 1 : -1));

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Spending Insights Demo",
    version: "1.0.0",
  });
  const resourceUri = "ui://spending-insights/mcp-app.html";

  registerAppTool(
    server,
    "show-spending-insights",
    {
      title: "Show spending insights",
      description:
        "Shows the customer's income and spending as an interactive view: monthly trend, spending by category, transactions, and items worth a look " +
        "(possible duplicate charges, price increases, unusually large payments). Use for questions about spending, budget, or suspicious card activity. " +
        "Demo data only. For questions about existing dispute cases use show-disputes instead. " +
        "Disputing a transaction can only be done by the customer inside the interactive view; you cannot do it on their behalf.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(1)
          .max(6)
          .optional()
          .describe("How many past months to include (1-6). Defaults to 6."),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ months }): Promise<CallToolResult> => {
      const n = months ?? 6;
      const o = overview(n);
      // content = text fallback for hosts without MCP Apps (and what the model reads).
      const text =
        `Last ${n} month(s) for ${o.account.holder} (${o.account.name} ${o.account.mask}, balance ${o.account.balance.toFixed(2)} EUR):\n` +
        `Income ${o.income.toFixed(2)}, spending ${o.spending.toFixed(2)}, net ${o.net.toFixed(2)}, savings rate ${o.savingsRate}%.\n` +
        `Top categories: ${o.byCategory
          .slice(0, 4)
          .map((c) => `${c.category} ${c.total.toFixed(2)}`)
          .join(", ")}.\n` +
        (o.insights.length
          ? `Items worth a look:\n${o.insights.map((i) => `- ${i.title}. ${i.detail}`).join("\n")}`
          : "Nothing unusual found.") +
        `\nThe customer opens disputes in the interactive view; they are not available as a chat action.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: o as unknown as Record<string, unknown>,
      };
    },
  );

  registerAppTool(
    server,
    "show-disputes",
    {
      title: "Show disputes",
      description:
        "Shows the customer's dispute cases (reference, merchant, amount, date, reason) as an interactive view. " +
        "Use for questions about disputed payments or dispute cases. Read-only: you cannot open or change a dispute.",
      inputSchema: z.object({}),
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      const list = disputedTransactions();
      const text = list.length
        ? `Dispute cases:\n${list
            .map(
              (t) =>
                `- ${t.dispute!.caseId}: ${t.merchant} ${Math.abs(t.amount).toFixed(2)} EUR on ${t.date}, reason ${t.dispute!.reason}${t.dispute!.comment ? ` (${t.dispute!.comment})` : ""}`,
            )
            .join("\n")}`
        : "No dispute cases have been opened.";
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          ...overview(6),
          view: "disputes",
        } as unknown as Record<string, unknown>,
      };
    },
  );

  registerAppTool(
    server,
    "get-disputes",
    {
      title: "Get disputes",
      description:
        "Returns all dispute cases, newest first (used by the widget).",
      inputSchema: z.object({}),
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async (): Promise<CallToolResult> => {
      const list = disputedTransactions();
      return {
        content: [{ type: "text", text: `${list.length} disputes` }],
        structuredContent: { disputes: list },
      };
    },
  );

  registerAppTool(
    server,
    "get-overview",
    {
      title: "Get overview",
      description:
        "Returns aggregates for the last N months (used by the widget).",
      inputSchema: z.object({ months: z.number().int().min(1).max(6) }),
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ months }): Promise<CallToolResult> => ({
      content: [{ type: "text", text: `Overview for ${months} months` }],
      structuredContent: overview(months) as unknown as Record<string, unknown>,
    }),
  );

  registerAppTool(
    server,
    "get-transactions",
    {
      title: "Get transactions",
      description:
        "Returns transactions for the last N months with optional filters (used by the widget).",
      inputSchema: z.object({
        months: z.number().int().min(1).max(6),
        category: z.string().optional(),
        query: z.string().optional(),
        ids: z.array(z.string()).optional(),
      }),
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ months, category, query, ids }): Promise<CallToolResult> => {
      const q = query?.trim().toLowerCase();
      const flagged = new Set(findInsights().flatMap((i) => i.txnIds));
      const list = txns
        .filter((t) => inPeriod(t, months))
        .filter((t) => !category || t.category === category)
        .filter((t) => !q || t.merchant.toLowerCase().includes(q))
        .filter((t) => !ids || ids.includes(t.id))
        .slice(0, 60)
        .map((t) => ({ ...t, flagged: flagged.has(t.id) }));
      return {
        content: [{ type: "text", text: `${list.length} transactions` }],
        structuredContent: { transactions: list },
      };
    },
  );

  registerAppTool(
    server,
    "dispute-transaction",
    {
      title: "Dispute a transaction",
      description:
        "Opens a dispute case for one transaction (used by the widget after the customer confirms).",
      inputSchema: z.object({
        transactionId: z.string(),
        reason: z.enum([
          "duplicate",
          "not-recognised",
          "wrong-amount",
          "other",
        ]),
        comment: z.string().default(""),
      }),
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ transactionId, reason, comment }): Promise<CallToolResult> => {
      const t = txns.find((x) => x.id === transactionId);
      if (!t)
        return {
          isError: true,
          content: [
            { type: "text", text: `Unknown transaction ${transactionId}` },
          ],
        };
      if (t.amount >= 0)
        return {
          isError: true,
          content: [
            { type: "text", text: "Only card payments can be disputed." },
          ],
        };
      if (t.dispute)
        return {
          isError: true,
          content: [
            { type: "text", text: `Already disputed (${t.dispute.caseId}).` },
          ],
        };
      if (reason === "other" && !comment.trim())
        return {
          isError: true,
          content: [
            { type: "text", text: "Please add a comment for reason 'other'." },
          ],
        };
      t.dispute = {
        caseId: `DSP-${String(++caseSeq).padStart(4, "0")}`,
        reason,
        comment: comment.trim(),
        openedAt: new Date().toISOString(),
      };
      return {
        content: [
          {
            type: "text",
            text: `Dispute ${t.dispute.caseId} opened for ${t.merchant} ${Math.abs(t.amount).toFixed(2)} (${reason}).`,
          },
        ],
        structuredContent: { transaction: t },
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
