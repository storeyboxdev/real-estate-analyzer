import { useEffect, useState } from 'react';
import ListingPasteDialog from '../components/ListingPasteDialog.jsx';

export default function PropertyListPage({ onOpenProperty }) {
  const [properties, setProperties] = useState([]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ address: '', propertyType: 'sfr', units: 1, notes: '' });
  const [error, setError] = useState(null);

  async function refresh() {
    setProperties(await window.api.properties.list());
  }
  useEffect(() => { refresh(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await window.api.properties.create({
        address: form.address.trim(),
        propertyType: form.propertyType,
        units: Number(form.units) || 1,
        notes: form.notes.trim() || null,
      });
      setForm({ address: '', propertyType: 'sfr', units: 1, notes: '' });
      setCreating(false);
      await refresh();
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  async function handleImportCreate({ property, scenarioDraft }) {
    const created = await window.api.properties.create(property);
    setImporting(false);
    await refresh();
    // Navigate to the detail page with the parsed scenario draft so the new-scenario
    // form opens pre-filled.
    onOpenProperty(created.id, Object.keys(scenarioDraft).length ? scenarioDraft : null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Properties</h1>
        <button className="ghost" onClick={() => { setImporting((v) => !v); setCreating(false); }}>
          {importing ? 'Cancel import' : 'Import from paste'}
        </button>
        <button onClick={() => { setCreating((v) => !v); setImporting(false); }}>
          {creating ? 'Cancel' : '+ Add property'}
        </button>
      </div>

      {importing && (
        <div style={{ marginTop: 14 }}>
          <ListingPasteDialog
            onCreate={handleImportCreate}
            onCancel={() => setImporting(false)}
          />
        </div>
      )}

      {creating && (
        <form className="card" onSubmit={submit} style={{ marginTop: 14 }}>
          <div className="grid-3">
            <div style={{ gridColumn: '1 / 3' }}>
              <label>Address</label>
              <input required value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label>Type</label>
              <select value={form.propertyType}
                onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}>
                <option value="sfr">Single-family</option>
                <option value="multifamily">Multi-family</option>
              </select>
            </div>
            <div>
              <label>Units</label>
              <input type="number" min="1" value={form.units}
                onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '2 / 4' }}>
              <label>Notes</label>
              <input value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="submit">Create</button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>
      )}

      {properties.length === 0 ? (
        <div className="muted" style={{ marginTop: 20 }}>No properties yet. Add one to get started.</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {properties.map((p) => (
            <div key={p.id} className="prop-row" onClick={() => onOpenProperty(p.id)}>
              <div className="type">{p.property_type === 'sfr' ? 'Single-family' : 'Multi-family'}</div>
              <div className="units">x{p.units}</div>
              <div className="address">{p.address}</div>
              <div className="notes">{p.notes || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
