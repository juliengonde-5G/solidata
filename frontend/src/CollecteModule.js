import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, StatCard, Badge } from './App';
import CAVPageV2 from './CAVPageV2';
import RoutesPageV2 from './RoutesPageV2';
import PlanificationModule from './PlanificationModule';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function CollecteModule({ user }) {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ immatriculation: "", nom: "", marque: "", modele: "" });
  const [toast, setToast] = useState(null);

  const loadStats = useCallback(async () => { setStats(await api("/dashboard")); }, []);
  const loadVehicles = useCallback(async () => { setVehicles(await api("/vehicles")); }, []);

  useEffect(() => { loadStats(); loadVehicles(); }, [loadStats, loadVehicles]);

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cav", label: "CAV" },
    { key: "vehicules", label: "Véhicules" },
    { key: "tournees", label: "Tournées" },
    { key: "planification", label: "Planification" },
    { key: "import", label: "Import" },
  ];

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await api("/vehicles", { method: "POST", body: JSON.stringify(vehicleForm) });
      setShowAddVehicle(false); setVehicleForm({ immatriculation: "", nom: "", marque: "", modele: "" }); loadVehicles();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleImport = async (filetype) => {
    try {
      const result = await api("/admin/import", { method: "POST", body: JSON.stringify({ filetype }) });
      setToast({ message: `Import terminé: ${JSON.stringify(result)}`, type: "success" });
      loadStats();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleUpload = async (filetype, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = window.__solidata_token || localStorage.getItem("solidata_token");
    const res = await fetch(`/api/admin/upload/${filetype}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Erreur upload");
    setToast({ message: "Fichier uploadé", type: "success" });
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none",
            background: tab === t.key ? T.primary : "transparent",
            color: tab === t.key ? "#fff" : T.sub,
            fontWeight: tab === t.key ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "Poppins",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === "dashboard" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard icon={"\u{1F4CD}"} label="CAV total" value={stats.cav_total} />
            <StatCard icon={"\u2705"} label="CAV actifs" value={stats.cav_actifs} color={T.success} />
            <StatCard icon={"\u{1F69B}"} label="Véhicules" value={stats.vehicules} />
            <StatCard icon={"\u{1F504}"} label="Tournées" value={stats.tournees} />
            <StatCard icon={"\u2696\uFE0F"} label="Tonnage annuel" value={`${stats.tonnage_annuel}t`} color={T.warning} />
          </div>
        </div>
      )}

      {/* CAV */}
      {tab === "cav" && <CAVPageV2 />}

      {/* Véhicules */}
      {tab === "vehicules" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Véhicules ({vehicles.length})</h3>
            <Btn onClick={() => setShowAddVehicle(true)}>+ Véhicule</Btn>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {vehicles.map(v => (
              <Card key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.nom || v.immatriculation}</div>
                  <div style={{ color: T.sub, fontSize: 12 }}>{v.marque} {v.modele} — {v.immatriculation}</div>
                </div>
                <Badge color={v.is_active ? T.success : T.danger}>{v.is_active ? "Actif" : "Inactif"}</Badge>
              </Card>
            ))}
          </div>
          {showAddVehicle && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
              <form onSubmit={handleAddVehicle} style={{ background: T.card, borderRadius: 16, padding: 32, width: 400 }}>
                <h3 style={{ marginBottom: 16 }}>Nouveau véhicule</h3>
                {["immatriculation", "nom", "marque", "modele"].map(f => (
                  <input key={f} placeholder={f} value={vehicleForm[f]} onChange={e => setVehicleForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
                ))}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setShowAddVehicle(false)}>Annuler</Btn>
                  <Btn>Créer</Btn>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tournées */}
      {tab === "tournees" && <RoutesPageV2 />}

      {/* Planification */}
      {tab === "planification" && <PlanificationModule />}

      {/* Import */}
      {tab === "import" && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Import de données Excel</h3>
          <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
            {[
              { key: "tonnage", label: "Fichier tonnage (pesées)", accept: ".xlsx" },
              { key: "tournees", label: "Fichier tournées (CAV + tournées)", accept: ".xlsx" },
            ].map(item => (
              <Card key={item.key}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
                <input type="file" accept={item.accept} onChange={e => {
                  if (e.target.files[0]) handleUpload(item.key, e.target.files[0]);
                }} />
                <Btn style={{ marginTop: 8 }} onClick={() => handleImport(item.key)}>Lancer l'import</Btn>
              </Card>
            ))}
            <Btn onClick={() => handleImport("all")}>Importer tout</Btn>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? T.danger : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
