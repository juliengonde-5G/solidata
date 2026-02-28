import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from './utils/api';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", bg: "#FFFAF6", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

const FILL_LEVELS = ["Vide", "Faible", "Mi-Hauteur", "Presque-Plein", "Plein", "Deborde"];
const FILL_COLORS = ["#95a5a6", "#2ecc71", "#f1c40f", "#e67e22", "#e74c3c", "#8e44ad"];
const FILL_HEIGHTS = [5, 20, 40, 60, 80, 100];

export default function MobileModule({ user }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetail, setRouteDetail] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedFill, setSelectedFill] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [gpsInterval, setGpsInterval] = useState(null);
  const videoRef = useRef(null);

  const loadRoutes = useCallback(async () => {
    setRoutes(await api(`/mobile/mes-tournees?date_str=${date}`));
  }, [date]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  // Check for scan parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanCode = params.get("scan");
    if (scanCode) {
      handleScanResult(scanCode);
    }
  }, []);

  const selectRoute = async (route) => {
    setSelectedRoute(route);
    const detail = await api(`/mobile/tournee/${route.id}`);
    setRouteDetail(detail);
  };

  const startRoute = async () => {
    if (!selectedRoute) return;
    await api("/collect/start", { method: "POST", body: JSON.stringify({ daily_route_id: selectedRoute.id }) });
    loadRoutes();
    // Start GPS tracking
    const id = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          api("/collect/gps", { method: "POST", body: JSON.stringify({
            daily_route_id: selectedRoute.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
          })}).catch(() => {});
        });
      }
    }, 30000);
    setGpsInterval(id);
  };

  const finishRoute = async () => {
    if (!selectedRoute) return;
    await api(`/collect/finish/${selectedRoute.id}`, { method: "POST" });
    if (gpsInterval) clearInterval(gpsInterval);
    setGpsInterval(null);
    loadRoutes();
    setSelectedRoute(null);
    setRouteDetail(null);
  };

  const handleScanResult = async (code) => {
    try {
      const cav = await api(`/qr/resolve/${code}`);
      setScanResult(cav);
      setScanning(false);
    } catch {
      setScanResult({ error: "QR code inconnu" });
      setScanning(false);
    }
  };

  const startScan = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        // Use BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const detect = async () => {
            if (!videoRef.current || !scanning) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                stream.getTracks().forEach(t => t.stop());
                handleScanResult(barcodes[0].rawValue);
                return;
              }
            } catch {}
            requestAnimationFrame(detect);
          };
          detect();
        }
      }
    } catch {
      setScanning(false);
    }
  };

  const submitCollection = async () => {
    if (!scanResult || !selectedRoute || !selectedFill) return;
    let gps = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
        gps = { gps_lat: pos.coords.latitude, gps_lon: pos.coords.longitude };
      } catch {}
    }
    await api("/collect/scan", { method: "POST", body: JSON.stringify({
      daily_route_id: selectedRoute.id,
      cav_id: scanResult.id,
      fill_level: selectedFill,
      ...gps,
    })});
    setScanResult(null);
    setSelectedFill(null);
    selectRoute(selectedRoute);
  };

  const navigateToPoints = () => {
    if (!routeDetail?.points?.length) return;
    const pts = routeDetail.points.filter(p => p.latitude && p.longitude).slice(0, 9);
    const waypoints = pts.map(p => `${p.latitude},${p.longitude}`).join("/");
    window.open(`https://www.google.com/maps/dir/${waypoints}`, "_blank");
  };

  // Route detail view
  if (routeDetail) {
    const collected = routeDetail.collectes?.length || 0;
    const total = routeDetail.points?.length || 0;
    const progress = total ? Math.round((collected / total) * 100) : 0;

    return (
      <div style={{ padding: 16, maxWidth: 500, margin: "0 auto" }}>
        <button onClick={() => { setRouteDetail(null); setSelectedRoute(null); }} style={{ background: "none", border: "none", color: T.primary, cursor: "pointer", fontFamily: "Poppins", marginBottom: 8 }}>← Retour</button>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{routeDetail.tournee_nom || "Tournée"}</h2>
        <p style={{ color: T.sub, fontSize: 12, marginBottom: 16 }}>{routeDetail.vehicule_nom} — {routeDetail.periode}</p>

        {/* Progress */}
        <div style={{ background: T.border, borderRadius: 8, height: 8, marginBottom: 16 }}>
          <div style={{ background: T.primary, borderRadius: 8, height: 8, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 16 }}>{collected}/{total} collectes — {progress}%</div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {routeDetail.status === "planifiee" && (
            <button onClick={startRoute} style={{ flex: 1, padding: 12, background: T.primary, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins" }}>Démarrer</button>
          )}
          {routeDetail.status === "en_cours" && (
            <>
              <button onClick={startScan} style={{ flex: 1, padding: 12, background: T.primary, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins" }}>Scanner QR</button>
              <button onClick={navigateToPoints} style={{ flex: 1, padding: 12, background: T.warning, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins" }}>Navigation</button>
              <button onClick={finishRoute} style={{ padding: 12, background: T.danger, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins" }}>Terminer</button>
            </>
          )}
        </div>

        {/* Scan */}
        {scanning && (
          <div style={{ marginBottom: 16 }}>
            <video ref={videoRef} style={{ width: "100%", borderRadius: 8 }} />
            <input placeholder="Ou saisir le code manuellement..." style={{ width: "100%", padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 8, fontFamily: "Poppins" }}
              onKeyDown={e => { if (e.key === "Enter") handleScanResult(e.target.value); }} />
            <button onClick={() => setScanning(false)} style={{ marginTop: 8, background: "none", border: `1px solid ${T.border}`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "Poppins" }}>Annuler</button>
          </div>
        )}

        {/* Scan result — fill level selection */}
        {scanResult && !scanResult.error && (
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{scanResult.nom}</h3>
            <p style={{ color: T.sub, fontSize: 12, marginBottom: 12 }}>{scanResult.ville} — {scanResult.qr_code}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {FILL_LEVELS.map((level, i) => (
                <button key={level} onClick={() => setSelectedFill(level)} style={{
                  padding: "6px 12px", borderRadius: 16, border: `2px solid ${selectedFill === level ? FILL_COLORS[i] : T.border}`,
                  background: selectedFill === level ? FILL_COLORS[i] + "20" : "transparent",
                  color: selectedFill === level ? FILL_COLORS[i] : T.sub, fontSize: 11, cursor: "pointer", fontFamily: "Poppins", fontWeight: selectedFill === level ? 600 : 400,
                }}>{level}</button>
              ))}
            </div>
            {/* Container gauge */}
            {selectedFill && (
              <div style={{ width: 60, height: 80, border: `2px solid ${T.border}`, borderRadius: "0 0 8px 8px", margin: "0 auto 12px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${FILL_HEIGHTS[FILL_LEVELS.indexOf(selectedFill)]}%`, background: FILL_COLORS[FILL_LEVELS.indexOf(selectedFill)], transition: "height 0.3s" }} />
              </div>
            )}
            <button onClick={submitCollection} disabled={!selectedFill} style={{
              width: "100%", padding: 10, background: selectedFill ? T.success : T.border, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: selectedFill ? "pointer" : "not-allowed", fontFamily: "Poppins",
            }}>Valider la collecte</button>
          </div>
        )}

        {/* Points list */}
        {(routeDetail.points || []).map((p, i) => {
          const isCollected = routeDetail.collectes?.some(c => c.cav_id === p.id);
          return (
            <div key={p.id || i} style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 4, display: "flex", alignItems: "center", gap: 10,
              background: isCollected ? T.success + "10" : T.card, border: `1px solid ${isCollected ? T.success : T.border}`,
            }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: isCollected ? T.success : T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                {isCollected ? "\u2713" : p.ordre || i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.nom}</div>
                <div style={{ color: T.sub, fontSize: 11 }}>{p.ville || ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Routes list
  return (
    <div style={{ padding: 16, maxWidth: 500, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Mes tournées</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: "Poppins", fontSize: 13 }} />
      </div>
      {routes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.sub }}>Aucune tournée prévue pour cette date</div>
      ) : routes.map(r => (
        <div key={r.id} onClick={() => selectRoute(r)} style={{
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16, marginBottom: 10, cursor: "pointer",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.tournee_nom || `Tournée #${r.id}`}</div>
              <div style={{ color: T.sub, fontSize: 12 }}>{r.vehicule_nom} — {r.periode === "matin" ? "Matin" : "Après-midi"}</div>
            </div>
            <span style={{
              padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
              background: r.status === "terminee" ? T.success + "20" : r.status === "en_cours" ? T.warning + "20" : T.primary + "20",
              color: r.status === "terminee" ? T.success : r.status === "en_cours" ? T.warning : T.primary,
            }}>{r.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
