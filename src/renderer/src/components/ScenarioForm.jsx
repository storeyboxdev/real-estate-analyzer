import { useEffect, useState } from 'react';

// Fields are keyed by the zod schema names in src/core/models/inputs.js.
// Percentage fields are entered as "7" (for 7%) and divided by 100 before submit.
// All values are tracked as strings while editing — matches the SettingsPage
// pattern — so that typing "7.125" isn't ruined by React/number-input quirks.

const DEFAULTS = {
  purchasePrice: '',
  interestRatePct: '',
  unitRents: [''],
  taxesAnnual: '',
  insuranceAnnual: '',

  // advanced — all stored as strings
  downPaymentPct: '25',
  loanTermYears: '30',
  closingCostPct: '3',
  closingCostPerUnit: '0',
  rehabBudget: '0',
  initialMissedRent: '0',
  otherIncomeMonthly: '0',
  vacancyPct: '5',
  managementPct: '8',
  maintenancePct: '5',
  capexPct: '5',
  hoaAnnual: '0',
  utilitiesAnnual: '0',
  otherOpexAnnual: '0',
};

// Safe Number parse: '' -> 0 for optional fields (callers that require a
// value should validate upstream or rely on zod).
function n(s) {
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

function toInputs(state) {
  return {
    purchasePrice: n(state.purchasePrice),
    closingCostPct: n(state.closingCostPct) / 100,
    closingCostPerUnit: n(state.closingCostPerUnit),
    rehabBudget: n(state.rehabBudget),
    initialMissedRent: n(state.initialMissedRent),
    downPaymentPct: n(state.downPaymentPct) / 100,
    loanTermYears: n(state.loanTermYears),
    interestRate: n(state.interestRatePct) / 100,
    unitRents: state.unitRents.map((r) => n(r)),
    otherIncomeMonthly: n(state.otherIncomeMonthly),
    vacancyPct: n(state.vacancyPct) / 100,
    managementPct: n(state.managementPct) / 100,
    maintenancePct: n(state.maintenancePct) / 100,
    capexPct: n(state.capexPct) / 100,
    taxesAnnual: n(state.taxesAnnual),
    insuranceAnnual: n(state.insuranceAnnual),
    hoaAnnual: n(state.hoaAnnual),
    utilitiesAnnual: n(state.utilitiesAnnual),
    otherOpexAnnual: n(state.otherOpexAnnual),
  };
}

// Strip floating-point noise from a display value (0.07125 * 100 -> "7.125").
function displayPct(value) {
  if (value === null || value === undefined) return '';
  return Number((value * 100).toFixed(10)).toString();
}
function displayNum(value) {
  if (value === null || value === undefined) return '';
  return Number(value.toFixed ? value.toFixed(10) : value).toString();
}

// Convert an inputs object (from a saved revision or a paste draft) into
// string form-state. Falls back to DEFAULTS for anything missing.
function fromInputs(inputs) {
  if (!inputs) return { ...DEFAULTS };
  return {
    purchasePrice: inputs.purchasePrice != null ? displayNum(inputs.purchasePrice) : '',
    interestRatePct: inputs.interestRate != null ? displayPct(inputs.interestRate) : '',
    unitRents: (inputs.unitRents ?? ['']).map((r) => (r === 0 ? '' : displayNum(r))),
    taxesAnnual: inputs.taxesAnnual != null ? displayNum(inputs.taxesAnnual) : '',
    insuranceAnnual: inputs.insuranceAnnual != null ? displayNum(inputs.insuranceAnnual) : '',
    downPaymentPct: inputs.downPaymentPct != null ? displayPct(inputs.downPaymentPct) : '25',
    loanTermYears: inputs.loanTermYears != null ? displayNum(inputs.loanTermYears) : '30',
    closingCostPct: inputs.closingCostPct != null ? displayPct(inputs.closingCostPct) : '3',
    closingCostPerUnit: inputs.closingCostPerUnit != null ? displayNum(inputs.closingCostPerUnit) : '0',
    rehabBudget: inputs.rehabBudget != null ? displayNum(inputs.rehabBudget) : '0',
    initialMissedRent: inputs.initialMissedRent != null ? displayNum(inputs.initialMissedRent) : '0',
    otherIncomeMonthly: inputs.otherIncomeMonthly != null ? displayNum(inputs.otherIncomeMonthly) : '0',
    vacancyPct: inputs.vacancyPct != null ? displayPct(inputs.vacancyPct) : '5',
    managementPct: inputs.managementPct != null ? displayPct(inputs.managementPct) : '8',
    maintenancePct: inputs.maintenancePct != null ? displayPct(inputs.maintenancePct) : '5',
    capexPct: inputs.capexPct != null ? displayPct(inputs.capexPct) : '5',
    hoaAnnual: inputs.hoaAnnual != null ? displayNum(inputs.hoaAnnual) : '0',
    utilitiesAnnual: inputs.utilitiesAnnual != null ? displayNum(inputs.utilitiesAnnual) : '0',
    otherOpexAnnual: inputs.otherOpexAnnual != null ? displayNum(inputs.otherOpexAnnual) : '0',
  };
}

// Shared input props for every numeric field. Using text + inputMode avoids
// the React controlled-number-input quirks (cursor jumps, rejected keystrokes,
// value/display mismatches from floating-point roundtrips).
const numProps = { type: 'text', inputMode: 'decimal' };

export default function ScenarioForm({ initialInputs, initialUnits = 1, onSubmit, submitLabel = 'Save' }) {
  const [state, setState] = useState(() => {
    if (initialInputs) {
      const base = fromInputs(initialInputs);
      // Pad rents to match initialUnits if draft supplied fewer.
      while (base.unitRents.length < initialUnits) base.unitRents.push('');
      return base;
    }
    const base = { ...DEFAULTS };
    base.unitRents = Array(initialUnits).fill('');
    return base;
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initialInputs && initialUnits !== state.unitRents.length) {
      setState((s) => ({ ...s, unitRents: Array(initialUnits).fill('') }));
    }
  }, [initialUnits]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field, value) {
    setState((s) => ({ ...s, [field]: value }));
  }
  function updateUnitRent(idx, value) {
    setState((s) => {
      const next = [...s.unitRents];
      next[idx] = value;
      return { ...s, unitRents: next };
    });
  }
  function addUnit() {
    setState((s) => ({ ...s, unitRents: [...s.unitRents, ''] }));
  }
  function removeUnit(idx) {
    setState((s) => ({ ...s, unitRents: s.unitRents.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    // Upstream-required fields are validated by zod on the main side; we just
    // catch the raw parse failure and surface the message.
    if (!state.purchasePrice.trim() || !state.interestRatePct.trim()) {
      setError('Purchase price and interest rate are required.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(toInputs(state));
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Minimal inputs</h3>
      <div className="grid-2">
        <div>
          <label>Purchase price ($)</label>
          <input {...numProps} value={state.purchasePrice}
            onChange={(e) => update('purchasePrice', e.target.value)} />
        </div>
        <div>
          <label>Interest rate (%)</label>
          <input {...numProps} value={state.interestRatePct}
            onChange={(e) => update('interestRatePct', e.target.value)} />
        </div>
      </div>

      <h3 style={{ marginTop: 14 }}>Rents (one per unit)</h3>
      {state.unitRents.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label>Unit {i + 1} monthly rent ($)</label>
            <input {...numProps} value={r} onChange={(e) => updateUnitRent(i, e.target.value)} />
          </div>
          {state.unitRents.length > 1 && (
            <button type="button" className="ghost" onClick={() => removeUnit(i)}>Remove</button>
          )}
        </div>
      ))}
      <button type="button" className="ghost" onClick={addUnit}>+ Add unit</button>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div>
          <label>Annual taxes ($)</label>
          <input {...numProps} value={state.taxesAnnual}
            onChange={(e) => update('taxesAnnual', e.target.value)} />
        </div>
        <div>
          <label>Annual insurance ($)</label>
          <input {...numProps} value={state.insuranceAnnual}
            onChange={(e) => update('insuranceAnnual', e.target.value)} />
        </div>
      </div>

      <details>
        <summary>Advanced — financing, setup costs, operating assumptions, other expenses</summary>
        <h3>Financing</h3>
        <div className="grid-3">
          <div>
            <label>Down payment (%)</label>
            <input {...numProps} value={state.downPaymentPct}
              onChange={(e) => update('downPaymentPct', e.target.value)} />
          </div>
          <div>
            <label>Loan term (years)</label>
            <input type="text" inputMode="numeric" value={state.loanTermYears}
              onChange={(e) => update('loanTermYears', e.target.value)} />
          </div>
          <div>
            <label>Closing costs (% of price)</label>
            <input {...numProps} value={state.closingCostPct}
              onChange={(e) => update('closingCostPct', e.target.value)} />
          </div>
          <div>
            <label>Closing costs ($ per unit)</label>
            <input {...numProps} value={state.closingCostPerUnit}
              onChange={(e) => update('closingCostPerUnit', e.target.value)} />
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              If set above 0, this replaces the % above — it isn't added to it.
            </div>
          </div>
        </div>

        <h3>Initial setup costs (roll into total cash invested)</h3>
        <div className="grid-2">
          <div>
            <label>Repairs needed until rentable ($)</label>
            <input {...numProps} value={state.rehabBudget}
              onChange={(e) => update('rehabBudget', e.target.value)} />
          </div>
          <div>
            <label>Missed rent / holding costs during setup ($)</label>
            <input {...numProps} value={state.initialMissedRent}
              onChange={(e) => update('initialMissedRent', e.target.value)} />
            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
              Rent you won't collect while getting the property rent-ready, plus any mortgage/taxes/insurance paid during that window.
            </div>
          </div>
        </div>

        <h3>Operating assumptions</h3>
        <div className="grid-3">
          <div>
            <label>Vacancy (%)</label>
            <input {...numProps} value={state.vacancyPct}
              onChange={(e) => update('vacancyPct', e.target.value)} />
          </div>
          <div>
            <label>Management (%)</label>
            <input {...numProps} value={state.managementPct}
              onChange={(e) => update('managementPct', e.target.value)} />
          </div>
          <div>
            <label>Maintenance (%)</label>
            <input {...numProps} value={state.maintenancePct}
              onChange={(e) => update('maintenancePct', e.target.value)} />
          </div>
          <div>
            <label>CapEx (%)</label>
            <input {...numProps} value={state.capexPct}
              onChange={(e) => update('capexPct', e.target.value)} />
          </div>
          <div>
            <label>Other monthly income ($)</label>
            <input {...numProps} value={state.otherIncomeMonthly}
              onChange={(e) => update('otherIncomeMonthly', e.target.value)} />
          </div>
        </div>

        <h3>Other annual expenses</h3>
        <div className="grid-3">
          <div>
            <label>HOA ($)</label>
            <input {...numProps} value={state.hoaAnnual}
              onChange={(e) => update('hoaAnnual', e.target.value)} />
          </div>
          <div>
            <label>Utilities ($)</label>
            <input {...numProps} value={state.utilitiesAnnual}
              onChange={(e) => update('utilitiesAnnual', e.target.value)} />
          </div>
          <div>
            <label>Other opex ($)</label>
            <input {...numProps} value={state.otherOpexAnnual}
              onChange={(e) => update('otherOpexAnnual', e.target.value)} />
          </div>
        </div>
      </details>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
