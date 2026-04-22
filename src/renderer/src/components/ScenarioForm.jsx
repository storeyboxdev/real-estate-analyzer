import { useEffect, useState } from 'react';

// Fields are keyed by the zod schema names in src/core/models/inputs.js.
// Percentage fields are entered as "7" and divided by 100 before submit.

const DEFAULTS = {
  purchasePrice: '',
  interestRatePct: '',
  unitRents: [''],
  taxesAnnual: '',
  insuranceAnnual: '',

  // advanced
  downPaymentPct: 25,
  loanTermYears: 30,
  closingCostPct: 3,
  closingCostPerUnit: 0,
  rehabBudget: 0,
  otherIncomeMonthly: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenancePct: 5,
  capexPct: 5,
  hoaAnnual: 0,
  utilitiesAnnual: 0,
  otherOpexAnnual: 0,
};

function toInputs(state) {
  return {
    purchasePrice: Number(state.purchasePrice),
    closingCostPct: Number(state.closingCostPct) / 100,
    closingCostPerUnit: Number(state.closingCostPerUnit),
    rehabBudget: Number(state.rehabBudget),
    downPaymentPct: Number(state.downPaymentPct) / 100,
    loanTermYears: Number(state.loanTermYears),
    interestRate: Number(state.interestRatePct) / 100,
    unitRents: state.unitRents.map((r) => Number(r) || 0),
    otherIncomeMonthly: Number(state.otherIncomeMonthly),
    vacancyPct: Number(state.vacancyPct) / 100,
    managementPct: Number(state.managementPct) / 100,
    maintenancePct: Number(state.maintenancePct) / 100,
    capexPct: Number(state.capexPct) / 100,
    taxesAnnual: Number(state.taxesAnnual) || 0,
    insuranceAnnual: Number(state.insuranceAnnual) || 0,
    hoaAnnual: Number(state.hoaAnnual),
    utilitiesAnnual: Number(state.utilitiesAnnual),
    otherOpexAnnual: Number(state.otherOpexAnnual),
  };
}

// Convert an inputs object (from a saved revision) back into form state.
function fromInputs(inputs) {
  if (!inputs) return { ...DEFAULTS };
  return {
    purchasePrice: String(inputs.purchasePrice ?? ''),
    interestRatePct: String((inputs.interestRate ?? 0) * 100),
    unitRents: (inputs.unitRents ?? ['']).map((r) => String(r)),
    taxesAnnual: String(inputs.taxesAnnual ?? 0),
    insuranceAnnual: String(inputs.insuranceAnnual ?? 0),
    downPaymentPct: (inputs.downPaymentPct ?? 0.25) * 100,
    loanTermYears: inputs.loanTermYears ?? 30,
    closingCostPct: (inputs.closingCostPct ?? 0.03) * 100,
    closingCostPerUnit: inputs.closingCostPerUnit ?? 0,
    rehabBudget: inputs.rehabBudget ?? 0,
    otherIncomeMonthly: inputs.otherIncomeMonthly ?? 0,
    vacancyPct: (inputs.vacancyPct ?? 0.05) * 100,
    managementPct: (inputs.managementPct ?? 0.08) * 100,
    maintenancePct: (inputs.maintenancePct ?? 0.05) * 100,
    capexPct: (inputs.capexPct ?? 0.05) * 100,
    hoaAnnual: inputs.hoaAnnual ?? 0,
    utilitiesAnnual: inputs.utilitiesAnnual ?? 0,
    otherOpexAnnual: inputs.otherOpexAnnual ?? 0,
  };
}

export default function ScenarioForm({ initialInputs, initialUnits = 1, onSubmit, submitLabel = 'Save' }) {
  const [state, setState] = useState(() => {
    if (initialInputs) return fromInputs(initialInputs);
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
          <input type="number" step="any" required value={state.purchasePrice}
            onChange={(e) => update('purchasePrice', e.target.value)} />
        </div>
        <div>
          <label>Interest rate (%)</label>
          <input type="number" step="any" required value={state.interestRatePct}
            onChange={(e) => update('interestRatePct', e.target.value)} />
        </div>
      </div>

      <h3 style={{ marginTop: 14 }}>Rents (one per unit)</h3>
      {state.unitRents.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label>Unit {i + 1} monthly rent ($)</label>
            <input type="number" step="any" value={r} onChange={(e) => updateUnitRent(i, e.target.value)} />
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
          <input type="number" step="any" value={state.taxesAnnual}
            onChange={(e) => update('taxesAnnual', e.target.value)} />
        </div>
        <div>
          <label>Annual insurance ($)</label>
          <input type="number" step="any" value={state.insuranceAnnual}
            onChange={(e) => update('insuranceAnnual', e.target.value)} />
        </div>
      </div>

      <details>
        <summary>Advanced — financing, operating assumptions, other expenses</summary>
        <h3>Financing</h3>
        <div className="grid-3">
          <div>
            <label>Down payment (%)</label>
            <input type="number" step="any" value={state.downPaymentPct}
              onChange={(e) => update('downPaymentPct', e.target.value)} />
          </div>
          <div>
            <label>Loan term (years)</label>
            <input type="number" step="1" value={state.loanTermYears}
              onChange={(e) => update('loanTermYears', e.target.value)} />
          </div>
          <div>
            <label>Rehab budget ($)</label>
            <input type="number" step="any" value={state.rehabBudget}
              onChange={(e) => update('rehabBudget', e.target.value)} />
          </div>
          <div>
            <label>Closing costs (% of price)</label>
            <input type="number" step="any" value={state.closingCostPct}
              onChange={(e) => update('closingCostPct', e.target.value)} />
          </div>
          <div>
            <label>Closing costs ($ per unit)</label>
            <input type="number" step="any" value={state.closingCostPerUnit}
              onChange={(e) => update('closingCostPerUnit', e.target.value)} />
          </div>
        </div>

        <h3>Operating assumptions</h3>
        <div className="grid-3">
          <div>
            <label>Vacancy (%)</label>
            <input type="number" step="any" value={state.vacancyPct}
              onChange={(e) => update('vacancyPct', e.target.value)} />
          </div>
          <div>
            <label>Management (%)</label>
            <input type="number" step="any" value={state.managementPct}
              onChange={(e) => update('managementPct', e.target.value)} />
          </div>
          <div>
            <label>Maintenance (%)</label>
            <input type="number" step="any" value={state.maintenancePct}
              onChange={(e) => update('maintenancePct', e.target.value)} />
          </div>
          <div>
            <label>CapEx (%)</label>
            <input type="number" step="any" value={state.capexPct}
              onChange={(e) => update('capexPct', e.target.value)} />
          </div>
          <div>
            <label>Other monthly income ($)</label>
            <input type="number" step="any" value={state.otherIncomeMonthly}
              onChange={(e) => update('otherIncomeMonthly', e.target.value)} />
          </div>
        </div>

        <h3>Other annual expenses</h3>
        <div className="grid-3">
          <div>
            <label>HOA ($)</label>
            <input type="number" step="any" value={state.hoaAnnual}
              onChange={(e) => update('hoaAnnual', e.target.value)} />
          </div>
          <div>
            <label>Utilities ($)</label>
            <input type="number" step="any" value={state.utilitiesAnnual}
              onChange={(e) => update('utilitiesAnnual', e.target.value)} />
          </div>
          <div>
            <label>Other opex ($)</label>
            <input type="number" step="any" value={state.otherOpexAnnual}
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
