import { ICON } from "../constants";
import type { Insight } from "../types";

interface InsightsListProps {
  insights: Insight[];
  onReview: (i: Insight) => void;
}

export function InsightsList({ insights, onReview }: InsightsListProps) {
  if (insights.length === 0) return null;

  return (
    <section className="card" aria-label="Items worth a look">
      <h2>Worth a look</h2>
      <ul className="insights">
        {insights.map((i) => (
          <li key={`${i.kind}:${i.txnIds.join(",")}`}>
            <span className={`sev ${i.severity}`} aria-hidden="true">
              {ICON[i.severity]}
            </span>
            <div className="grow">
              <strong>{i.title}</strong>
              <span className="sr"> ({i.severity})</span>
              <p className="muted">{i.detail}</p>
            </div>
            <button onClick={() => onReview(i)}>Review</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
