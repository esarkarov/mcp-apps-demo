import type { App } from "@modelcontextprotocol/ext-apps";
import { REQUEST_TIMEOUT_MS, TOOL } from "../constants";
import type { Dispute, DisputeReason, Overview, Txn, TxnQuery } from "../types";
import { formatEur, toUserMessage } from "./format";

export function createApi(app: App) {
  async function call<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    let res;
    try {
      res = await app.callServerTool(
        { name, arguments: args },
        { timeout: REQUEST_TIMEOUT_MS },
      );
    } catch (e) {
      throw new Error(
        toUserMessage(e instanceof Error ? e.message : String(e)),
      );
    }
    if (res.isError) {
      const text = res.content?.find((c) => c.type === "text");
      throw new Error(
        toUserMessage(text && "text" in text ? text.text : "Request failed"),
      );
    }
    return res.structuredContent as unknown as T;
  }

  return {
    getOverview: (months: number) => call<Overview>(TOOL.overview, { months }),

    async getTransactions(q: TxnQuery): Promise<Txn[]> {
      const { transactions } = await call<{ transactions: Txn[] }>(
        TOOL.transactions,
        {
          months: q.months,
          category: q.category,
          query: q.query || undefined,
          ids: q.ids,
        },
      );
      return transactions;
    },

    async getDisputes(): Promise<Txn[]> {
      const { disputes } = await call<{ disputes: Txn[] }>(TOOL.disputes, {});
      return disputes;
    },

    async disputeTransaction(input: {
      transactionId: string;
      reason: DisputeReason;
      comment: string;
    }): Promise<Txn> {
      const { transaction } = await call<{ transaction: Txn }>(
        TOOL.dispute,
        input,
      );
      return transaction;
    },

    reportDispute(t: Txn & { dispute: Dispute }) {
      return app.updateModelContext({
        content: [
          {
            type: "text",
            text: `Customer opened dispute ${t.dispute.caseId} for ${t.merchant} (${formatEur(Math.abs(t.amount))}) on ${t.date}. Reason: ${t.dispute.reason}.`,
          },
        ],
      });
    },
  };
}

export type Api = ReturnType<typeof createApi>;
