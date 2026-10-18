import fs from "node:fs";
import path from "node:path";

export interface DisputeRecord {
  caseId: string;
  reason: string;
  comment: string;
  openedAt: string;
}

type UserDisputes = Map<string, DisputeRecord>;
type Store = Record<string, Record<string, DisputeRecord>>;

const DATA_FILE = path.resolve(
  process.env.DISPUTES_FILE ?? path.join("data", "disputes.json"),
);

function load(): Map<string, UserDisputes> {
  try {
    const store = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Store;
    return new Map(
      Object.entries(store).map(([user, disputes]) => [
        user,
        new Map(Object.entries(disputes)),
      ]),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.error(`Could not read ${DATA_FILE}, starting empty:`, error);
    return new Map();
  }
}

function save(): void {
  const store: Store = Object.fromEntries(
    [...byUser].map(([user, disputes]) => [user, Object.fromEntries(disputes)]),
  );
  const temp = `${DATA_FILE}.tmp`;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(temp, JSON.stringify(store, null, 2));
    fs.renameSync(temp, DATA_FILE);
  } catch (error) {
    console.error(`Could not write ${DATA_FILE}:`, error);
  }
}

const byUser = load();

const forUser = (user: string) => {
  let disputes = byUser.get(user);
  if (!disputes) byUser.set(user, (disputes = new Map()));
  return disputes;
};

export const getDispute = (user: string, transactionId: string) =>
  forUser(user).get(transactionId);

export function openDispute(
  user: string,
  transactionId: string,
  reason: string,
  comment: string,
): DisputeRecord {
  const disputes = forUser(user);
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

export const listDisputes = (user: string) =>
  [...forUser(user)].map(([transactionId, dispute]) => ({
    transactionId,
    dispute,
  }));
