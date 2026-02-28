import React, { useState, useEffect } from 'react';
import api from './utils/api';
import { Card, Btn, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12" };

const MOIS_NOMS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function ReportingModule() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [synthese, setSynthese] = useState(null);

  useEffect(() => {
    api(`/reporting/synthese?annee=${annee}`).then(setSynthese);
  }, [annee]);

  const handleExport = () => {
    const token = window.__solidata_token || localStorage.getItem("solidata_token");
    window.open(`/api/reporting/export-pdf?annee=${annee}`, "_blank");
  };

  if (!synthese) return <div style={{ padding: 40, textAlign: "center", color: T.sub }}>Chargement...</div>;

  const maxMois = Math.max(...Object.values(synthese.par_mois || {}), 1);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Reporting</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))}
            style={{ padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: "Poppins", fontSize: 13 }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Btn onClick={handleExport}>Export PDF</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon={"\u2696\uFE0F"} label="Tonnage" value={`${synthese.tonnage_tonnes}t`} />
        <StatCard icon={"\u{1F4CA}"} label="Pesées" value={synthese.nb_pesees} />
        <StatCard icon={"\u{1F69B}"} label="Collectes" value={synthese.nb_collectes} />
        <StatCard icon={"\u{1F33F}"} label="CO2 évité" value={`${synthese.co2_evite_kg}kg`} color={T.success} />
        <StatCard icon={"\u{1F4A7}"} label="Eau économisée" value={`${Math.round(synthese.eau_economisee_litres / 1000)}m³`} color="#3498db" />
        <StatCard icon={"\u{1F465}"} label="Emplois insertion" value={synthese.emplois_insertion} color={T.warning} />
      </div>

      {/* Graphique mensuel */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Tonnage par mois</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const val = synthese.par_mois?.[m] || 0;
            const height = maxMois > 0 ? (val / maxMois) * 130 : 0;
            return (
              <div key={m} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.sub, marginBottom: 4 }}>{val ? Math.round(val / 1000 * 10) / 10 + "t" : ""}</div>
                <div style={{ height: height || 2, background: T.primary, borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>{MOIS_NOMS[m]}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Impacts */}
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Impacts environnementaux (facteurs ADEME)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 12, background: T.success + "10", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: T.sub }}>CO2 évité</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.success }}>{synthese.co2_evite_kg} kg</div>
            <div style={{ fontSize: 10, color: T.sub }}>22 kg CO2 / tonne recyclée</div>
          </div>
          <div style={{ padding: 12, background: "#3498db10", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: T.sub }}>Eau économisée</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#3498db" }}>{Math.round(synthese.eau_economisee_litres).toLocaleString()} L</div>
            <div style={{ fontSize: 10, color: T.sub }}>15 000 L / tonne recyclée</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
