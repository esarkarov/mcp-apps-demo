import { useEffect, useState } from "react";
import { DISPUTE_REASONS } from "../constants";
import type { Api } from "../lib/api";
import { errorMessage } from "../lib/errors";
import { formatDay, formatEur } from "../lib/format";
import type { Txn } from "../types";
import { Notice } from "./Notice";

interface DisputesTabProps {
  api: Api;
  onOpenTransaction: (txn: Txn) => void;
}

export function DisputesTab({ api, onOpenTransaction }: DisputesTabProps) {
  const [disputes, setDisputes] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    api
      .getDisputes()
      .then((list) => active && setDisputes(list))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [api, attempt]);

  if (error)
    return (
      <Notice kind="error" onRetry={() => setAttempt((n) => n + 1)}>
        {error}
      </Notice>
    );
  if (disputes === null) return <p className="muted">Loading disputes…</p>;
  if (disputes.length === 0)
    return (
      <p className="muted">
        No disputes opened yet. Open a transaction and choose “Dispute this
        payment”.
      </p>
    );

  return (
    <ul className="dlist">
      {disputes.map((t) => (
        <li key={t.id}>
          <div className="dhead">
            <strong>{t.dispute?.caseId}</strong>
            <span>{formatEur(t.amount)}</span>
          </div>
          <div>
            {t.merchant} <span className="muted">· {formatDay(t.date)}</span>
          </div>
          <div className="muted">
            {t.dispute && DISPUTE_REASONS[t.dispute.reason]}
            {t.dispute?.comment && ` · ${t.dispute.comment}`}
          </div>
          <button className="link" onClick={() => onOpenTransaction(t)}>
            View transaction
          </button>
        </li>
      ))}
    </ul>
  );
}
