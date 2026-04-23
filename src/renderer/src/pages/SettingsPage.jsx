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

// Convert a persisted decimal (0.07125) to a clean display string ("7.125"),
// eating the floating-point rounding that `0.07125 * 100` otherwise produces.
function displayValue(n, pct) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  const shown = pct ? n * 100 : n;
  return Number(shown.toFixed(10)).toString();
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  // drafts holds the raw input strings while editing. We only parse on Save,
  // so typing "7.125" isn't mangled by a ×100 ÷100 roundtrip on every keystroke.
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api.settings.getAll().then((fresh) => {
      setSettings(fresh);
      setDrafts(initialDrafts(fresh));
    });
  }, []);

  if (!settings) return <div>Loading…</div>;

  function initialDrafts(source) {
    const d = {};
    for (const f of FIELDS) d[f.key] = displayValue(source[f.key], f.pct);
    return d;
  }

  function onChange(key, rawString) {
    setSaved(false);
    setDrafts((d) => ({ ...d, [key]: rawString }));
  }

  function isDirty(key) {
    return drafts[key] !== displayValue(settings[key], FIELDS.find((f) => f.key === key).pct);
  }

  async function save() {
    for (const f of FIELDS) {
      if (!isDirty(f.key)) continue;
      const raw = drafts[f.key];
      if (raw === '' || raw === '-' || raw === '.') continue; // skip mid-edit values
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const value = f.pct ? n / 100 : n;
      await window.api.settings.set(f.key, value);
    }
    const fresh = await window.api.settings.getAll();
    setSettings(fresh);
    setDrafts(initialDrafts(fresh));
    setSaved(true);
  }

  function reset() {
    setDrafts(initialDrafts(settings));
    setSaved(false);
  }

  const anyDirty = FIELDS.some((f) => isDirty(f.key));

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
              <input
                type="text"
                inputMode="decimal"
                value={drafts[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={save} disabled={!anyDirty}>Save</button>
          {anyDirty && <button className="ghost" onClick={reset}>Reset</button>}
          {saved && !anyDirty && <div className="muted">Saved.</div>}
        </div>
      </div>
    </div>
  );
}
