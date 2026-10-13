/**
 * Spending insights widget (MCP App, React).
 * Overview (KPIs, monthly chart, categories, insights, what-if) and Transactions (filter, dispute).
 */
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

interface Insight { kind: string; severity: "warning" | "info"; title: string; detail: string; txnIds: string[] }
interface Overview {
  account: { holder: string; name: string; mask: string; currency: string; balance: number };
  months: number; income: number; spending: number; net: number; savingsRate: number;
  byMonth: { month: string; income: number; spending: number }[];
  byCategory: { category: string; total: number; count: number }[];
  insights: Insight[];
}
interface Txn {
  id: string; date: string; merchant: string; category: string; amount: number; note?: string; flagged?: boolean;
  dispute?: { caseId: string; reason: string; comment: string };
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const monthLabel = (k: string) => new Date(`${k}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const REASONS = { duplicate: "Charged twice", "not-recognised": "I don't recognise it", "wrong-amount": "Wrong amount", other: "Other" } as const;

function Root() {
  const [data, setData] = useState<Overview | null>(null);
  const [ctx, setCtx] = useState<McpUiHostContext | undefined>();
  const { app, error } = useApp({
    appInfo: { name: "Spending Insights", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (a) => {
      a.ontoolresult = async (r) => { const sc = r.structuredContent as Partial<Overview> | undefined; if (sc?.byMonth) setData(sc as Overview); };
      a.onhostcontextchanged = (p) => setCtx((prev) => ({ ...prev, ...p }));
      a.onerror = console.error;
    },
  });
  useEffect(() => { if (app) setCtx(app.getHostContext()); }, [app]);
  if (error) return <main className="app"><p role="alert">Error: {error.message}</p></main>;
  if (!app || !data) return <main className="app"><p className="muted">Loading your accounts…</p></main>;
  const i = ctx?.safeAreaInsets;
  return (
    <main className="app" style={{ paddingTop: i?.top, paddingRight: i?.right, paddingBottom: i?.bottom, paddingLeft: i?.left }}>
      <Dashboard app={app} initial={data} />
    </main>
  );
}

interface Filter { category?: string; ids?: string[]; label?: string; query: string }

function Dashboard({ app, initial }: { app: App; initial: Overview }) {
  const [ov, setOv] = useState(initial);
  const [months, setMonths] = useState(initial.months);
  const [tab, setTab] = useState<"overview" | "transactions">("overview");
  const [filter, setFilter] = useState<Filter>({ query: "" });
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const call = useCallback(async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
    const res = await app.callServerTool({ name, arguments: args });
    if (res.isError) {
      const t = res.content?.find((c) => c.type === "text");
      throw new Error(t && "text" in t ? t.text : "Request failed");
    }
    return res.structuredContent as unknown as T;
  }, [app]);

  const changeMonths = async (n: number) => {
    setMonths(n); setErr(null);
    try { setOv(await call<Overview>("get-overview", { months: n })); } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
  };

  useEffect(() => {
    if (tab !== "transactions") return;
    let live = true;
    setTxns(null);
    const t = setTimeout(async () => {
      try {
        const r = await call<{ transactions: Txn[] }>("get-transactions", { months, category: filter.category, query: filter.query || undefined, ids: filter.ids });
        if (live) setTxns(r.transactions);
      } catch (e) { if (live) setErr(String(e instanceof Error ? e.message : e)); }
    }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [tab, months, filter, call]);

  const goCategory = (category: string) => { setFilter({ category, query: "", label: category }); setSelected(null); setTab("transactions"); };
  const goInsight = (i: Insight) => { setFilter({ ids: i.txnIds, query: "", label: i.title }); setSelected(i.txnIds[0] ?? null); setTab("transactions"); };

  const onDisputed = async (t: Txn) => {
    setTxns((prev) => prev?.map((x) => (x.id === t.id ? { ...x, ...t } : x)) ?? prev);
    // The model cannot see this iframe, so tell it what the customer did.
    await app.updateModelContext({
      content: [{ type: "text", text: `Customer opened dispute ${t.dispute?.caseId} for ${t.merchant} (${eur.format(Math.abs(t.amount))}) on ${t.date}. Reason: ${t.dispute?.reason}.` }],
    });
  };

  return (
    <>
      <header className="top">
        <div>
          <h1>{ov.account.name} <span className="muted">{ov.account.mask}</span></h1>
          <p className="muted">{ov.account.holder} · balance <strong>{eur.format(ov.account.balance)}</strong></p>
        </div>
        <div className="seg" role="group" aria-label="Period">
          {[3, 6].map((n) => <button key={n} aria-pressed={months === n} className={months === n ? "on" : ""} onClick={() => changeMonths(n)}>{n} months</button>)}
        </div>
      </header>
      <div className="tabs" role="tablist">
        {(["overview", "transactions"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => { if (t === "transactions" && tab !== "transactions") { setFilter({ query: "" }); setSelected(null); } setTab(t); }}>
            {t === "overview" ? "Overview" : "Transactions"}
          </button>
        ))}
      </div>
      {err && <p role="alert" className="error">{err}</p>}
      {tab === "overview" ? (
        <OverviewTab ov={ov} onCategory={goCategory} onInsight={goInsight} />
      ) : (
        <TransactionsTab txns={txns} filter={filter} setFilter={setFilter} categories={ov.byCategory.map((c) => c.category)} selected={selected} setSelected={setSelected}
          call={call} onDisputed={onDisputed} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Overview

function OverviewTab({ ov, onCategory, onInsight }: { ov: Overview; onCategory: (c: string) => void; onInsight: (i: Insight) => void }) {
  const max = ov.byCategory[0]?.total ?? 1;
  return (
    <>
      <section className="kpis" aria-label="Summary">
        <Kpi label="Income" value={eur0.format(ov.income)} />
        <Kpi label="Spending" value={eur0.format(ov.spending)} />
        <Kpi label="Net" value={eur0.format(ov.net)} />
        <Kpi label="Savings rate" value={`${ov.savingsRate}%`} />
      </section>

      <section className="card">
        <MonthlyChart data={ov.byMonth} />
      </section>

      {ov.insights.length > 0 && (
        <section className="card" aria-label="Items worth a look">
          <h2>Worth a look</h2>
          <ul className="insights">
            {ov.insights.map((i) => (
              <li key={i.title}>
                <span className={`sev ${i.severity}`} aria-hidden="true">{i.severity === "warning" ? "⚠" : "ⓘ"}</span>
                <div className="grow"><strong>{i.title}</strong><span className="sr"> ({i.severity === "warning" ? "warning" : "info"})</span><p className="muted">{i.detail}</p></div>
                <button onClick={() => onInsight(i)}>Review</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-label="Spending by category">
        <h2>Spending by category</h2>
        <ul className="cats">
          {ov.byCategory.map((c) => (
            <li key={c.category}>
              <button onClick={() => onCategory(c.category)} aria-label={`${c.category}, ${eur.format(c.total)}, ${c.count} transactions. Show transactions`}>
                <span className="cname">{c.category}</span>
                <span className="track"><span className="fill" style={{ width: `${(c.total / max) * 100}%` }} /></span>
                <span className="cval">{eur0.format(c.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <WhatIf ov={ov} />
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><span className="muted">{label}</span><strong>{value}</strong></div>;
}

function MonthlyChart({ data }: { data: Overview["byMonth"] }) {
  const [table, setTable] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 640, H = 220, L = 44, B = 26, T = 12;
  const maxV = Math.max(...data.flatMap((d) => [d.income, d.spending]), 1);
  const top = Math.ceil(maxV / 1000) * 1000;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L) / data.length;
  const bw = Math.min(26, slot / 3);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);

  const show = (e: React.SyntheticEvent, text: string) => {
    const r = box.current!.getBoundingClientRect();
    const t = e.currentTarget.getBoundingClientRect();
    setTip({ x: t.left - r.left + t.width / 2, y: t.top - r.top, text });
  };

  return (
    <div className="chart" ref={box}>
      <div className="chart-head">
        <h2>Income and spending by month</h2>
        <div className="legend" aria-hidden={false}>
          <span><i className="sw s1" /> Income</span><span><i className="sw s2" /> Spending</span>
          <button className="link" onClick={() => setTable((v) => !v)}>{table ? "Show chart" : "Show table"}</button>
        </div>
      </div>
      {table ? (
        <table className="dtable">
          <thead><tr><th>Month</th><th>Income</th><th>Spending</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.month}><td>{monthLabel(d.month)}</td><td>{eur.format(d.income)}</td><td>{eur.format(d.spending)}</td></tr>)}</tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grouped bar chart of income and spending per month. Use the table view for exact values.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W} y1={y(t)} y2={y(t)} className="grid" />
              <text x={L - 6} y={y(t) + 4} textAnchor="end" className="axis">{t >= 1000 ? `${t / 1000}k` : t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = L + slot * i + slot / 2;
            const bars = [
              { v: d.income, cls: "s1", x: cx - bw - 1, name: "Income" },
              { v: d.spending, cls: "s2", x: cx + 1, name: "Spending" },
            ];
            return (
              <g key={d.month}>
                {bars.map((b) => {
                  const text = `${monthLabel(d.month)} · ${b.name} ${eur.format(b.v)}`;
                  return (
                    <path key={b.name} className={`bar ${b.cls}`} tabIndex={0} role="img" aria-label={text}
                      d={`M${b.x},${y(0)} V${y(b.v) + 4} Q${b.x},${y(b.v)} ${b.x + 4},${y(b.v)} H${b.x + bw - 4} Q${b.x + bw},${y(b.v)} ${b.x + bw},${y(b.v) + 4} V${y(0)} Z`}
                      onMouseEnter={(e) => show(e, text)} onMouseLeave={() => setTip(null)} onFocus={(e) => show(e, text)} onBlur={() => setTip(null)} />
                  );
                })}
                <text x={cx} y={H - 8} textAnchor="middle" className="axis">{monthLabel(d.month)}</text>
              </g>
            );
          })}
        </svg>
      )}
      {tip && !table && <div className="tip" style={{ left: tip.x, top: tip.y }} role="status">{tip.text}</div>}
    </div>
  );
}

function WhatIf({ ov }: { ov: Overview }) {
  const options = useMemo(() => ov.byCategory.filter((c) => c.category !== "Housing" && c.category !== "Utilities"), [ov]);
  const [cat, setCat] = useState("Dining");
  const [pct, setPct] = useState(20);
  const c = options.find((o) => o.category === cat) ?? options[0];
  if (!c) return null;
  const perMonth = (c.total / ov.months) * (pct / 100);
  return (
    <section className="card" aria-label="What-if savings">
      <h2>What if I spent less?</h2>
      <div className="row">
        <label htmlFor="wc">Category</label>
        <select id="wc" value={c.category} onChange={(e) => setCat(e.target.value)}>{options.map((o) => <option key={o.category}>{o.category}</option>)}</select>
        <label htmlFor="wp">Reduce by <strong>{pct}%</strong></label>
        <input id="wp" type="range" min={0} max={50} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
      </div>
      <p>Saves about <strong>{eur0.format(perMonth)}</strong> per month, <strong>{eur0.format(perMonth * 12)}</strong> over 12 months.</p>
      <p className="muted">Based on your average {c.category.toLowerCase()} spending of {eur0.format(c.total / ov.months)} per month. An estimate, not advice.</p>
    </section>
  );
}

// ------------------------------------------------------------ Transactions

function TransactionsTab({ txns, filter, setFilter, categories, selected, setSelected, call, onDisputed }: {
  txns: Txn[] | null; filter: Filter; setFilter: (f: Filter) => void; categories: string[];
  selected: string | null; setSelected: (id: string | null) => void;
  call: <T,>(name: string, args: Record<string, unknown>) => Promise<T>; onDisputed: (t: Txn) => Promise<void>;
}) {
  return (
    <>
      <div className="row filters">
        <label htmlFor="fc" className="sr">Category</label>
        <select id="fc" value={filter.category ?? ""} onChange={(e) => setFilter({ query: filter.query, category: e.target.value || undefined })}>
          <option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label htmlFor="fq" className="sr">Search merchant</label>
        <input id="fq" type="search" placeholder="Search merchant" value={filter.query} onChange={(e) => setFilter({ ...filter, ids: undefined, label: undefined, query: e.target.value })} />
      </div>
      {filter.label && filter.ids && (
        <p className="chipline">Showing: <strong>{filter.label}</strong> <button className="link" onClick={() => setFilter({ query: "" })}>Clear</button></p>
      )}
      {txns === null ? <p className="muted">Loading transactions…</p> : txns.length === 0 ? <p className="muted">No transactions match.</p> : (
        <ul className="txns">
          {txns.map((t) => (
            <li key={t.id} className={selected === t.id ? "sel" : ""}>
              <button className="trow" aria-expanded={selected === t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}>
                <span className="muted d">{dayLabel(t.date)}</span>
                <span className="m">{t.merchant}{t.flagged && <span className="flag" title="Worth a look">⚠<span className="sr"> flagged</span></span>}{t.dispute && <span className="badge">Disputed</span>}</span>
                <span className="muted c">{t.category}</span>
                <span className={`a ${t.amount > 0 ? "pos" : ""}`}>{eur.format(t.amount)}</span>
              </button>
              {selected === t.id && <Detail t={t} call={call} onDisputed={onDisputed} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Detail({ t, call, onDisputed }: { t: Txn; call: <T,>(n: string, a: Record<string, unknown>) => Promise<T>; onDisputed: (t: Txn) => Promise<void> }) {
  const [reason, setReason] = useState<keyof typeof REASONS>(t.flagged ? "duplicate" : "not-recognised");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (t.dispute) return <div className="detail"><p role="status" className="ok">Dispute {t.dispute.caseId} opened. Demo only, nothing was sent to a bank.</p></div>;
  if (t.amount > 0) return <div className="detail"><p className="muted">Incoming payments cannot be disputed.</p></div>;

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await call<{ transaction: Txn }>("dispute-transaction", { transactionId: t.id, reason, comment });
      await onDisputed({ ...t, ...r.transaction });
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); } finally { setBusy(false); }
  };

  return (
    <div className="detail">
      {t.note && <p className="muted">{t.note}</p>}
      {!confirming ? (
        <button onClick={() => setConfirming(true)}>Dispute this payment</button>
      ) : (
        <div className="form">
          <label htmlFor={`r${t.id}`}>Reason</label>
          <select id={`r${t.id}`} value={reason} onChange={(e) => setReason(e.target.value as keyof typeof REASONS)}>
            {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label htmlFor={`c${t.id}`}>Comment{reason === "other" ? " (required)" : " (optional)"}</label>
          <textarea id={`c${t.id}`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          <p className="muted">You are about to dispute {eur.format(Math.abs(t.amount))} at {t.merchant}. This is a demo; no real dispute is filed.</p>
          <div className="row">
            <button className="primary" disabled={busy || (reason === "other" && !comment.trim())} onClick={submit}>{busy ? "Submitting…" : "Confirm dispute"}</button>
            <button onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
          </div>
          {err && <p role="alert" className="error">{err}</p>}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
