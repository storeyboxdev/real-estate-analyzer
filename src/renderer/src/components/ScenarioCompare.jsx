import { useEffect, useState } from 'react';
import { compareScenarios } from '../../../core/analysis/compare.js';
import { fmtUsd, fmtPct, fmtNum } from '../lib/format.js';

function fmt(value, kind) {
  if (!Number.isFinite(value)) return String(value);
  if (kind === 'usd') return fmtUsd(value);
  if (kind === 'pct') return fmtPct(value);
  return fmtNum(value);
}

// Pulls the latest revision for each scenario and renders a side-by-side
// table with best/worst flags per metric.
export default function ScenarioCompare({ propertyId }) {
  const [scenarios, setScenarios] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    async function load() {
      const list = await window.api.scenarios.listForProperty(propertyId);
      setScenarios(list);
      // Default to comparing every scenario that has a revision.
      const revs = await Promise.all(
        list.map(async (s) => ({ scenario: s, revision: await window.api.revisions.latest(s.id) })),
      );
      const withData = revs.filter((x) => x.revision);
      setSelected(new Set(withData.map((x) => x.scenario.id)));
      setEntries(
        withData.map(({ scenario, revision }) => ({
          id: scenario.id,
          label: scenario.name + (scenario.is_current ? ' (current)' : ''),
          outputs: revision.outputs,
        })),
      );
    }
    load();
  }, [propertyId]);

  if (scenarios.length === 0) {
    return <div className="muted">No scenarios on this property yet.</div>;
  }
  if (entries.length === 0) {
    return <div className="muted">No scenarios have saved revisions yet.</div>;
  }

  const active = entries.filter((e) => selected.has(e.id));
  const { rows } = compareScenarios(active);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Compare scenarios</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {entries.map((e) => (
          <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)}
              style={{ width: 'auto' }} />
            {e.label}
          </label>
        ))}
      </div>

      {active.length === 0 ? (
        <div className="muted">Select at least one scenario above.</div>
      ) : (
        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                {active.map((e) => <th key={e.id}>{e.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.metric}>
                  <td className="metric-name">
                    {row.label}
                    <span className="direction"> ({row.better === 'higher' ? '↑ better' : '↓ better'})</span>
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className={`mono ${v.best ? 'best' : ''} ${v.worst ? 'worst' : ''}`}>
                      {fmt(v.value, row.fmt)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
