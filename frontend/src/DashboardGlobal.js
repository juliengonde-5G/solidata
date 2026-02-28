import React, { useState, useEffect } from 'react';
import api from './utils/api';
import { Card, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function DashboardGlobal() {
  const [stats, setStats] = useState(null);
  const [recStats, setRecStats] = useState(null);

  useEffect(() => {
    api("/dashboard").then(setStats).catch(() => {});
    api("/stats").then(setRecStats).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 20 }}>Dashboard Global</h2>

      {stats && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Collecte</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <StatCard icon={"\u{1F4CD}"} label="CAV total" value={stats.cav_total} />
            <StatCard icon={"\u2705"} label="CAV actifs" value={stats.cav_actifs} color={T.success} />
            <StatCard icon={"\u{1F69B}"} label="Véhicules" value={stats.vehicules} />
            <StatCard icon={"\u{1F504}"} label="Tournées" value={stats.tournees} />
            <StatCard icon={"\u2696\uFE0F"} label="Tonnage annuel" value={`${stats.tonnage_annuel}t`} color={T.warning} />
          </div>
        </div>
      )}

      {recStats && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.sub, marginBottom: 12 }}>Recrutement</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <StatCard icon={"\u{1F4CB}"} label="Candidats" value={recStats.total_candidats} />
            <StatCard icon={"\u{1F4BC}"} label="Postes" value={recStats.total_postes} />
            <StatCard icon={"\u2705"} label="Recrutés" value={recStats.par_statut?.hired || 0} color={T.success} />
            <StatCard icon={"\u{1F4AC}"} label="En entretien" value={recStats.par_statut?.interview || 0} color={T.warning} />
          </div>
        </div>
      )}
    </div>
  );
}
