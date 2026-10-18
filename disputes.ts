export interface DisputeRecord {
  caseId: string;
  reason: string;
  comment: string;
  openedAt: string;
}

const byUser = new Map<string, Map<string, DisputeRecord>>();

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
  return record;
}

export const listDisputes = (user: string) =>
  [...forUser(user)].map(([transactionId, dispute]) => ({
    transactionId,
    dispute,
  }));
