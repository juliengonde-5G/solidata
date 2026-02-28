import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const MOIS_NOMS = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

export default function PlanificationModule() {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [slots, setSlots] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [saisonnalite, setSaisonnalite] = useState({});
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const [s, p, saison] = await Promise.all([
      api(`/planification/semaine?start_date=${weekStart}`),
      api(`/planification/prediction?start_date=${weekStart}`),
      api("/planification/saisonnalite"),
    ]);
    setSlots(s); setPredictions(p); setSaisonnalite(saison);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const generate = async (mode) => {
    try {
      const result = await api("/planification/generate", { method: "POST", body: JSON.stringify({ mode, start_date: weekStart }) });
      setToast({ message: result.message });
      load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const currentMonth = new Date(weekStart).getMonth() + 1;
  const coeff = saisonnalite[currentMonth] || 1.0;
  const saison = coeff >= 1.1 ? "haute" : coeff <= 0.8 ? "basse" : "normale";

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 16 }}>Planification</h2>

      {/* Bandeau saisonnier */}
      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, padding: "12px 20px" }}>
        <div>
          <div style={{ fontSize: 12, color: T.sub }}>Saison</div>
          <Badge color={saison === "haute" ? T.danger : saison === "basse" ? "#3498db" : T.success}>{saison}</Badge>
        </div>
        <div>
          <div style={{ fontSize: 12, color: T.sub }}>Coefficient</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: T.primary }}>{coeff.toFixed(2)}</div>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 30 }}>
          {Object.entries(saisonnalite).map(([m, c]) => (
            <div key={m} style={{
              width: 14, height: `${c * 25}px`, borderRadius: "2px 2px 0 0",
              background: parseInt(m) === currentMonth ? T.primary : T.border,
            }} title={`${MOIS_NOMS[parseInt(m)]}: ${c}`} />
          ))}
        </div>
      </Card>

      {/* Navigation semaine */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevWeek} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "Poppins" }}>&lt;</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Semaine du {new Date(weekStart).toLocaleDateString("fr-FR")}</span>
        <button onClick={nextWeek} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "Poppins" }}>&gt;</button>
      </div>

      {/* Génération */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Btn onClick={() => generate("standard")}>Standard</Btn>
        <Btn onClick={() => generate("prediction")} variant="secondary">Prédictif</Btn>
      </div>

      {/* Grille */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {JOURS.map((jour, dayIdx) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayIdx);
          const dateStr = dayDate.toISOString().split("T")[0];
          const daySlots = slots.filter(s => s.date && s.date.startsWith(dateStr));
          const pred = predictions.find(p => p.date === dateStr);

          return (
            <div key={jour}>
              <div style={{ textAlign: "center", padding: "6px 0", fontWeight: 600, fontSize: 12, color: T.dark, borderBottom: `2px solid ${T.primary}`, marginBottom: 8 }}>
                {jour} {dayDate.getDate()}/{dayDate.getMonth() + 1}
              </div>
              {pred && (
                <div style={{ fontSize: 10, color: T.sub, textAlign: "center", marginBottom: 6 }}>
                  Reco: {pred.nb_tournees_recommandees}T — {pred.tonnage_prevu_kg}kg
                </div>
              )}
              {["matin", "apres_midi"].map(periode => {
                const periodeSlots = daySlots.filter(s => s.periode === periode);
                return (
                  <div key={periode} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: T.sub, fontWeight: 600, marginBottom: 4 }}>{periode === "matin" ? "MATIN" : "APRÈS-MIDI"}</div>
                    {periodeSlots.length === 0 ? (
                      <div style={{ fontSize: 11, color: T.light, fontStyle: "italic" }}>—</div>
                    ) : periodeSlots.map(s => (
                      <div key={s.id} style={{ fontSize: 11, padding: "4px 6px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 4, marginBottom: 2 }}>
                        <div style={{ fontWeight: 500 }}>{s.tournee_nom || "?"}</div>
                        <div style={{ color: T.sub, fontSize: 10 }}>{s.vehicule_nom || ""}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? T.danger : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
