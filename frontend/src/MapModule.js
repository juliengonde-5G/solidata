import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from './utils/api';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF" };

const DEPOT = [49.5008, 1.0506];

function createNumberedIcon(num, color) {
  return L.divIcon({
    html: `<div style="background:${color || T.primary};color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${num}</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const depotIcon = L.divIcon({
  html: '<div style="background:#e74c3c;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\u{1F3E0}</div>',
  className: "", iconSize: [28, 28], iconAnchor: [14, 14],
});

export default function MapModule() {
  const [cavs, setCavs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [mode, setMode] = useState("all"); // "all" or route id
  const [routeDetail, setRouteDetail] = useState(null);

  useEffect(() => {
    api("/cav").then(setCavs);
    api("/routes").then(setRoutes);
  }, []);

  useEffect(() => {
    if (mode !== "all") {
      api(`/routes/${mode}`).then(setRouteDetail);
    } else {
      setRouteDetail(null);
    }
  }, [mode]);

  const validCavs = cavs.filter(c => c.latitude && c.longitude);
  const routePoints = routeDetail?.points?.filter(p => p.latitude && p.longitude) || [];
  const displayPoints = mode === "all" ? validCavs : routePoints;

  const center = displayPoints.length > 0
    ? [displayPoints.reduce((s, p) => s + p.latitude, 0) / displayPoints.length, displayPoints.reduce((s, p) => s + p.longitude, 0) / displayPoints.length]
    : DEPOT;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setMode("all")} style={{
          padding: "6px 14px", borderRadius: 20, border: `1px solid ${mode === "all" ? T.primary : T.border}`,
          background: mode === "all" ? T.primary + "15" : "transparent",
          color: mode === "all" ? T.primary : T.sub, fontSize: 12, cursor: "pointer", fontFamily: "Poppins",
        }}>Tous les CAV ({validCavs.length})</button>
        {routes.map(r => (
          <button key={r.id} onClick={() => setMode(r.id)} style={{
            padding: "6px 14px", borderRadius: 20, border: `1px solid ${mode === r.id ? T.primary : T.border}`,
            background: mode === r.id ? T.primary + "15" : "transparent",
            color: mode === r.id ? T.primary : T.sub, fontSize: 12, cursor: "pointer", fontFamily: "Poppins",
          }}>{r.nom}</button>
        ))}
      </div>

      <div style={{ height: "calc(100vh - 180px)", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} key={`${mode}-${displayPoints.length}`}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

          {/* Dépôt */}
          <Marker position={DEPOT} icon={depotIcon}>
            <Popup>Centre de tri — Le Houlme</Popup>
          </Marker>

          {/* Points */}
          {displayPoints.map((p, i) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]} icon={createNumberedIcon(p.ordre || i + 1, T.primary)}>
              <Popup>
                <strong>{p.nom}</strong><br />
                {p.ville || ""}<br />
                {p.qr_code && <span style={{ fontSize: 11, color: "#888" }}>{p.qr_code}</span>}
              </Popup>
            </Marker>
          ))}

          {/* Itinéraire */}
          {mode !== "all" && routePoints.length > 1 && (
            <Polyline positions={[DEPOT, ...routePoints.map(p => [p.latitude, p.longitude]), DEPOT]} color={T.primary} dashArray="8 8" weight={2} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
