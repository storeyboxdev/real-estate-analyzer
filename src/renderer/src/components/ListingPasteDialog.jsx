import { useState } from 'react';
import { parseListingPaste } from '../../../core/parsers/listingPaste.js';

// Two-stage dialog: paste → parse preview (editable) → create.
// When the user clicks Create, calls onCreate({ property, notes, scenarioDraft })
// and the parent is responsible for creating the property + navigating.
export default function ListingPasteDialog({ onCreate, onCancel }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [property, setProperty] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  function doParse() {
    setError(null);
    try {
      const result = parseListingPaste(text);
      setParsed(result);
      setProperty({
        address: result.property.address,
        propertyType: result.property.propertyType,
        units: result.property.units,
      });
      setScenario({
        purchasePrice: result.scenario.purchasePrice ?? '',
        rent: result.scenario.unitRents?.[0] ?? '',
        taxesAnnual: result.scenario.taxesAnnual ?? '',
        hoaAnnual: result.scenario.hoaAnnual ?? '',
      });
      setNotes(result.notes || '');
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  async function doCreate() {
    setError(null);
    if (!property.address.trim()) {
      setError('Address is required');
      return;
    }
    const scenarioDraft = {};
    if (scenario.purchasePrice) scenarioDraft.purchasePrice = Number(scenario.purchasePrice);
    if (scenario.rent) {
      scenarioDraft.unitRents = Array(property.units).fill(0);
      scenarioDraft.unitRents[0] = Number(scenario.rent);
    }
    if (scenario.taxesAnnual) scenarioDraft.taxesAnnual = Number(scenario.taxesAnnual);
    if (scenario.hoaAnnual) scenarioDraft.hoaAnnual = Number(scenario.hoaAnnual);

    try {
      await onCreate({
        property: {
          address: property.address.trim(),
          propertyType: property.propertyType,
          units: Number(property.units) || 1,
          notes: notes.trim() || null,
        },
        scenarioDraft,
      });
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Import from listing paste</h2>
        <button className="ghost" onClick={onCancel}>Close</button>
      </div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Copy the page text (or the key lines) from a listing and paste below.
        I'll pull out what I can and you can fix anything that looks off
        before creating the property.
      </div>

      {!parsed && (
        <>
          <label>Pasted text</label>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the listing text here…"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button onClick={doParse} disabled={!text.trim()}>Parse</button>
          </div>
        </>
      )}

      {parsed && (
        <>
          {parsed.warnings.length > 0 && (
            <div style={{ marginBottom: 10 }} className="muted">
              Couldn't auto-detect: {parsed.warnings.join(', ')}. Fill these in below.
            </div>
          )}
          <h3>Property</h3>
          <div className="grid-3">
            <div style={{ gridColumn: '1 / 3' }}>
              <label>Address</label>
              <input value={property.address}
                onChange={(e) => setProperty({ ...property, address: e.target.value })} />
            </div>
            <div>
              <label>Type</label>
              <select value={property.propertyType}
                onChange={(e) => setProperty({ ...property, propertyType: e.target.value })}>
                <option value="sfr">Single-family</option>
                <option value="multifamily">Multi-family</option>
              </select>
            </div>
            <div>
              <label>Units</label>
              <input type="number" min="1" value={property.units}
                onChange={(e) => setProperty({ ...property, units: e.target.value })} />
            </div>
            <div style={{ gridColumn: '2 / 4' }}>
              <label>Notes (beds/baths/sqft)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <h3 style={{ marginTop: 14 }}>Scenario draft (pre-fills the new-scenario form)</h3>
          <div className="grid-2">
            <div>
              <label>Purchase price ($)</label>
              <input type="number" step="any" value={scenario.purchasePrice}
                onChange={(e) => setScenario({ ...scenario, purchasePrice: e.target.value })} />
            </div>
            <div>
              <label>Unit 1 monthly rent ($)</label>
              <input type="number" step="any" value={scenario.rent}
                onChange={(e) => setScenario({ ...scenario, rent: e.target.value })} />
            </div>
            <div>
              <label>Annual taxes ($)</label>
              <input type="number" step="any" value={scenario.taxesAnnual}
                onChange={(e) => setScenario({ ...scenario, taxesAnnual: e.target.value })} />
            </div>
            <div>
              <label>Annual HOA ($)</label>
              <input type="number" step="any" value={scenario.hoaAnnual}
                onChange={(e) => setScenario({ ...scenario, hoaAnnual: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button onClick={doCreate}>Create property with this draft</button>
            <button className="ghost" onClick={() => setParsed(null)}>Back to paste</button>
          </div>
        </>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
