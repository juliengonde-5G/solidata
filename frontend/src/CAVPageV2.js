import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

const SUSPENSION_MOTIFS = ["Travaux", "Dégradation", "Vandalisme", "Accès bloqué", "Autre"];

export default function CAVPageV2() {
  const [cavs, setCavs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nom: "", adresse: "", code_postal: "", ville: "", latitude: "", longitude: "", nb_cav: 1, frequence_passage: 1 });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => { setCavs(await api("/cav")); }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = cavs.filter(c => {
    if (filter === "actif" && !c.is_active) return false;
    if (filter === "suspendu" && c.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.nom || "").toLowerCase().includes(s) || (c.ville || "").toLowerCase().includes(s) || (c.qr_code || "").toLowerCase().includes(s);
    }
    return true;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api("/cav", { method: "POST", body: JSON.stringify({
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        nb_cav: parseInt(form.nb_cav) || 1,
        frequence_passage: parseInt(form.frequence_passage) || 1,
      })});
      setShowAdd(false); setForm({ nom: "", adresse: "", code_postal: "", ville: "", latitude: "", longitude: "", nb_cav: 1, frequence_passage: 1 }); load();
      setToast({ message: "CAV créé" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleSuspend = async (motif) => {
    if (!selected) return;
    try {
      await api(`/cav/${selected.id}`, { method: "PUT", body: JSON.stringify({ is_active: false, suspension_motif: motif }) });
      load(); setSelected(s => ({ ...s, is_active: false, suspension_motif: motif }));
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleReactivate = async () => {
    if (!selected) return;
    try {
      await api(`/cav/${selected.id}`, { method: "PUT", body: JSON.stringify({ is_active: true, suspension_motif: null }) });
      load(); setSelected(s => ({ ...s, is_active: true, suspension_motif: null }));
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleUpdateField = async (field, value) => {
    if (!selected) return;
    try {
      await api(`/cav/${selected.id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
      load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Liste */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          {["all", "actif", "suspendu"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === f ? T.primary : T.border}`,
              background: filter === f ? T.primary + "15" : "transparent",
              color: filter === f ? T.primary : T.sub, fontSize: 12, cursor: "pointer", fontFamily: "Poppins",
            }}>
              {f === "all" ? "Tous" : f === "actif" ? "Actifs" : "Suspendus"} ({cavs.filter(c => f === "all" ? true : f === "actif" ? c.is_active : !c.is_active).length})
            </button>
          ))}
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: "Poppins", minWidth: 150 }} />
          <Btn onClick={() => setShowAdd(true)}>+ CAV</Btn>
        </div>

        <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
              background: selected?.id === c.id ? T.primary + "10" : T.card,
              border: `1px solid ${selected?.id === c.id ? T.primary : T.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{c.nom}</div>
                <div style={{ color: T.sub, fontSize: 11 }}>{c.ville || ""} {c.qr_code && `— ${c.qr_code}`}</div>
              </div>
              <Badge color={c.is_active ? T.success : T.danger}>{c.is_active ? "Actif" : "Suspendu"}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Détail */}
      {selected && (
        <div style={{ width: 380, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selected.nom}</h3>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.sub }}>x</button>
          </div>

          {selected.qr_code && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <img src={`/api/qr/image/${selected.id}`} alt="QR" style={{ width: 120, height: 120 }} />
              <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>{selected.qr_code}</div>
            </div>
          )}

          <Badge color={selected.is_active ? T.success : T.danger}>{selected.is_active ? "Actif" : `Suspendu — ${selected.suspension_motif || ""}`}</Badge>

          <div style={{ marginTop: 16 }}>
            {["nom", "adresse", "code_postal", "ville"].map(field => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 2 }}>{field}</label>
                <input value={selected[field] || ""} onChange={e => setSelected(s => ({ ...s, [field]: e.target.value }))}
                  onBlur={e => handleUpdateField(field, e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, fontFamily: "Poppins" }} />
              </div>
            ))}
          </div>

          {selected.is_active ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: T.danger }}>Suspendre</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SUSPENSION_MOTIFS.map(m => (
                  <button key={m} onClick={() => handleSuspend(m)} style={{
                    padding: "4px 10px", borderRadius: 16, border: `1px solid ${T.danger}30`, background: T.danger + "10",
                    color: T.danger, fontSize: 11, cursor: "pointer", fontFamily: "Poppins",
                  }}>{m}</button>
                ))}
              </div>
            </div>
          ) : (
            <Btn style={{ marginTop: 16, width: "100%" }} onClick={handleReactivate}>Réactiver</Btn>
          )}

          {selected.tournees && selected.tournees.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Tournées associées</div>
              {selected.tournees.map(t => (
                <Badge key={t.id}>{t.nom} (ordre {t.ordre})</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal ajout */}
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <form onSubmit={handleAdd} style={{ background: T.card, borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Nouveau CAV</h3>
            {["nom", "adresse", "code_postal", "ville"].map(f => (
              <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <input placeholder="Latitude" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
              <input placeholder="Longitude" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
              <Btn>Créer</Btn>
            </div>
          </form>
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
