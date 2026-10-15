import { CHART } from "../constants";
import { formatEur, formatMonth } from "../lib/format";
import type { ChartLayout, GroupSpec, MonthTotals } from "../types";

function barPath(
  x: number,
  w: number,
  yTop: number,
  yBase: number,
  r: number,
): string {
  return `M${x},${yBase} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + w - r} Q${x + w},${yTop} ${x + w},${yTop + r} V${yBase} Z`;
}

export function layoutChart(data: MonthTotals[]): ChartLayout {
  const { width, height, left, bottom, top, maxBarWidth, corner, axisStep } =
    CHART;
  const max = Math.max(...data.flatMap((d) => [d.income, d.spending]), 1);
  const axisMax = Math.ceil(max / axisStep) * axisStep;
  const y = (v: number) => top + (height - top - bottom) * (1 - v / axisMax);
  const slot = (width - left) / data.length;
  const barWidth = Math.min(maxBarWidth, slot / 3);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const value = f * axisMax;
    return {
      value,
      y: y(value),
      label: value >= 1000 ? `${value / 1000}k` : String(value),
    };
  });

  const groups = data.map((d, i): GroupSpec => {
    const centerX = left + slot * i + slot / 2;
    const month = formatMonth(d.month);
    const series = [
      {
        name: "Income",
        value: d.income,
        className: "s1" as const,
        x: centerX - barWidth - 1,
      },
      {
        name: "Spending",
        value: d.spending,
        className: "s2" as const,
        x: centerX + 1,
      },
    ];
    return {
      month: d.month,
      label: month,
      centerX,
      bars: series.map((s) => ({
        key: s.name,
        className: s.className,
        label: `${month} · ${s.name} ${formatEur(s.value)}`,
        path: barPath(s.x, barWidth, y(s.value), y(0), corner),
      })),
    };
  });

  return { ticks, groups };
}
