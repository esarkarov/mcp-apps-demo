import type { App } from "@modelcontextprotocol/ext-apps";
import { useMemo, useState } from "react";
import { NO_FILTER, PERIOD_OPTIONS, TABS } from "../constants";
import { useTransactions } from "../hooks/useTransactions";
import { createApi } from "../lib/api";
import { errorMessage } from "../lib/errors";
import { Notice } from "./Notice";
import { formatEur } from "../lib/format";
import type { Insight, Overview, Tab, Txn, TxnFilter } from "../types";
import { DisputesTab } from "./DisputesTab";
import { OverviewTab } from "./OverviewTab";
import { TransactionsTab } from "./TransactionsTab";

export function Dashboard({ app, initial }: { app: App; initial: Overview }) {
  const api = useMemo(() => createApi(app), [app]);

  const [overview, setOverview] = useState(initial);
  const [months, setMonths] = useState(initial.months);
  const [tab, setTab] = useState<Tab>(initial.view ?? "overview");
  const [filter, setFilter] = useState<TxnFilter>(NO_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const txnQuery = useMemo(
    () => ({
      months,
      category: filter.category,
      query: filter.query,
      ids: filter.ids,
    }),
    [months, filter],
  );
  const {
    txns,
    error: txnError,
    replace: replaceTxn,
    retry: retryTxns,
  } = useTransactions(api, tab === "transactions", txnQuery);
  const error = actionError ?? txnError;

  const changePeriod = async (n: number) => {
    setMonths(n);
    setActionError(null);
    try {
      setOverview(await api.getOverview(n));
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const openTransactions = (
    nextFilter: TxnFilter,
    selectId: string | null = null,
  ) => {
    setFilter(nextFilter);
    setSelectedId(selectId);
    setTab("transactions");
  };
  const showCategory = (category: string) =>
    openTransactions({ category, query: "", label: category });
  const reviewInsight = (i: Insight) =>
    openTransactions(
      { ids: i.txnIds, query: "", label: i.title },
      i.txnIds[0] ?? null,
    );

  const openTransaction = (t: Txn) =>
    openTransactions({ ids: [t.id], query: "", label: t.merchant }, t.id);

  const selectTab = (next: Tab) => {
    if (next === "transactions" && tab !== "transactions") {
      setFilter(NO_FILTER);
      setSelectedId(null);
    }
    setTab(next);
  };

  const handleDisputed = async (updated: Txn) => {
    replaceTxn(updated);
    if (updated.dispute)
      await api.reportDispute({ ...updated, dispute: updated.dispute });
  };

  const { account } = overview;
  return (
    <>
      <header className="top">
        <div>
          <h1>
            {account.name} <span className="muted">{account.mask}</span>
          </h1>
          <p className="muted">
            {account.holder} · balance{" "}
            <strong>{formatEur(account.balance)}</strong>
          </p>
        </div>
        <div className="seg" role="group" aria-label="Period">
          {PERIOD_OPTIONS.map((n) => (
            <button
              key={n}
              aria-pressed={months === n}
              className={months === n ? "on" : ""}
              onClick={() => changePeriod(n)}
            >
              {n} months
            </button>
          ))}
        </div>
      </header>

      <div className="tabs" role="group" aria-label="View">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? "on" : ""}
            onClick={() => selectTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <Notice
          kind="error"
          onRetry={txnError && !actionError ? retryTxns : undefined}
        >
          {error}
        </Notice>
      )}

      {tab === "overview" ? (
        <OverviewTab
          overview={overview}
          onSelectCategory={showCategory}
          onReviewInsight={reviewInsight}
        />
      ) : tab === "disputes" ? (
        <DisputesTab api={api} onOpenTransaction={openTransaction} />
      ) : (
        <TransactionsTab
          api={api}
          txns={txns}
          filter={filter}
          onFilterChange={setFilter}
          categories={overview.byCategory.map((c) => c.category)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDisputed={handleDisputed}
        />
      )}
    </>
  );
}
