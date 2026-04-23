import { useState } from 'react';
import PropertyListPage from './pages/PropertyListPage.jsx';
import PropertyDetailPage from './pages/PropertyDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  const [view, setView] = useState({ name: 'list' });

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">Real Estate Analyzer</div>
        <nav>
          <button
            className={view.name === 'list' || view.name === 'detail' ? 'active' : ''}
            onClick={() => setView({ name: 'list' })}
          >
            Properties
          </button>
          <button
            className={view.name === 'settings' ? 'active' : ''}
            onClick={() => setView({ name: 'settings' })}
          >
            Settings
          </button>
        </nav>
      </header>
      <main className="content">
        {view.name === 'list' && (
          <PropertyListPage
            onOpenProperty={(id, scenarioDraft) =>
              setView({ name: 'detail', propertyId: id, scenarioDraft })
            }
          />
        )}
        {view.name === 'detail' && (
          <PropertyDetailPage
            propertyId={view.propertyId}
            scenarioDraft={view.scenarioDraft}
            onBack={() => setView({ name: 'list' })}
          />
        )}
        {view.name === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
