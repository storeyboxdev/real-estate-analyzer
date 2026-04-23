import { useEffect, useState } from 'react';
import { fmtDate, fmtUsd, fmtPct, fmtNum } from '../lib/format.js';

// Lists revisions for a scenario (newest first) with headline metrics,
// a click-to-expand full detail view, and a "restore" action that appends
// a new revision carrying the chosen revision's inputs.
export default function RevisionHistory({ scenarioId, onRestored }) {
  const [revisions, setRevisions] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    window.api.revisions.listForScenario(scenarioId).then((list) => {
      if (!cancelled) setRevisions(list);
    });
    return () => { cancelled = true; };
  }, [scenarioId]);

  if (revisions === null) return <div className="muted">Loading history…</div>;
  if (revisions.length === 0) return <div className="muted">No revisions yet.</div>;

  async function restore(rev) {
    if (!confirm('Append a new revision using the inputs from this one?')) return;
    await window.api.scenarios.update(scenarioId, {
      inputs: rev.inputs,
      note: `restored from revision ${rev.id}`,
    });
    if (onRestored) onRestored();
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Revision history ({revisions.length})</h3>
      {revisions.map((r, idx) => {
        const isLatest = idx === 0;
        const o = r.outputs;
        const isExpanded = expanded === r.id;
        return (
          <div key={r.id} className="rev-row">
            <div className="rev-header" onClick={() => setExpanded(isExpanded ? null : r.id)}>
              <div className="rev-when">
                {fmtDate(r.created_at)}
                {isLatest && <span className="badge">latest</span>}
              </div>
              <div className="rev-metrics mono">
                <span>cap {fmtPct(o.capRate)}</span>
                <span>coc {fmtPct(o.cocReturn)}</span>
                <span>dscr {Number.isFinite(o.dscr) ? fmtNum(o.dscr) : '∞'}</span>
                <span className={o.annualCashFlow >= 0 ? 'good' : 'bad'}>
                  cf/yr {fmtUsd(o.annualCashFlow)}
                </span>
              </div>
              <div className="rev-arrow muted">{isExpanded ? '▾' : '▸'}</div>
            </div>
            {r.note && <div className="rev-note muted">— {r.note}</div>}
            {isExpanded && (
              <div className="rev-detail">
                <div className="rev-detail-grid">
                  <div><span className="muted">Price</span> {fmtUsd(r.inputs.purchasePrice)}</div>
                  <div><span className="muted">Rate</span> {fmtPct(r.inputs.interestRate)}</div>
                  <div><span className="muted">Rents</span> {r.inputs.unitRents.map((x) => fmtUsd(x)).join(' · ')}</div>
                  <div><span className="muted">Payment</span> {fmtUsd(o.monthlyPayment)}</div>
                  <div><span className="muted">NOI</span> {fmtUsd(o.noi)}</div>
                  <div><span className="muted">Cash inv.</span> {fmtUsd(o.totalCashInvested)}</div>
                </div>
                {!isLatest && (
                  <div style={{ marginTop: 10 }}>
                    <button className="ghost" onClick={() => restore(r)}>Restore these inputs</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
