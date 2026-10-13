import { useMemo, useState } from "react";
import {
  WHAT_IF_DEFAULT_CATEGORY,
  WHAT_IF_DEFAULT_PERCENT,
  WHAT_IF_EXCLUDED_CATEGORIES,
  WHAT_IF_MAX_PERCENT,
  WHAT_IF_STEP_PERCENT,
} from "../constants";
import { formatEurRounded } from "../lib/format";
import type { Overview } from "../types";

export function WhatIf({ overview }: { overview: Overview }) {
  const options = useMemo(
    () =>
      overview.byCategory.filter(
        (c) => !WHAT_IF_EXCLUDED_CATEGORIES.includes(c.category),
      ),
    [overview],
  );
  const [category, setCategory] = useState(WHAT_IF_DEFAULT_CATEGORY);
  const [percent, setPercent] = useState(WHAT_IF_DEFAULT_PERCENT);

  const selected = options.find((o) => o.category === category) ?? options[0];
  if (!selected) return null;

  const averagePerMonth = selected.total / overview.months;
  const savedPerMonth = averagePerMonth * (percent / 100);

  return (
    <section className="card" aria-label="What-if savings">
      <h2>What if I spent less?</h2>
      <div className="row">
        <label htmlFor="whatif-category">Category</label>
        <select
          id="whatif-category"
          value={selected.category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.category}>{o.category}</option>
          ))}
        </select>
        <label htmlFor="whatif-percent">
          Reduce by <strong>{percent}%</strong>
        </label>
        <input
          id="whatif-percent"
          type="range"
          min={0}
          max={WHAT_IF_MAX_PERCENT}
          step={WHAT_IF_STEP_PERCENT}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
        />
      </div>
      <p>
        Saves about <strong>{formatEurRounded(savedPerMonth)}</strong> per
        month, <strong>{formatEurRounded(savedPerMonth * 12)}</strong> over 12
        months.
      </p>
      <p className="muted">
        Based on your average {selected.category.toLowerCase()} spending of{" "}
        {formatEurRounded(averagePerMonth)} per month. An estimate, not advice.
      </p>
    </section>
  );
}
