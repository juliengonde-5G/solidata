import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", danger: "#e74c3c" };

export default function RoutesPageV2() {
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cavSearch, setCavSearch] = useState("");
  const [allCavs, setAllCavs] = useState([]);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => { setRoutes(await api("/routes")); }, []);
  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (id) => {
    const d = await api(`/routes/${id}`);
    setDetail(d);
    if (!allCavs.length) setAllCavs(await api("/cav"));
  }, [allCavs.length]);

  useEffect(() => { if (selected) loadDetail(selected.id); }, [selected, loadDetail]);

  const handleAddCav = async (cavId) => {
    if (!selected) return;
    try {
      await api(`/routes/${selected.id}/points`, { method: "POST", body: JSON.stringify({ cav_id: cavId }) });
      loadDetail(selected.id); load();
      setToast({ message: "CAV ajouté" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleRemoveCav = async (cavId) => {
    if (!selected) return;
    try {
      await api(`/routes/${selected.id}/points/${cavId}`, { method: "DELETE" });
      loadDetail(selected.id); load();
      setToast({ message: "CAV retiré" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const filteredCavs = allCavs.filter(c => {
    if (!cavSearch) return false;
    const s = cavSearch.toLowerCase();
    return (c.nom || "").toLowerCase().includes(s) || (c.ville || "").toLowerCase().includes(s);
  }).slice(0, 10);

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Liste */}
      <div style={{ width: 320 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tournées ({routes.length})</h3>
        <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          {routes.map(r => (
            <div key={r.id} onClick={() => setSelected(r)} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
              background: selected?.id === r.id ? T.primary + "10" : T.card,
              border: `1px solid ${selected?.id === r.id ? T.primary : T.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{r.nom}</div>
              <Badge>{r.nb_cav} CAV</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Détail */}
      {detail && (
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{detail.nom}</h3>
          {detail.description && <p style={{ color: T.sub, fontSize: 13, marginBottom: 12 }}>{detail.description}</p>}

          {/* Ajouter CAV */}
          <div style={{ marginBottom: 16 }}>
            <input placeholder="Rechercher un CAV à ajouter..." value={cavSearch} onChange={e => setCavSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: "Poppins", marginBottom: 4 }} />
            {filteredCavs.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 150, overflowY: "auto" }}>
                {filteredCavs.map(c => (
                  <div key={c.id} onClick={() => { handleAddCav(c.id); setCavSearch(""); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${T.border}` }}>
                    {c.nom} — {c.ville || ""}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Points */}
          <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
            {(detail.points || []).map((p, i) => (
              <div key={p.id || i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 8, marginBottom: 4, background: T.card, border: `1px solid ${T.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                    {p.ordre}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nom}</div>
                    <div style={{ color: T.sub, fontSize: 11 }}>{p.ville || ""}</div>
                  </div>
                </div>
                <button onClick={() => handleRemoveCav(p.id)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 16 }}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#e74c3c" : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
