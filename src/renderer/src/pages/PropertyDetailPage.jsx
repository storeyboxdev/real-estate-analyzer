import { useCallback, useEffect, useState } from 'react';
import ScenarioForm from '../components/ScenarioForm.jsx';
import MetricsPanel from '../components/MetricsPanel.jsx';
import { fmtDate } from '../lib/format.js';

export default function PropertyDetailPage({ propertyId, onBack }) {
  const [property, setProperty] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [latest, setLatest] = useState(null);
  const [mode, setMode] = useState('view'); // view | edit | newScenario
  const [newName, setNewName] = useState('');

  const loadProperty = useCallback(async () => {
    const p = await window.api.properties.getById(propertyId);
    setProperty(p);
  }, [propertyId]);

  const loadScenarios = useCallback(async () => {
    const list = await window.api.scenarios.listForProperty(propertyId);
    setScenarios(list);
    if (list.length > 0 && !list.find((s) => s.id === activeScenarioId)) {
      const current = list.find((s) => s.is_current) ?? list[0];
      setActiveScenarioId(current.id);
    } else if (list.length === 0) {
      setActiveScenarioId(null);
      setLatest(null);
    }
  }, [propertyId, activeScenarioId]);

  const loadLatest = useCallback(async () => {
    if (!activeScenarioId) return;
    const r = await window.api.revisions.latest(activeScenarioId);
    setLatest(r ?? null);
  }, [activeScenarioId]);

  useEffect(() => { loadProperty(); }, [loadProperty]);
  useEffect(() => { loadScenarios(); }, [loadScenarios]);
  useEffect(() => { loadLatest(); }, [loadLatest]);

  async function handleCreateScenario(inputs) {
    if (!newName.trim()) throw new Error('Name is required');
    const { scenario } = await window.api.scenarios.create(propertyId, {
      name: newName.trim(),
      isCurrent: scenarios.length === 0,
      inputs,
      note: null,
    });
    setNewName('');
    setMode('view');
    setActiveScenarioId(scenario.id);
    await loadScenarios();
  }

  async function handleUpdateScenario(inputs) {
    await window.api.scenarios.update(activeScenarioId, { inputs, note: null });
    setMode('view');
    await loadLatest();
    await loadScenarios();
  }

  async function handleSetCurrent() {
    await window.api.scenarios.setCurrent(activeScenarioId);
    await loadScenarios();
  }

  async function handleDeleteScenario() {
    if (!confirm('Delete this scenario and all its revisions?')) return;
    await window.api.scenarios.delete(activeScenarioId);
    setActiveScenarioId(null);
    await loadScenarios();
  }

  if (!property) return <div>Loading…</div>;

  const active = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <div>
      <button className="ghost" onClick={onBack}>← Back</button>
      <h1 style={{ marginTop: 10 }}>{property.address}</h1>
      <div className="muted">
        {property.property_type === 'sfr' ? 'Single-family' : 'Multi-family'}
        {' · '}x{property.units}
        {property.notes ? ' · ' + property.notes : ''}
      </div>

      {/* Scenario tabs */}
      <div className="scenario-tabs" style={{ marginTop: 18 }}>
        {scenarios.map((s) => (
          <button
            key={s.id}
            className={`tab ${s.id === activeScenarioId ? 'active' : ''}`}
            onClick={() => { setActiveScenarioId(s.id); setMode('view'); }}
          >
            {s.name}
            {s.is_current ? <span className="badge">current</span> : null}
          </button>
        ))}
        <button
          className={`tab ${mode === 'newScenario' ? 'active' : ''}`}
          onClick={() => setMode(mode === 'newScenario' ? 'view' : 'newScenario')}
        >
          + New scenario
        </button>
      </div>

      {mode === 'newScenario' && (
        <div className="card">
          <h2>New scenario</h2>
          <label>Scenario name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. asking, my offer, after rate drop" />
          <div style={{ marginTop: 12 }}>
            <ScenarioForm initialUnits={property.units} submitLabel="Create scenario" onSubmit={handleCreateScenario} />
          </div>
        </div>
      )}

      {mode === 'edit' && active && (
        <div className="card">
          <h2>Update "{active.name}"</h2>
          <div className="muted" style={{ marginBottom: 8 }}>
            A new revision will be appended; the previous one is preserved in history.
          </div>
          <ScenarioForm
            initialInputs={latest?.inputs}
            initialUnits={property.units}
            submitLabel="Save revision"
            onSubmit={handleUpdateScenario}
          />
          <div style={{ marginTop: 10 }}>
            <button className="ghost" onClick={() => setMode('view')}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'view' && active && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, flex: 1 }}>{active.name}</h2>
            {!active.is_current && (
              <button className="ghost" onClick={handleSetCurrent}>Set as current</button>
            )}
            <button onClick={() => setMode('edit')}>Edit / update</button>
            <button className="danger" onClick={handleDeleteScenario}>Delete</button>
          </div>
          {latest ? (
            <>
              <div className="muted" style={{ margin: '8px 0 14px' }}>
                Latest revision: {fmtDate(latest.created_at)}
              </div>
              <MetricsPanel outputs={latest.outputs} />
            </>
          ) : (
            <div className="muted" style={{ marginTop: 8 }}>No revisions yet for this scenario.</div>
          )}
        </div>
      )}

      {scenarios.length === 0 && mode === 'view' && (
        <div className="card muted">No scenarios yet — click "+ New scenario" above to add one.</div>
      )}
    </div>
  );
}
