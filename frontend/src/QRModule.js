import React, { useState, useEffect } from 'react';
import api from './utils/api';
import { Card, Btn } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71" };

export default function QRModule() {
  const [cavs, setCavs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api("/qr/list").then(setCavs);
    api("/routes").then(setRoutes);
  }, []);

  const handleGenerate = async () => {
    try {
      const result = await api("/qr/generate", { method: "POST" });
      setToast({ message: result.message });
      setCavs(await api("/qr/list"));
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleExportPDF = () => {
    const url = selectedRoute ? `/api/qr/export-pdf?route_id=${selectedRoute}` : "/api/qr/export-pdf";
    window.open(url, "_blank");
  };

  const filteredCavs = selectedRoute
    ? cavs.filter(c => c.route_id === parseInt(selectedRoute))
    : cavs;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 16 }}>QR Codes</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn onClick={handleGenerate}>Générer QR manquants</Btn>
        <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
          style={{ padding: "8px 14px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: "Poppins" }}>
          <option value="">Toutes les tournées</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </select>
        <Btn variant="secondary" onClick={handleExportPDF}>Export PDF étiquettes</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {filteredCavs.map(c => (
          <Card key={c.id} style={{ textAlign: "center", padding: 16 }}>
            <img src={`/api/qr/image/${c.id}`} alt="QR" style={{ width: 100, height: 100 }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{c.nom}</div>
            <div style={{ color: T.sub, fontSize: 11 }}>{c.ville || ""}</div>
            <div style={{ color: T.primary, fontSize: 10, marginTop: 4 }}>{c.qr_code}</div>
          </Card>
        ))}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#e74c3c" : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
