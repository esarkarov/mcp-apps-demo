import { useCallback, useEffect, useState } from "react";
import { TXN_FETCH_DEBOUNCE_MS } from "../constants";
import { errorMessage } from "../lib/errors";
import type { Api } from "../lib/api";
import type { Txn, TxnQuery } from "../types";

export function useTransactions(api: Api, enabled: boolean, query: TxnQuery) {
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    setTxns(null);
    const timer = setTimeout(async () => {
      try {
        const list = await api.getTransactions(query);
        if (current) {
          setTxns(list);
          setError(null);
        }
      } catch (e) {
        if (current) setError(errorMessage(e));
      }
    }, TXN_FETCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [api, enabled, query]);

  const replace = useCallback((updated: Txn) => {
    setTxns(
      (prev) =>
        prev?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) ??
        prev,
    );
  }, []);

  return { txns, error, replace };
}
