import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('Vérification...');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setApiStatus(data.status === 'ok' ? 'Connecté' : 'Erreur'))
      .catch(() => setApiStatus('Hors ligne'));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Solidata</h1>
        <p className="subtitle">Gestion de collecte et tri des déchets</p>
      </header>

      <main className="main">
        <div className="card">
          <h2>Bienvenue</h2>
          <p>L'application est en cours de déploiement.</p>
          <div className="status">
            <span className="status-label">API Backend :</span>
            <span className={`status-value ${apiStatus === 'Connecté' ? 'ok' : 'error'}`}>
              {apiStatus}
            </span>
          </div>
        </div>

        <div className="modules">
          <div className="module-card">
            <h3>Collecte</h3>
            <p>Suivi GPS, scan QR, pesées</p>
          </div>
          <div className="module-card">
            <h3>Tri (POJ)</h3>
            <p>Plan d'occupation journalier</p>
          </div>
          <div className="module-card">
            <h3>Reporting</h3>
            <p>Bilans, tonnages, impact CO₂</p>
          </div>
          <div className="module-card">
            <h3>Équipe</h3>
            <p>Planning, recrutement</p>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Solidata v0.1 — SolTex Environnement</p>
      </footer>
    </div>
  );
}

export default App;
