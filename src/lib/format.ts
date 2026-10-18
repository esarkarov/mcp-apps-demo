import { MAX_MESSAGE_LENGTH } from "../constants";

const eurFull = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
const eurRounded = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatEur = (n: number) => eurFull.format(n);
export const formatEurRounded = (n: number) => eurRounded.format(n);

const utcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const formatMonth = (yearMonth: string) =>
  utcDate(`${yearMonth}-01`).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });

export const formatDay = (isoDate: string) =>
  utcDate(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function toUserMessage(message: string): string {
  if (/timed out/i.test(message)) return "The server did not respond in time.";
  if (
    /\b50[234]\b|bad gateway|error posting|unable to reach|failed to fetch|network|load failed/i.test(
      message,
    )
  )
    return "Could not reach the server. Try again in a moment.";
  if (/closed|not connected/i.test(message))
    return "The connection to the server was lost.";
  const line = message.split("\n")[0].trim();
  return line.length > MAX_MESSAGE_LENGTH
    ? `${line.slice(0, MAX_MESSAGE_LENGTH)}…`
    : line;
}
