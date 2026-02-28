import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function MaterielModule() {
  const [tab, setTab] = useState("checklist");
  const [checklists, setChecklists] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", kilometrage: "", eclairage_ok: true, freins_ok: true, retros_ok: true, proprete_ok: true, hayons_ok: true, commentaire: "" });
  const [incidentForm, setIncidentForm] = useState({ type: "", description: "", severity: "moyen", cav_id: "", vehicle_id: "" });
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [toast, setToast] = useState(null);

  const loadAll = useCallback(async () => {
    const [cl, inc, veh] = await Promise.all([api("/materiel/checklist/today"), api("/materiel/incidents"), api("/vehicles")]);
    setChecklists(cl); setIncidents(inc); setVehicles(veh);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const handleChecklist = async (e) => {
    e.preventDefault();
    try {
      await api("/materiel/checklist", { method: "POST", body: JSON.stringify({ ...form, vehicle_id: parseInt(form.vehicle_id), kilometrage: parseInt(form.kilometrage) || null }) });
      setShowForm(false); loadAll();
      setToast({ message: "Checklist enregistrée" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleIncident = async (e) => {
    e.preventDefault();
    try {
      await api("/materiel/incident", { method: "POST", body: JSON.stringify({ ...incidentForm, cav_id: incidentForm.cav_id || null, vehicle_id: incidentForm.vehicle_id || null }) });
      setShowIncidentForm(false); loadAll();
      setToast({ message: "Incident signalé" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 16 }}>Matériel</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["checklist", "incidents"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 16px", borderRadius: 20, border: `1px solid ${tab === t ? T.primary : T.border}`,
            background: tab === t ? T.primary + "15" : "transparent",
            color: tab === t ? T.primary : T.sub, fontSize: 12, cursor: "pointer", fontFamily: "Poppins",
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === "checklist" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Checklists du jour</h3>
            <Btn onClick={() => setShowForm(true)}>+ Checklist</Btn>
          </div>
          {checklists.map(cl => (
            <Card key={cl.id} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{cl.vehicule_nom} ({cl.vehicule_immat})</div>
                <div style={{ color: T.sub, fontSize: 11 }}>{cl.kilometrage ? `${cl.kilometrage} km` : ""} {cl.commentaire || ""}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["eclairage_ok", "\u{1F4A1}"], ["freins_ok", "\u{1F6D1}"], ["retros_ok", "\u{1FA9E}"], ["hayons_ok", "\u{1F6AA}"]].map(([k, icon]) => (
                  <span key={k} style={{ fontSize: 14, opacity: cl[k] ? 1 : 0.3 }}>{icon}</span>
                ))}
              </div>
            </Card>
          ))}
          {showForm && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
              <form onSubmit={handleChecklist} style={{ background: T.card, borderRadius: 16, padding: 32, width: 420 }}>
                <h3 style={{ marginBottom: 16 }}>Checklist véhicule</h3>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }}>
                  <option value="">Véhicule</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.nom || v.immatriculation}</option>)}
                </select>
                <input type="number" placeholder="Kilométrage" value={form.kilometrage} onChange={e => setForm(f => ({ ...f, kilometrage: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
                {[["eclairage_ok", "Éclairage OK"], ["freins_ok", "Freins OK"], ["retros_ok", "Rétros OK"], ["proprete_ok", "Propreté OK"], ["hayons_ok", "Hayons OK"]].map(([k, label]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} /> {label}
                  </label>
                ))}
                <textarea placeholder="Commentaire" value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 8, marginBottom: 16, fontSize: 13, fontFamily: "Poppins", minHeight: 60 }} />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setShowForm(false)}>Annuler</Btn>
                  <Btn>Enregistrer</Btn>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === "incidents" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Incidents</h3>
            <Btn onClick={() => setShowIncidentForm(true)}>+ Incident</Btn>
          </div>
          {incidents.map(inc => (
            <Card key={inc.id} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{inc.type}</div>
                <div style={{ color: T.sub, fontSize: 11 }}>{inc.description}</div>
              </div>
              <Badge color={inc.status === "ouvert" ? T.danger : T.success}>{inc.status}</Badge>
            </Card>
          ))}
          {showIncidentForm && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
              <form onSubmit={handleIncident} style={{ background: T.card, borderRadius: 16, padding: 32, width: 420 }}>
                <h3 style={{ marginBottom: 16 }}>Signaler un incident</h3>
                <input placeholder="Type d'incident" value={incidentForm.type} onChange={e => setIncidentForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
                <textarea placeholder="Description" value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins", minHeight: 80 }} />
                <select value={incidentForm.severity} onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "Poppins" }}>
                  <option value="faible">Faible</option>
                  <option value="moyen">Moyen</option>
                  <option value="grave">Grave</option>
                </select>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setShowIncidentForm(false)}>Annuler</Btn>
                  <Btn>Signaler</Btn>
                </div>
              </form>
            </div>
          )}
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
