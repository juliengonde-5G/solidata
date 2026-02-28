import React, { useState, useEffect } from 'react';
import api from './utils/api';
import { Card, Badge } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

export default function LiveDashboard() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setRoutes(await api("/collect/live"));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const enCours = routes.filter(r => r.status === "en_cours");
  const planifiees = routes.filter(r => r.status === "planifiee");
  const terminees = routes.filter(r => r.status === "terminee");

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Dashboard Live</h2>
        <div style={{ fontSize: 12, color: T.sub }}>Rafraîchissement automatique toutes les 15s</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: T.sub, padding: 40 }}>Chargement...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.warning }}>{enCours.length}</div>
              <div style={{ fontSize: 12, color: T.sub }}>En cours</div>
            </Card>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.primary }}>{planifiees.length}</div>
              <div style={{ fontSize: 12, color: T.sub }}>Planifiées</div>
            </Card>
            <Card style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.success }}>{terminees.length}</div>
              <div style={{ fontSize: 12, color: T.sub }}>Terminées</div>
            </Card>
          </div>

          {enCours.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.warning }}>En cours</h3>
              {enCours.map(r => (
                <Card key={r.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.tournee_nom || `Tournée #${r.id}`}</div>
                      <div style={{ color: T.sub, fontSize: 12 }}>{r.vehicule_nom} ({r.vehicule_immat}) — {r.periode}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: T.primary }}>{r.nb_collectes}/{r.nb_points_prevus}</div>
                      <div style={{ fontSize: 11, color: T.sub }}>collectes</div>
                    </div>
                  </div>
                  {r.nb_points_prevus > 0 && (
                    <div style={{ marginTop: 8, height: 6, background: T.border, borderRadius: 3 }}>
                      <div style={{ height: 6, background: T.primary, borderRadius: 3, width: `${Math.round((r.nb_collectes / r.nb_points_prevus) * 100)}%` }} />
                    </div>
                  )}
                  {r.last_gps && (
                    <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>
                      GPS: {r.last_gps.latitude?.toFixed(4)}, {r.last_gps.longitude?.toFixed(4)}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Toutes les tournées du jour</h3>
            {routes.map(r => (
              <Card key={r.id} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{r.tournee_nom || `#${r.id}`}</span>
                  <span style={{ color: T.sub, fontSize: 12, marginLeft: 8 }}>{r.vehicule_nom} — {r.periode}</span>
                </div>
                <Badge color={r.status === "terminee" ? T.success : r.status === "en_cours" ? T.warning : T.primary}>{r.status}</Badge>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
