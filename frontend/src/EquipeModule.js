import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function EquipeModule() {
  const [collabs, setCollabs] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", contrat: "CDDI", caces: false, permis: false, equipe: "", telephone: "" });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([api("/equipe/collaborateurs"), api("/equipe/collaborateurs/stats")]);
    setCollabs(c); setStats(s);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api("/equipe/collaborateurs", { method: "POST", body: JSON.stringify(form) });
      setShowAdd(false); setForm({ nom: "", prenom: "", contrat: "CDDI", caces: false, permis: false, equipe: "", telephone: "" }); load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const toggleField = async (collab, field) => {
    try {
      await api(`/equipe/collaborateurs/${collab.id}`, { method: "PUT", body: JSON.stringify({ [field]: !collab[field] }) });
      load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 16 }}>Équipe</h2>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          <StatCard icon={"\u{1F465}"} label="Total" value={stats.total} />
          <StatCard icon={"\u2705"} label="Disponibles" value={stats.disponibles} color={T.success} />
          <StatCard icon={"\u{1F69C}"} label="CACES" value={stats.caces} />
          <StatCard icon={"\u{1F697}"} label="Permis" value={stats.permis} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Collaborateurs</h3>
        <Btn onClick={() => setShowAdd(true)}>+ Collaborateur</Btn>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {collabs.map(c => (
          <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{c.prenom} {c.nom}</div>
              <div style={{ color: T.sub, fontSize: 11 }}>{c.contrat} {c.equipe && `— ${c.equipe}`} {c.telephone && `— ${c.telephone}`}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toggleField(c, "caces")} style={{ padding: "3px 8px", borderRadius: 12, border: "none", background: c.caces ? T.primary + "20" : T.border + "60", color: c.caces ? T.primary : T.sub, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>CACES</button>
              <button onClick={() => toggleField(c, "permis")} style={{ padding: "3px 8px", borderRadius: 12, border: "none", background: c.permis ? T.primary + "20" : T.border + "60", color: c.permis ? T.primary : T.sub, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Permis</button>
              <Badge color={c.indispo ? T.danger : T.success}>{c.indispo ? "Indispo" : "Dispo"}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <form onSubmit={handleAdd} style={{ background: T.card, borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Nouveau collaborateur</h3>
            {["nom", "prenom", "telephone"].map(f => (
              <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            ))}
            <select value={form.contrat} onChange={e => setForm(f => ({ ...f, contrat: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }}>
              {["CDDI", "CDD", "CDI", "Intérim"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Équipe" value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.caces} onChange={e => setForm(f => ({ ...f, caces: e.target.checked }))} /> CACES
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.permis} onChange={e => setForm(f => ({ ...f, permis: e.target.checked }))} /> Permis
              </label>
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
