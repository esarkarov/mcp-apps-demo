import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import { formatEur, formatMonth } from "../lib/format";
import type { MonthTotals } from "../types";
import { layoutChart } from "../lib/chartLayout";
import { CHART } from "../constants";

interface Tooltip {
  x: number;
  y: number;
  text: string;
}

export function MonthlyChart({ data }: { data: MonthTotals[] }) {
  const [showTable, setShowTable] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutChart(data), [data]);

  const showTooltip = (e: SyntheticEvent, text: string) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    const bar = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: bar.left - box.left + bar.width / 2,
      y: bar.top - box.top,
      text,
    });
  };
  const hideTooltip = () => setTooltip(null);

  return (
    <div className="chart" ref={container}>
      <div className="chart-head">
        <h2>Income and spending by month</h2>
        <div className="legend">
          <span>
            <i className="sw s1" /> Income
          </span>
          <span>
            <i className="sw s2" /> Spending
          </span>
          <button className="link" onClick={() => setShowTable((v) => !v)}>
            {showTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>

      {showTable ? (
        <table className="dtable">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Spending</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{formatMonth(d.month)}</td>
                <td>{formatEur(d.income)}</td>
                <td>{formatEur(d.spending)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-label="Grouped bar chart of income and spending per month. Use the table view for exact values."
        >
          {layout.ticks.map((t) => (
            <g key={t.value}>
              <line
                x1={CHART.left}
                x2={CHART.width}
                y1={t.y}
                y2={t.y}
                className="grid"
              />
              <text
                x={CHART.left - 6}
                y={t.y + 4}
                textAnchor="end"
                className="axis"
              >
                {t.label}
              </text>
            </g>
          ))}
          {layout.groups.map((g) => (
            <g key={g.month}>
              {g.bars.map((b) => (
                <path
                  key={b.key}
                  d={b.path}
                  className={`bar ${b.className}`}
                  tabIndex={0}
                  role="img"
                  aria-label={b.label}
                  onMouseEnter={(e) => showTooltip(e, b.label)}
                  onMouseLeave={hideTooltip}
                  onFocus={(e) => showTooltip(e, b.label)}
                  onBlur={hideTooltip}
                />
              ))}
              <text
                x={g.centerX}
                y={CHART.height - 8}
                textAnchor="middle"
                className="axis"
              >
                {g.label}
              </text>
            </g>
          ))}
        </svg>
      )}

      {tooltip && !showTable && (
        <div
          className="tip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="status"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
