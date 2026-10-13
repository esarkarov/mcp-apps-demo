import type { Api } from "../lib/api";
import type { Txn, TxnFilter } from "../types";
import { TransactionItem } from "./TransactionItem";

interface TransactionsTabProps {
  api: Api;
  txns: Txn[] | null;
  filter: TxnFilter;
  onFilterChange: (filter: TxnFilter) => void;
  categories: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDisputed: (updated: Txn) => Promise<void> | void;
}

export function TransactionsTab({
  api,
  txns,
  filter,
  onFilterChange,
  categories,
  selectedId,
  onSelect,
  onDisputed,
}: TransactionsTabProps) {
  const hasInsightFilter = Boolean(filter.label && filter.ids);

  return (
    <>
      <div className="row filters">
        <label htmlFor="filter-category" className="sr">
          Category
        </label>
        <select
          id="filter-category"
          value={filter.category ?? ""}
          onChange={(e) =>
            onFilterChange({
              query: filter.query,
              category: e.target.value || undefined,
            })
          }
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="filter-query" className="sr">
          Search merchant
        </label>
        <input
          id="filter-query"
          type="search"
          placeholder="Search merchant"
          value={filter.query}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              ids: undefined,
              label: undefined,
              query: e.target.value,
            })
          }
        />
      </div>

      {hasInsightFilter && (
        <p className="chipline">
          Showing: <strong>{filter.label}</strong>{" "}
          <button
            className="link"
            onClick={() => onFilterChange({ query: "" })}
          >
            Clear
          </button>
        </p>
      )}

      {txns === null ? (
        <p className="muted">Loading transactions…</p>
      ) : txns.length === 0 ? (
        <p className="muted">No transactions match.</p>
      ) : (
        <ul className="txns">
          {txns.map((t) => (
            <TransactionItem
              key={t.id}
              txn={t}
              api={api}
              open={selectedId === t.id}
              onToggle={() => onSelect(selectedId === t.id ? null : t.id)}
              onDisputed={onDisputed}
            />
          ))}
        </ul>
      )}
    </>
  );
}
