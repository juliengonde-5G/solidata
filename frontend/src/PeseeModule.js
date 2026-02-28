import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function PeseeModule() {
  const [tab, setTab] = useState("saisie");
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ poids_brut: "", tare: "", note: "", vehicle_id: "", daily_route_id: "" });
  const [vehicles, setVehicles] = useState([]);
  const [toast, setToast] = useState(null);

  const loadStats = useCallback(async () => { setStats(await api("/pesee/stats")); }, []);
  const loadHistory = useCallback(async () => { setHistory(await api("/pesee/history")); }, []);
  const loadVehicles = useCallback(async () => { setVehicles(await api("/vehicles")); }, []);

  useEffect(() => { loadStats(); loadHistory(); loadVehicles(); }, [loadStats, loadHistory, loadVehicles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const brut = parseInt(form.poids_brut) || 0;
      const tare = parseInt(form.tare) || 0;
      await api("/pesee/", { method: "POST", body: JSON.stringify({
        poids_brut: brut, tare: tare, poids_net: brut - tare,
        note: form.note, vehicle_id: form.vehicle_id || null, daily_route_id: form.daily_route_id || null,
      })});
      setForm({ poids_brut: "", tare: "", note: "", vehicle_id: "", daily_route_id: "" });
      loadStats(); loadHistory();
      setToast({ message: "Pesée enregistrée" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 16 }}>Pesée</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["saisie", "historique", "stats"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 16px", borderRadius: 20, border: `1px solid ${tab === t ? T.primary : T.border}`,
            background: tab === t ? T.primary + "15" : "transparent",
            color: tab === t ? T.primary : T.sub, fontSize: 12, cursor: "pointer", fontFamily: "Poppins", fontWeight: tab === t ? 600 : 400,
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "saisie" && (
        <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
          <Card style={{ marginBottom: 16 }}>
            <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 12, fontSize: 13, fontFamily: "Poppins" }}>
              <option value="">Véhicule (optionnel)</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.nom || v.immatriculation}</option>)}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: T.sub }}>Poids brut (kg)</label>
                <input type="number" value={form.poids_brut} onChange={e => setForm(f => ({ ...f, poids_brut: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: "Poppins" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: T.sub }}>Tare (kg)</label>
                <input type="number" value={form.tare} onChange={e => setForm(f => ({ ...f, tare: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: "Poppins" }} />
              </div>
            </div>
            {form.poids_brut && form.tare && (
              <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: T.primary, textAlign: "center" }}>
                Poids net: {(parseInt(form.poids_brut) || 0) - (parseInt(form.tare) || 0)} kg
              </div>
            )}
            <textarea placeholder="Note (optionnel)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 12, fontSize: 13, fontFamily: "Poppins", minHeight: 60 }} />
          </Card>
          <Btn style={{ width: "100%" }}>Enregistrer la pesée</Btn>
        </form>
      )}

      {tab === "historique" && (
        <div>
          {history.map(w => (
            <Card key={w.id} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{w.poids_net} kg net</div>
                <div style={{ color: T.sub, fontSize: 11 }}>{w.vehicule_nom || ""} — {w.weighed_at ? new Date(w.weighed_at).toLocaleDateString("fr-FR") : ""}</div>
              </div>
              <div style={{ fontSize: 12, color: T.sub }}>{w.poids_brut} brut / {w.tare} tare</div>
            </Card>
          ))}
        </div>
      )}

      {tab === "stats" && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <StatCard icon={"\u2696\uFE0F"} label="Total" value={`${Math.round((stats.total_kg || 0) / 1000 * 10) / 10}t`} />
          <StatCard icon={"\u{1F4CA}"} label="Nb pesées" value={stats.nb_pesees} />
          <StatCard icon={"\u{1F4CF}"} label="Moyenne" value={`${stats.moyenne_kg} kg`} />
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
