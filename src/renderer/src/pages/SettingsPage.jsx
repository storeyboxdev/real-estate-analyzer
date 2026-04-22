import { useEffect, useState } from 'react';

const FIELDS = [
  { key: 'currentMortgageRate', label: 'Current mortgage rate (%)', pct: true },
  { key: 'requiredCapRate', label: 'Required cap rate hurdle (%)', pct: true },
  { key: 'requiredCoCReturn', label: 'Required cash-on-cash hurdle (%)', pct: true },
  { key: 'defaultDownPaymentPct', label: 'Default down payment (%)', pct: true },
  { key: 'defaultLoanTermYears', label: 'Default loan term (years)', pct: false },
  { key: 'defaultClosingCostPct', label: 'Default closing costs (% of price)', pct: true },
  { key: 'defaultClosingCostPerUnit', label: 'Default closing costs ($ per unit)', pct: false },
  { key: 'defaultVacancyPct', label: 'Default vacancy (%)', pct: true },
  { key: 'defaultManagementPct', label: 'Default management (%)', pct: true },
  { key: 'defaultMaintenancePct', label: 'Default maintenance (%)', pct: true },
  { key: 'defaultCapexPct', label: 'Default CapEx (%)', pct: true },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [dirty, setDirty] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api.settings.getAll().then(setSettings);
  }, []);

  if (!settings) return <div>Loading…</div>;

  function onChange(key, rawValue, pct) {
    setSaved(false);
    const n = Number(rawValue);
    const value = pct ? n / 100 : n;
    setDirty((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    for (const [key, value] of Object.entries(dirty)) {
      await window.api.settings.set(key, value);
    }
    const fresh = await window.api.settings.getAll();
    setSettings(fresh);
    setDirty({});
    setSaved(true);
  }

  const merged = { ...settings, ...dirty };

  return (
    <div>
      <h1>Settings</h1>
      <div className="muted" style={{ marginBottom: 12 }}>
        Defaults apply when new scenarios are created. Hurdle rates flag deals that miss the bar.
      </div>
      <div className="card">
        <div className="grid-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label>{f.label}</label>
              <input type="number" step="any"
                value={f.pct ? (merged[f.key] * 100) : merged[f.key]}
                onChange={(e) => onChange(f.key, e.target.value, f.pct)} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={save} disabled={Object.keys(dirty).length === 0}>Save</button>
          {saved && <div className="muted">Saved.</div>}
        </div>
      </div>
    </div>
  );
}
