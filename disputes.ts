import fs from "node:fs";
import path from "node:path";

export interface DisputeRecord {
  caseId: string;
  reason: string;
  comment: string;
  openedAt: string;
}

type Store = Record<string, DisputeRecord>;

const DATA_FILE = path.resolve(
  process.env.DISPUTES_FILE ?? path.join("data", "disputes.json"),
);

function load(): Map<string, DisputeRecord> {
  try {
    const store = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Store;
    return new Map(Object.entries(store));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.error(`Could not read ${DATA_FILE}, starting empty:`, error);
    return new Map();
  }
}

function save(): void {
  const temp = `${DATA_FILE}.tmp`;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(
      temp,
      JSON.stringify(Object.fromEntries(disputes), null, 2),
    );
    fs.renameSync(temp, DATA_FILE);
  } catch (error) {
    console.error(`Could not write ${DATA_FILE}:`, error);
  }
}

const disputes = load();

export const getDispute = (transactionId: string) =>
  disputes.get(transactionId);

export function openDispute(
  transactionId: string,
  reason: string,
  comment: string,
): DisputeRecord {
  const record: DisputeRecord = {
    caseId: `DSP-${String(disputes.size + 1).padStart(4, "0")}`,
    reason,
    comment,
    openedAt: new Date().toISOString(),
  };
  disputes.set(transactionId, record);
  save();
  return record;
}

export const listDisputes = () =>
  [...disputes].map(([transactionId, dispute]) => ({
    transactionId,
    dispute,
  }));
