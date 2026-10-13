import { formatEur, formatEurRounded } from "../lib/format";
import type { CategoryTotal } from "../types";

export function CategoryBars({
  categories,
  onSelect,
}: {
  categories: CategoryTotal[];
  onSelect: (category: string) => void;
}) {
  const max = categories[0]?.total ?? 1;
  return (
    <section className="card" aria-label="Spending by category">
      <h2>Spending by category</h2>
      <ul className="cats">
        {categories.map((c) => (
          <li key={c.category}>
            <button
              onClick={() => onSelect(c.category)}
              aria-label={`${c.category}, ${formatEur(c.total)}, ${c.count} transactions. Show transactions`}
            >
              <span className="cname">{c.category}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{ width: `${(c.total / max) * 100}%` }}
                />
              </span>
              <span className="cval">{formatEurRounded(c.total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
