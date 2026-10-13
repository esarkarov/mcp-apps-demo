import type { Api } from "../lib/api";
import { formatDay, formatEur } from "../lib/format";
import type { Txn } from "../types";
import { TransactionDetail } from "./TransactionDetail";

interface TransactionItemProps {
  txn: Txn;
  api: Api;
  open: boolean;
  onToggle: () => void;
  onDisputed: (updated: Txn) => Promise<void> | void;
}

export function TransactionItem({
  txn,
  api,
  open,
  onToggle,
  onDisputed,
}: TransactionItemProps) {
  return (
    <li className={open ? "sel" : ""}>
      <button className="trow" aria-expanded={open} onClick={onToggle}>
        <span className="muted d">{formatDay(txn.date)}</span>
        <span className="m">
          {txn.merchant}
          {txn.flagged && (
            <span className="flag" title="Worth a look">
              ⚠<span className="sr"> flagged</span>
            </span>
          )}
          {txn.dispute && <span className="badge">Disputed</span>}
        </span>
        <span className="muted c">{txn.category}</span>
        <span className={`a ${txn.amount > 0 ? "pos" : ""}`}>
          {formatEur(txn.amount)}
        </span>
      </button>
      {open && (
        <TransactionDetail txn={txn} api={api} onDisputed={onDisputed} />
      )}
    </li>
  );
}
