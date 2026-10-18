import { useState } from "react";
import { DISPUTE_REASONS } from "../constants";
import { errorMessage } from "../lib/errors";
import { formatEur } from "../lib/format";
import type { Api } from "../lib/api";
import type { DisputeReason, Txn } from "../types";

interface TransactionDetailProps {
  txn: Txn;
  api: Api;
  onDisputed: (updated: Txn) => Promise<void> | void;
}

export function TransactionDetail({
  txn,
  api,
  onDisputed,
}: TransactionDetailProps) {
  const [reason, setReason] = useState<DisputeReason>(
    txn.flagged ? "duplicate" : "not-recognised",
  );
  const [comment, setComment] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (txn.dispute) {
    return (
      <div className="detail">
        <p role="status" className="ok">
          Dispute {txn.dispute.caseId} opened. Demo only, nothing was sent to a
          bank.
        </p>
      </div>
    );
  }
  if (txn.amount > 0) {
    return (
      <div className="detail">
        <p className="muted">Incoming payments cannot be disputed.</p>
      </div>
    );
  }

  const needsComment = reason === "other" && !comment.trim();

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.disputeTransaction({
        transactionId: txn.id,
        reason,
        comment,
      });
      await onDisputed({ ...txn, ...updated });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail">
      {txn.note && <p className="muted">{txn.note}</p>}
      {!confirming ? (
        <button onClick={() => setConfirming(true)}>
          Dispute this payment
        </button>
      ) : (
        <div className="form">
          <label htmlFor={`reason-${txn.id}`}>Reason</label>
          <select
            id={`reason-${txn.id}`}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value as DisputeReason)}
          >
            {Object.entries(DISPUTE_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor={`comment-${txn.id}`}>
            Comment{reason === "other" ? " (required)" : " (optional)"}
          </label>
          <textarea
            id={`comment-${txn.id}`}
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="muted">
            You are about to dispute {formatEur(Math.abs(txn.amount))} at{" "}
            {txn.merchant}. This is a demo; no real dispute is filed.
          </p>
          <div className="row">
            <button
              className="primary"
              disabled={busy || needsComment}
              onClick={submit}
            >
              {busy ? "Submitting…" : "Confirm dispute"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
