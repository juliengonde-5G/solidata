import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge, StatCard } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function POJModule() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [planning, setPlanning] = useState([]);
  const [postes, setPostes] = useState([]);
  const [collabs, setCollabs] = useState([]);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const [p, po, c, s] = await Promise.all([
      api(`/poj/planning/${date}`),
      api("/poj/postes"),
      api("/poj/collaborateurs"),
      api(`/poj/stats/${date}`),
    ]);
    setPlanning(p); setPostes(po); setCollabs(c); setStats(s);
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const handleAffect = async (posteId, collabId) => {
    try {
      await api(`/poj/planning/${date}`, { method: "POST", body: JSON.stringify({ poste_id: posteId, collab_id: collabId }) });
      load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleClear = async () => {
    try {
      await api(`/poj/planning/${date}`, { method: "DELETE" });
      load();
      setToast({ message: "Planning vidé" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const affectedCollabIds = new Set(planning.map(p => p.collab_id));
  const availableCollabs = collabs.filter(c => !c.indispo && !affectedCollabIds.has(c.id));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Plan d'Occupation Journalier</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: "Poppins", fontSize: 13 }} />
          <Btn variant="danger" onClick={handleClear} style={{ fontSize: 11, padding: "6px 12px" }}>Vider</Btn>
        </div>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          <StatCard icon={"\u{1F4CB}"} label="Total postes" value={stats.total_postes} />
          <StatCard icon={"\u26A0\uFE0F"} label="Obligatoires" value={stats.obligatoires} color={T.warning} />
          <StatCard icon={"\u2705"} label="Couverts" value={stats.couverts} color={T.success} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        {/* Postes + affectations */}
        <div>
          {postes.map(poste => {
            const affected = planning.filter(p => p.poste_id === poste.id);
            return (
              <Card key={poste.id} style={{ marginBottom: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{poste.nom}</span>
                    {poste.groupe && <span style={{ color: T.sub, fontSize: 11, marginLeft: 8 }}>{poste.groupe}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {poste.obligatoire && <Badge color={T.warning}>Obligatoire</Badge>}
                    {poste.req_caces && <Badge>CACES</Badge>}
                    {poste.req_permis && <Badge>Permis</Badge>}
                  </div>
                </div>
                {affected.length > 0 ? affected.map(a => (
                  <div key={a.id} style={{ fontSize: 12, color: T.primary, padding: "2px 8px", background: T.primary + "10", borderRadius: 4, display: "inline-block", marginRight: 4 }}>
                    {a.collab_nom}
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: T.sub, fontStyle: "italic" }}>Non affecté</div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Collaborateurs disponibles */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: T.sub }}>Disponibles ({availableCollabs.length})</h4>
          {availableCollabs.map(c => (
            <div key={c.id} style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 4, background: T.card, border: `1px solid ${T.border}`,
              fontSize: 12, cursor: "grab",
            }}>
              <div style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</div>
              <div style={{ color: T.sub, fontSize: 10 }}>
                {c.caces && "CACES "}{c.permis && "Permis "}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                {postes.filter(p => !planning.some(pl => pl.poste_id === p.id && pl.collab_id === c.id)).slice(0, 4).map(p => (
                  <button key={p.id} onClick={() => handleAffect(p.id, c.id)} style={{
                    padding: "2px 6px", borderRadius: 4, border: `1px solid ${T.primary}30`, background: "transparent",
                    color: T.primary, fontSize: 9, cursor: "pointer", fontFamily: "Poppins",
                  }}>{p.nom}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? T.danger : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
