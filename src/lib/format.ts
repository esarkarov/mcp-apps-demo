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
