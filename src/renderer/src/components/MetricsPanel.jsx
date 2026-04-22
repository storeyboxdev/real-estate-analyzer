import { fmtUsd, fmtPct, fmtNum } from '../lib/format.js';

function Row({ k, v, cls = '' }) {
  return (
    <>
      <div className="k">{k}</div>
      <div className={`v ${cls}`}>{v}</div>
    </>
  );
}

export default function MetricsPanel({ outputs }) {
  if (!outputs) return <div className="muted">No metrics yet — create a revision first.</div>;
  return (
    <div className="metrics">
      <div className="group">Financing</div>
      <Row k="Loan amount" v={fmtUsd(outputs.loanAmount)} />
      <Row k="Down payment" v={fmtUsd(outputs.downPayment)} />
      <Row k="Closing costs" v={fmtUsd(outputs.closingCosts)} />
      <Row k="Total cash invested" v={fmtUsd(outputs.totalCashInvested)} />
      <Row k="Monthly payment" v={fmtUsd(outputs.monthlyPayment)} />
      <Row k="Annual debt service" v={fmtUsd(outputs.annualDebtService)} />

      <div className="group">Income & Expenses</div>
      <Row k="Gross scheduled income" v={fmtUsd(outputs.grossScheduledIncome)} />
      <Row k="Effective gross income" v={fmtUsd(outputs.effectiveGrossIncome)} />
      <Row k="Operating expenses" v={fmtUsd(outputs.operatingExpenses)} />
      <Row k="NOI" v={fmtUsd(outputs.noi)} />
      <Row k="Annual cash flow" v={fmtUsd(outputs.annualCashFlow)} cls={outputs.annualCashFlow >= 0 ? 'good' : 'bad'} />
      <Row k="Monthly cash flow" v={fmtUsd(outputs.monthlyCashFlow)} cls={outputs.monthlyCashFlow >= 0 ? 'good' : 'bad'} />

      <div className="group">Returns vs. Hurdles</div>
      <Row k="Cap rate" v={fmtPct(outputs.capRate) + (outputs.meetsCapRate ? '  ✓' : '  ✗')} cls={outputs.meetsCapRate ? 'good' : 'bad'} />
      <Row k="Cash-on-cash" v={fmtPct(outputs.cocReturn) + (outputs.meetsCoCReturn ? '  ✓' : '  ✗')} cls={outputs.meetsCoCReturn ? 'good' : 'bad'} />
      <Row k="DSCR" v={Number.isFinite(outputs.dscr) ? fmtNum(outputs.dscr) : String(outputs.dscr)} cls={outputs.dscr >= 1 ? 'good' : 'bad'} />
      <Row k="GRM" v={fmtNum(outputs.grm)} />
    </div>
  );
}
