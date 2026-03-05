import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * MobileModule.js — Application mobile Solidata (style DHD-Livreur)
 *
 * Fonctionnalités :
 * - Authentification opérateur
 * - Drawer latéral (feuille de route, liste CAV, suivi, restant)
 * - Carte Leaflet avec itinéraire vers la prochaine CAV
 * - Menu bas permanent : QR Code | QR indisponible | Retour au centre
 * - Scanner QR Code (BarcodeDetector API + fallback saisie)
 * - Saisie indicateur collecte (visuel, minimum texte)
 * - Justification QR indisponible (motif + photo)
 * - GPS tracking continu
 * - Android : écran toujours allumé (Wake Lock API)
 * - Android : GPS en permanence avec affichage position
 */

// ─── Thème ──────────────────────────────────────────────
const T = {
  primary: "#008678",
  primaryDark: "#006B60",
  primaryLight: "#E0F5F2",
  dark: "#253036",
  bg: "#FFFAF6",
  card: "#FFFFFF",
  text: "#253036",
  sub: "#5a6872",
  light: "#8a959e",
  border: "#e8e0d8",
  success: "#2ecc71",
  warning: "#f39c12",
  danger: "#e74c3c",
  white: "#FFFFFF",
};

// ─── Centre de tri (Le Houlme) ──────────────────────────
const CENTRE_TRI = { lat: 49.5008, lng: 1.0506, nom: "Centre de tri - Le Houlme" };

// ─── Niveaux de remplissage (saisie visuelle) ───────────
const FILL_LEVELS = [
  { key: "Vide", label: "Vide", icon: "📭", color: "#95a5a6", pct: 0 },
  { key: "Faible", label: "Faible", icon: "🔽", color: "#2ecc71", pct: 20 },
  { key: "Mi-Hauteur", label: "Moitié", icon: "➡️", color: "#f1c40f", pct: 50 },
  { key: "Presque-Plein", label: "¾", icon: "🔼", color: "#e67e22", pct: 75 },
  { key: "Plein", label: "Plein", icon: "📦", color: "#e74c3c", pct: 100 },
  { key: "Deborde", label: "Déborde", icon: "💥", color: "#8e44ad", pct: 120 },
];

// ─── Motifs QR indisponible ─────────────────────────────
const MOTIFS_INDISPONIBLE = [
  "QR Code illisible",
  "QR Code arraché / manquant",
  "Conteneur introuvable",
  "Accès bloqué",
  "Conteneur dégradé",
  "Autre",
];

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function MobileModule({ token: propToken, user: propUser, onLogout: propOnLogout }) {
  // ─── Auth state ───────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [loginError, setLoginError] = useState("");

  // ─── Data state ───────────────────────────────────────
  const [tournees, setTournees] = useState([]);
  const [activeTournee, setActiveTournee] = useState(null);
  const [tourneeDetail, setTourneeDetail] = useState(null);
  const [collections, setCollections] = useState([]);

  // ─── UI state ─────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("route"); // route | cavs | suivi | restant
  const [screen, setScreen] = useState("map"); // map | scanner | unavailable | indicator | retour
  const [scanResult, setScanResult] = useState(null);
  const [selectedMotif, setSelectedMotif] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedFillLevel, setSelectedFillLevel] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [nextCav, setNextCav] = useState(null);
  const [navigatingToCenter, setNavigatingToCenter] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsSpeed, setGpsSpeed] = useState(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // ─── Refs ─────────────────────────────────────────────
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const videoRef = useRef(null);
  const scannerActiveRef = useRef(false);
  const gpsIntervalRef = useRef(null);
  const photoInputRef = useRef(null);
  const wakeLockRef = useRef(null);

  // ─── API helper ───────────────────────────────────────
  const getToken = useCallback(() => {
    return propToken || window.__solidata_token || localStorage.getItem("solidata_token");
  }, [propToken]);

  const api = useCallback(async (path, opts = {}) => {
    const tk = getToken();
    const headers = { "Content-Type": "application/json", ...opts.headers };
    if (tk) headers["Authorization"] = `Bearer ${tk}`;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Erreur ${res.status}`);
    }
    return res.json();
  }, [getToken]);

  // ─── Toast helper ─────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ═══════════════════════════════════════════════════════
  // AUTHENTIFICATION
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const tk = getToken();
    if (tk) {
      api("/me").then(u => {
        setCurrentUser(u);
        setIsAuthenticated(true);
      }).catch(() => {
        localStorage.removeItem("solidata_token");
        delete window.__solidata_token;
      });
    }
  }, [api, getToken]);

  const handleLogin = async (username, password) => {
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Identifiants incorrects");
      }
      const data = await res.json();
      localStorage.setItem("solidata_token", data.access_token);
      window.__solidata_token = data.access_token;
      setCurrentUser({ full_name: data.full_name, role: data.role, username });
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("solidata_token");
    delete window.__solidata_token;
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTournee(null);
    setTourneeDetail(null);
    if (propOnLogout) propOnLogout();
  };

  // ═══════════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ═══════════════════════════════════════════════════════
  const loadTournees = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/mobile/mes-tournees?date_str=${today}`);
      setTournees(Array.isArray(data) ? data : data.tournees || []);
    } catch (err) {
      console.error("Chargement tournées:", err);
      setTournees([]);
    }
  }, [api]);

  const loadTourneeDetail = useCallback(async (tourneeId) => {
    try {
      setLoading(true);
      const data = await api(`/mobile/tournee/${tourneeId}`);
      setTourneeDetail(data);
      setCollections(data.collections || []);

      // Déterminer la prochaine CAV non collectée
      const points = data.points || [];
      const collectedCavIds = new Set((data.collections || []).map(c => c.cav_id));
      const next = points.find(p => !collectedCavIds.has(p.cav_id) && p.latitude && p.longitude);
      setNextCav(next || null);
    } catch (err) {
      showToast("Erreur chargement tournée", "danger");
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => {
    if (isAuthenticated) loadTournees();
  }, [isAuthenticated, loadTournees]);

  useEffect(() => {
    if (activeTournee) loadTourneeDetail(activeTournee.id);
  }, [activeTournee, loadTourneeDetail]);

  // ═══════════════════════════════════════════════════════
  // WAKE LOCK — Écran toujours allumé (Android)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!isAuthenticated) return;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener("release", () => setWakeLockActive(false));
        }
      } catch (err) {
        console.warn("Wake Lock non disponible:", err.message);
      }
    };

    requestWakeLock();

    // Re-acquérir le wake lock quand l'app redevient visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // ═══════════════════════════════════════════════════════
  // GPS TRACKING — Permanent, haute précision (Android)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!isAuthenticated) return;

    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsSpeed(pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null); // m/s → km/h
      },
      (err) => console.warn("GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [isAuthenticated]);

  // Envoi GPS toutes les 30s
  useEffect(() => {
    if (!isAuthenticated || !activeTournee || !currentPosition) return;

    gpsIntervalRef.current = setInterval(() => {
      if (currentPosition) {
        api("/collect/gps", {
          method: "POST",
          body: JSON.stringify({
            daily_route_id: activeTournee.id,
            latitude: currentPosition.lat,
            longitude: currentPosition.lng,
            accuracy: currentPosition.accuracy,
            speed: currentPosition.speed,
          }),
        }).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(gpsIntervalRef.current);
  }, [isAuthenticated, activeTournee, currentPosition, api]);

  // ═══════════════════════════════════════════════════════
  // CARTE LEAFLET
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!isAuthenticated || screen !== "map" || !mapRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([CENTRE_TRI.lat, CENTRE_TRI.lng], 12);

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      window.L.control.zoom({ position: "topright" }).addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Ne pas détruire la carte si on change d'écran temporairement
    };
  }, [isAuthenticated, screen]);

  // Mise à jour des marqueurs sur la carte
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || screen !== "map") return;

    // Nettoyer l'ancien layer
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    const layerGroup = window.L.layerGroup().addTo(map);
    routeLayerRef.current = layerGroup;

    // Marqueur centre de tri
    const depotIcon = window.L.divIcon({
      html: `<div style="background:${T.dark};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏭</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: "",
    });
    window.L.marker([CENTRE_TRI.lat, CENTRE_TRI.lng], { icon: depotIcon })
      .bindPopup(`<b>${CENTRE_TRI.nom}</b>`)
      .addTo(layerGroup);

    if (tourneeDetail) {
      const points = (tourneeDetail.points || []).filter(p => p.latitude && p.longitude);
      const collectedCavIds = new Set(collections.map(c => c.cav_id));
      const bounds = [[CENTRE_TRI.lat, CENTRE_TRI.lng]];
      const routeCoords = [[CENTRE_TRI.lat, CENTRE_TRI.lng]];

      points.forEach((pt, idx) => {
        const isCollected = collectedCavIds.has(pt.cav_id);
        const isNext = nextCav && pt.cav_id === nextCav.cav_id;
        const bgColor = isCollected ? T.success : isNext ? T.warning : T.primary;
        const size = isNext ? 40 : 30;

        const icon = window.L.divIcon({
          html: `<div style="background:${bgColor};color:#fff;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isNext ? 16 : 13}px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);${isNext ? "animation:pulse 1.5s infinite;" : ""}">${idx + 1}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: "",
        });

        window.L.marker([pt.latitude, pt.longitude], { icon })
          .bindPopup(`<b>${pt.nom || `CAV #${pt.cav_id}`}</b><br>${isCollected ? "Collecté" : isNext ? "Prochain" : "En attente"}`)
          .addTo(layerGroup);

        bounds.push([pt.latitude, pt.longitude]);
        routeCoords.push([pt.latitude, pt.longitude]);
      });

      // Ligne d'itinéraire
      if (routeCoords.length > 1) {
        routeCoords.push([CENTRE_TRI.lat, CENTRE_TRI.lng]);
        window.L.polyline(routeCoords, {
          color: T.primary,
          weight: 3,
          opacity: 0.6,
          dashArray: "8, 12",
        }).addTo(layerGroup);
      }

      // Ligne vers prochaine CAV depuis position actuelle
      if (currentPosition && nextCav && !navigatingToCenter) {
        window.L.polyline(
          [[currentPosition.lat, currentPosition.lng], [nextCav.latitude, nextCav.longitude]],
          { color: T.warning, weight: 4, opacity: 0.9 }
        ).addTo(layerGroup);
      }

      // Ligne retour centre
      if (currentPosition && navigatingToCenter) {
        window.L.polyline(
          [[currentPosition.lat, currentPosition.lng], [CENTRE_TRI.lat, CENTRE_TRI.lng]],
          { color: T.danger, weight: 4, opacity: 0.9 }
        ).addTo(layerGroup);
      }

      // Position actuelle
      if (currentPosition) {
        const posIcon = window.L.divIcon({
          html: `<div style="background:#3498db;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px rgba(52,152,219,0.5);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          className: "",
        });
        window.L.marker([currentPosition.lat, currentPosition.lng], { icon: posIcon })
          .bindPopup("Ma position")
          .addTo(layerGroup);
        bounds.push([currentPosition.lat, currentPosition.lng]);
      }

      if (bounds.length > 1) {
        try {
          map.fitBounds(bounds, { padding: [40, 40] });
        } catch (e) {}
      }
    }
  }, [tourneeDetail, collections, nextCav, currentPosition, screen, navigatingToCenter]);

  // ═══════════════════════════════════════════════════════
  // SCANNER QR CODE
  // ═══════════════════════════════════════════════════════
  const startScanner = useCallback(async () => {
    setScreen("scanner");
    scannerActiveRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // BarcodeDetector API (Chrome/Edge)
      if ("BarcodeDetector" in window) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const scanLoop = async () => {
          if (!scannerActiveRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              stopScanner();
              await resolveQRCode(code);
              return;
            }
          } catch (e) {}
          if (scannerActiveRef.current) requestAnimationFrame(scanLoop);
        };
        requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      showToast("Impossible d'accéder à la caméra", "danger");
    }
  }, [showToast]);

  const stopScanner = useCallback(() => {
    scannerActiveRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const resolveQRCode = useCallback(async (code) => {
    try {
      const data = await api(`/qr/resolve/${encodeURIComponent(code)}`);
      setScanResult({ code, ...data });
      setScreen("indicator");
    } catch (err) {
      showToast("QR Code non reconnu", "danger");
      setScreen("map");
    }
  }, [api, showToast]);

  // Saisie manuelle fallback
  const handleManualScan = useCallback((code) => {
    stopScanner();
    resolveQRCode(code);
  }, [stopScanner, resolveQRCode]);

  // ═══════════════════════════════════════════════════════
  // ENVOI COLLECTE
  // ═══════════════════════════════════════════════════════
  const submitCollection = useCallback(async () => {
    if (!selectedFillLevel || !activeTournee) return;
    setLoading(true);
    try {
      await api("/collect/scan", {
        method: "POST",
        body: JSON.stringify({
          daily_route_id: activeTournee.id,
          cav_id: scanResult?.cav_id || scanResult?.id,
          fill_level: selectedFillLevel.key,
          gps_lat: currentPosition?.lat,
          gps_lon: currentPosition?.lng,
          note: scanResult?.unavailable_motif || "",
        }),
      });
      showToast("Collecte enregistrée !");
      setSelectedFillLevel(null);
      setScanResult(null);
      setScreen("map");
      // Recharger la tournée
      if (activeTournee) loadTourneeDetail(activeTournee.id);
    } catch (err) {
      showToast("Erreur: " + err.message, "danger");
    } finally {
      setLoading(false);
    }
  }, [selectedFillLevel, activeTournee, scanResult, currentPosition, api, showToast, loadTourneeDetail]);

  // ═══════════════════════════════════════════════════════
  // QR INDISPONIBLE — Justification
  // ═══════════════════════════════════════════════════════
  const handleUnavailableSubmit = useCallback(() => {
    if (!selectedMotif) {
      showToast("Sélectionnez un motif", "warning");
      return;
    }
    // Passer à la saisie d'indicateur avec le motif attaché
    setScanResult(prev => ({
      ...(prev || {}),
      cav_id: nextCav?.cav_id,
      nom: nextCav?.nom || "CAV courante",
      unavailable_motif: selectedMotif,
      photo: photoFile,
    }));
    setScreen("indicator");
  }, [selectedMotif, nextCav, photoFile, showToast]);

  const handlePhotoCapture = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // RETOUR AU CENTRE
  // ═══════════════════════════════════════════════════════
  const handleRetourCentre = useCallback(() => {
    setNavigatingToCenter(true);
    // Ouvrir Google Maps / app native pour la navigation
    if (currentPosition) {
      const url = `https://www.google.com/maps/dir/${currentPosition.lat},${currentPosition.lng}/${CENTRE_TRI.lat},${CENTRE_TRI.lng}`;
      window.open(url, "_blank");
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${CENTRE_TRI.lat},${CENTRE_TRI.lng}`;
      window.open(url, "_blank");
    }
  }, [currentPosition]);

  // ─── Navigation Google Maps vers prochaine CAV ────────
  const navigateToNextCav = useCallback(() => {
    if (!nextCav) return;
    const origin = currentPosition
      ? `${currentPosition.lat},${currentPosition.lng}`
      : `${CENTRE_TRI.lat},${CENTRE_TRI.lng}`;
    const url = `https://www.google.com/maps/dir/${origin}/${nextCav.latitude},${nextCav.longitude}`;
    window.open(url, "_blank");
  }, [nextCav, currentPosition]);

  // ─── Démarrer une tournée ─────────────────────────────
  const startTournee = useCallback(async (tournee) => {
    try {
      await api("/collect/start", {
        method: "POST",
        body: JSON.stringify({ daily_route_id: tournee.id }),
      });
    } catch (e) {
      // La tournée est peut-être déjà démarrée
    }
    setActiveTournee(tournee);
    setDrawerOpen(false);
    setNavigatingToCenter(false);
  }, [api]);

  // ─── Terminer une tournée ─────────────────────────────
  const finishTournee = useCallback(async () => {
    if (!activeTournee) return;
    try {
      await api(`/collect/finish/${activeTournee.id}`, { method: "POST" });
      showToast("Tournée terminée !");
      setActiveTournee(null);
      setTourneeDetail(null);
      setCollections([]);
      setNextCav(null);
      setNavigatingToCenter(false);
      loadTournees();
    } catch (err) {
      showToast("Erreur: " + err.message, "danger");
    }
  }, [activeTournee, api, showToast, loadTournees]);

  // ─── Stats helper ─────────────────────────────────────
  const totalPoints = tourneeDetail?.points?.length || 0;
  const collectedCount = collections.length;
  const remainingCount = totalPoints - collectedCount;
  const progressPct = totalPoints > 0 ? Math.round((collectedCount / totalPoints) * 100) : 0;

  // ═══════════════════════════════════════════════════════
  // ÉCRAN DE CONNEXION
  // ═══════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loading} />;
  }

  // ═══════════════════════════════════════════════════════
  // SÉLECTION DE TOURNÉE (si pas de tournée active)
  // ═══════════════════════════════════════════════════════
  if (!activeTournee) {
    return (
      <div style={styles.container}>
        <Header user={currentUser} onMenuClick={() => {}} onLogout={handleLogout} title="Mes tournées" />
        <div style={styles.contentNoPad}>
          {tournees.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚛</div>
              <div style={{ fontSize: 16, color: T.sub }}>Aucune tournée pour aujourd'hui</div>
              <button style={{ ...styles.btnPrimary, marginTop: 20 }} onClick={loadTournees}>
                Actualiser
              </button>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 14, color: T.sub, marginBottom: 12 }}>
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              {tournees.map((t) => (
                <TourneeCard key={t.id} tournee={t} onStart={() => startTournee(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // APP PRINCIPALE (tournée active)
  // ═══════════════════════════════════════════════════════
  return (
    <div style={styles.container}>
      {/* ─── Header ─────────────────────────────────── */}
      <Header
        user={currentUser}
        onMenuClick={() => setDrawerOpen(true)}
        onLogout={handleLogout}
        title={activeTournee.nom || `Tournée #${activeTournee.id}`}
      />

      {/* ─── Barre de progression ───────────────────── */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        <span style={styles.progressText}>{collectedCount}/{totalPoints} collectés ({progressPct}%)</span>
      </div>

      {/* ─── Drawer latéral ─────────────────────────── */}
      {drawerOpen && (
        <Drawer
          onClose={() => setDrawerOpen(false)}
          user={currentUser}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          tourneeDetail={tourneeDetail}
          collections={collections}
          totalPoints={totalPoints}
          collectedCount={collectedCount}
          remainingCount={remainingCount}
          onFinishTournee={finishTournee}
        />
      )}

      {/* ─── Contenu principal ──────────────────────── */}
      <div style={styles.mainContent}>
        {screen === "map" && (
          <>
            <div ref={mapRef} style={styles.mapContainer} />
            {/* Info prochaine CAV */}
            {nextCav && !navigatingToCenter && (
              <div style={styles.nextCavBanner} onClick={navigateToNextCav}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={styles.nextCavIcon}>📍</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>
                      Prochaine : {nextCav.nom || `CAV #${nextCav.cav_id}`}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub }}>
                      Appuyez pour naviguer
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 20 }}>🧭</div>
              </div>
            )}
            {navigatingToCenter && (
              <div style={{ ...styles.nextCavBanner, borderLeftColor: T.danger }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ ...styles.nextCavIcon, background: T.danger }}>🏭</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>Retour au centre de tri</div>
                    <div style={{ fontSize: 11, color: T.sub }}>Navigation en cours</div>
                  </div>
                </div>
              </div>
            )}
            {/* ─── Bandeau GPS permanent (Android) ─── */}
            <div style={styles.gpsStatusBar}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: currentPosition ? T.success : T.danger,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: T.white, fontWeight: 500 }}>
                GPS {currentPosition ? "actif" : "recherche..."}
              </span>
              {gpsAccuracy != null && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                  {gpsAccuracy}m
                </span>
              )}
              {gpsSpeed != null && gpsSpeed > 0 && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                  {gpsSpeed} km/h
                </span>
              )}
              {wakeLockActive && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginLeft: "auto" }}>
                  Ecran ON
                </span>
              )}
            </div>
          </>
        )}

        {screen === "scanner" && (
          <ScannerScreen
            videoRef={videoRef}
            onCancel={() => { stopScanner(); setScreen("map"); }}
            onManualSubmit={handleManualScan}
          />
        )}

        {screen === "unavailable" && (
          <UnavailableScreen
            motifs={MOTIFS_INDISPONIBLE}
            selectedMotif={selectedMotif}
            onSelectMotif={setSelectedMotif}
            photoPreview={photoPreview}
            photoInputRef={photoInputRef}
            onPhotoCapture={handlePhotoCapture}
            onCancel={() => { setScreen("map"); setSelectedMotif(""); setPhotoFile(null); setPhotoPreview(null); }}
            onSubmit={handleUnavailableSubmit}
            nextCav={nextCav}
          />
        )}

        {screen === "indicator" && (
          <IndicatorScreen
            scanResult={scanResult}
            fillLevels={FILL_LEVELS}
            selectedFillLevel={selectedFillLevel}
            onSelectLevel={setSelectedFillLevel}
            onCancel={() => { setScreen("map"); setSelectedFillLevel(null); setScanResult(null); }}
            onSubmit={submitCollection}
            loading={loading}
          />
        )}
      </div>

      {/* ─── Menu permanent bas ─────────────────────── */}
      {screen === "map" && (
        <BottomMenu
          onQRCode={() => startScanner()}
          onQRUnavailable={() => { setSelectedMotif(""); setPhotoFile(null); setPhotoPreview(null); setScreen("unavailable"); }}
          onRetourCentre={handleRetourCentre}
        />
      )}

      {/* ─── Toast ──────────────────────────────────── */}
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === "success" ? T.success : toast.type === "warning" ? T.warning : T.danger,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ─── CSS Animation (pulse pour prochaine CAV) ─ */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
          50% { transform: scale(1.15); box-shadow: 0 4px 16px rgba(243,156,18,0.5); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════

// ─── Écran de connexion ─────────────────────────────────
function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={styles.loginLogo}>🚛</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.primary, margin: "12px 0 4px" }}>Solidata</h1>
          <p style={{ fontSize: 13, color: T.sub }}>Application de collecte</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Identifiant</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre identifiant"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={styles.errorMsg}>{error}</div>
          )}

          <button
            type="submit"
            style={{ ...styles.btnPrimary, width: "100%", marginTop: 8, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────
function Header({ user, onMenuClick, onLogout, title }) {
  return (
    <div style={styles.header}>
      <button style={styles.headerBtn} onClick={onMenuClick}>☰</button>
      <div style={styles.headerTitle}>{title}</div>
      <button style={styles.headerBtn} onClick={onLogout}>⏻</button>
    </div>
  );
}

// ─── Carte tournée (sélection) ──────────────────────────
function TourneeCard({ tournee, onStart }) {
  const statusColors = {
    planifiee: T.primary,
    en_cours: T.warning,
    terminee: T.success,
  };
  const statusLabels = {
    planifiee: "Planifiée",
    en_cours: "En cours",
    terminee: "Terminée",
  };
  const status = tournee.status || "planifiee";

  return (
    <div style={styles.tourneeCard} onClick={onStart}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: T.dark }}>
            {tournee.nom || tournee.template_nom || `Tournée #${tournee.id}`}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
            {tournee.periode === "matin" ? "🌅 Matin" : "🌇 Après-midi"}
            {tournee.vehicle_nom ? ` • ${tournee.vehicle_nom}` : ""}
            {tournee.nb_cav ? ` • ${tournee.nb_cav} CAV` : ""}
          </div>
        </div>
        <div style={{
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: statusColors[status] + "20",
          color: statusColors[status],
        }}>
          {statusLabels[status]}
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.border }}>
          <div style={{
            height: "100%",
            borderRadius: 2,
            background: T.primary,
            width: `${tournee.progress || 0}%`,
          }} />
        </div>
        <span style={{ fontSize: 11, color: T.sub }}>{tournee.progress || 0}%</span>
      </div>
    </div>
  );
}

// ─── Drawer latéral ─────────────────────────────────────
function Drawer({ onClose, user, drawerTab, setDrawerTab, tourneeDetail, collections, totalPoints, collectedCount, remainingCount, onFinishTournee }) {
  const points = tourneeDetail?.points || [];
  const collectedCavIds = new Set(collections.map(c => c.cav_id));

  const tabs = [
    { key: "route", label: "Feuille de route", icon: "📋" },
    { key: "cavs", label: "Liste des CAV", icon: "📍" },
    { key: "suivi", label: "Suivi collecte", icon: "✅" },
    { key: "restant", label: "Restant", icon: "⏳" },
  ];

  return (
    <>
      <div style={styles.drawerOverlay} onClick={onClose} />
      <div style={styles.drawer}>
        {/* Profil utilisateur */}
        <div style={styles.drawerHeader}>
          <div style={styles.drawerAvatar}>
            {(user?.full_name || "U")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: T.white }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              {user?.role || "Opérateur"}
            </div>
          </div>
        </div>

        {/* Onglets du drawer */}
        <div style={styles.drawerTabs}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.drawerTabBtn,
                ...(drawerTab === tab.key ? styles.drawerTabBtnActive : {}),
              }}
              onClick={() => setDrawerTab(tab.key)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenu selon onglet */}
        <div style={styles.drawerContent}>
          {drawerTab === "route" && (
            <div>
              <div style={styles.drawerSectionTitle}>Feuille de route</div>
              <div style={styles.drawerStats}>
                <div style={styles.drawerStatItem}>
                  <div style={styles.drawerStatValue}>{totalPoints}</div>
                  <div style={styles.drawerStatLabel}>CAV total</div>
                </div>
                <div style={styles.drawerStatItem}>
                  <div style={{ ...styles.drawerStatValue, color: T.success }}>{collectedCount}</div>
                  <div style={styles.drawerStatLabel}>Collectés</div>
                </div>
                <div style={styles.drawerStatItem}>
                  <div style={{ ...styles.drawerStatValue, color: T.warning }}>{remainingCount}</div>
                  <div style={styles.drawerStatLabel}>Restants</div>
                </div>
              </div>
              {points.map((pt, idx) => {
                const done = collectedCavIds.has(pt.cav_id);
                return (
                  <div key={pt.cav_id} style={styles.routeItem}>
                    <div style={{
                      ...styles.routeNumber,
                      background: done ? T.success : T.border,
                      color: done ? T.white : T.dark,
                    }}>
                      {done ? "✓" : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: done ? T.light : T.dark }}>
                        {pt.nom || `CAV #${pt.cav_id}`}
                      </div>
                      <div style={{ fontSize: 11, color: T.light }}>
                        {pt.ville || pt.adresse || ""}
                      </div>
                    </div>
                    {done && <span style={{ fontSize: 11, color: T.success }}>Fait</span>}
                  </div>
                );
              })}
            </div>
          )}

          {drawerTab === "cavs" && (
            <div>
              <div style={styles.drawerSectionTitle}>Tous les CAV de la tournée</div>
              {points.map((pt, idx) => (
                <div key={pt.cav_id} style={styles.cavListItem}>
                  <div style={{ ...styles.routeNumber, background: T.primary, color: T.white }}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{pt.nom || `CAV #${pt.cav_id}`}</div>
                    <div style={{ fontSize: 11, color: T.sub }}>{pt.adresse || ""}</div>
                    {pt.ville && <div style={{ fontSize: 11, color: T.light }}>{pt.code_postal} {pt.ville}</div>}
                    {pt.nb_cav && <div style={{ fontSize: 10, color: T.primary }}>{pt.nb_cav} conteneur(s)</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {drawerTab === "suivi" && (
            <div>
              <div style={styles.drawerSectionTitle}>Collectes effectuées ({collectedCount})</div>
              {collections.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: T.sub }}>
                  Aucune collecte pour le moment
                </div>
              ) : (
                collections.map((c, idx) => {
                  const level = FILL_LEVELS.find(l => l.key === c.fill_level);
                  return (
                    <div key={c.id || idx} style={styles.collectionItem}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: level ? level.color + "20" : T.primaryLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}>
                        {level?.icon || "📦"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {c.cav_nom || `CAV #${c.cav_id}`}
                        </div>
                        <div style={{ fontSize: 11, color: T.sub }}>
                          {level?.label || c.fill_level} • {c.scanned_at ? new Date(c.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {drawerTab === "restant" && (
            <div>
              <div style={styles.drawerSectionTitle}>Ramassage restant ({remainingCount})</div>
              {points.filter(pt => !collectedCavIds.has(pt.cav_id)).map((pt, idx) => (
                <div key={pt.cav_id} style={styles.cavListItem}>
                  <div style={{ ...styles.routeNumber, background: T.warning, color: T.white }}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{pt.nom || `CAV #${pt.cav_id}`}</div>
                    <div style={{ fontSize: 11, color: T.sub }}>{pt.adresse || ""} {pt.ville || ""}</div>
                  </div>
                </div>
              ))}
              {remainingCount === 0 && (
                <div style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  <div style={{ color: T.success, fontWeight: 600 }}>Tous les CAV sont collectés !</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bouton terminer tournée */}
        <div style={styles.drawerFooter}>
          <button style={styles.btnDanger} onClick={onFinishTournee}>
            Terminer la tournée
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Écran Scanner QR ───────────────────────────────────
function ScannerScreen({ videoRef, onCancel, onManualSubmit }) {
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  return (
    <div style={styles.scannerContainer}>
      <div style={styles.scannerHeader}>
        <button style={styles.scannerCloseBtn} onClick={onCancel}>✕</button>
        <span style={{ color: T.white, fontWeight: 600, fontSize: 16 }}>Scanner le QR Code</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.videoWrapper}>
        <video
          ref={videoRef}
          style={styles.video}
          playsInline
          muted
        />
        <div style={styles.scanOverlay}>
          <div style={styles.scanFrame} />
        </div>
        <div style={styles.scanHint}>Cadrez le QR code du conteneur</div>
      </div>

      <div style={styles.scannerFooter}>
        {!showManual ? (
          <button
            style={styles.btnSecondary}
            onClick={() => setShowManual(true)}
          >
            Saisie manuelle du code
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ST-0001-ABCDEF"
              autoFocus
            />
            <button
              style={styles.btnPrimary}
              onClick={() => manualCode && onManualSubmit(manualCode)}
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Écran QR Indisponible ──────────────────────────────
function UnavailableScreen({ motifs, selectedMotif, onSelectMotif, photoPreview, photoInputRef, onPhotoCapture, onCancel, onSubmit, nextCav }) {
  return (
    <div style={styles.fullScreenPanel}>
      <div style={styles.panelHeader}>
        <button style={styles.panelCloseBtn} onClick={onCancel}>✕</button>
        <span style={{ fontWeight: 600, fontSize: 16 }}>QR Code indisponible</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.panelBody}>
        {nextCav && (
          <div style={styles.cavInfo}>
            <span style={{ fontSize: 20 }}>📍</span>
            <span style={{ fontWeight: 500 }}>{nextCav.nom || `CAV #${nextCav.cav_id}`}</span>
          </div>
        )}

        <div style={styles.sectionLabel}>Motif *</div>
        <div style={styles.motifGrid}>
          {motifs.map((motif) => (
            <button
              key={motif}
              style={{
                ...styles.motifBtn,
                ...(selectedMotif === motif ? styles.motifBtnActive : {}),
              }}
              onClick={() => onSelectMotif(motif)}
            >
              {motif}
            </button>
          ))}
        </div>

        <div style={styles.sectionLabel}>Photo (optionnel)</div>
        <div style={styles.photoArea}>
          {photoPreview ? (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} alt="Photo" style={styles.photoPreview} />
              <button
                style={styles.photoRemoveBtn}
                onClick={() => { photoInputRef.current.value = ""; }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              style={styles.photoCaptureBtn}
              onClick={() => photoInputRef.current?.click()}
            >
              <span style={{ fontSize: 32 }}>📷</span>
              <span style={{ fontSize: 12, color: T.sub }}>Prendre une photo</span>
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={onPhotoCapture}
          />
        </div>
      </div>

      <div style={styles.panelFooter}>
        <button style={styles.btnSecondary} onClick={onCancel}>Annuler</button>
        <button
          style={{ ...styles.btnPrimary, flex: 1, opacity: selectedMotif ? 1 : 0.5 }}
          onClick={onSubmit}
          disabled={!selectedMotif}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

// ─── Écran Indicateur de collecte (visuel) ──────────────
function IndicatorScreen({ scanResult, fillLevels, selectedFillLevel, onSelectLevel, onCancel, onSubmit, loading }) {
  return (
    <div style={styles.fullScreenPanel}>
      <div style={styles.panelHeader}>
        <button style={styles.panelCloseBtn} onClick={onCancel}>✕</button>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Indicateur de collecte</span>
        <div style={{ width: 36 }} />
      </div>

      <div style={styles.panelBody}>
        {scanResult && (
          <div style={styles.cavInfo}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div>
              <div style={{ fontWeight: 500 }}>{scanResult.nom || `CAV #${scanResult.cav_id}`}</div>
              {scanResult.unavailable_motif && (
                <div style={{ fontSize: 11, color: T.warning }}>
                  Motif : {scanResult.unavailable_motif}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={styles.sectionLabel}>Niveau de remplissage</div>

        <div style={styles.fillLevelGrid}>
          {fillLevels.map((level) => {
            const isSelected = selectedFillLevel?.key === level.key;
            return (
              <button
                key={level.key}
                style={{
                  ...styles.fillLevelBtn,
                  borderColor: isSelected ? level.color : T.border,
                  background: isSelected ? level.color + "15" : T.white,
                }}
                onClick={() => onSelectLevel(level)}
              >
                {/* Conteneur visuel */}
                <div style={styles.containerVisual}>
                  <div style={styles.containerBody}>
                    <div style={{
                      ...styles.containerFill,
                      height: `${Math.min(level.pct, 100)}%`,
                      background: level.color,
                    }} />
                    {level.pct > 100 && (
                      <div style={styles.containerOverflow}>
                        <span style={{ fontSize: 10 }}>💥</span>
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 20 }}>{level.icon}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? level.color : T.dark,
                }}>
                  {level.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.panelFooter}>
        <button style={styles.btnSecondary} onClick={onCancel}>Annuler</button>
        <button
          style={{
            ...styles.btnPrimary,
            flex: 1,
            opacity: selectedFillLevel && !loading ? 1 : 0.5,
          }}
          onClick={onSubmit}
          disabled={!selectedFillLevel || loading}
        >
          {loading ? "Envoi..." : "Valider la collecte"}
        </button>
      </div>
    </div>
  );
}

// ─── Menu permanent bas ─────────────────────────────────
function BottomMenu({ onQRCode, onQRUnavailable, onRetourCentre }) {
  return (
    <div style={styles.bottomMenu}>
      <div style={styles.bottomMenuRow}>
        <button style={styles.qrButton} onClick={onQRCode}>
          <span style={{ fontSize: 28 }}>📱</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>QR Code</span>
        </button>
        <button style={styles.qrUnavailableButton} onClick={onQRUnavailable}>
          <span style={{ fontSize: 28 }}>🚫</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>QR indisponible</span>
        </button>
      </div>
      <button style={styles.retourCentreBtn} onClick={onRetourCentre}>
        🏭 Retour au centre
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = {
  // ─── Container ────────────────────────────────────────
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    background: T.bg,
    fontFamily: "'Poppins', sans-serif",
    overflow: "hidden",
  },

  // ─── Header ───────────────────────────────────────────
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    height: 56,
    background: T.primary,
    color: T.white,
    flexShrink: 0,
    zIndex: 10,
  },
  headerBtn: {
    background: "none",
    border: "none",
    color: T.white,
    fontSize: 22,
    cursor: "pointer",
    padding: "8px",
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    flex: 1,
    textAlign: "center",
  },

  // ─── Progress bar ─────────────────────────────────────
  progressBar: {
    height: 22,
    background: T.border,
    position: "relative",
    flexShrink: 0,
  },
  progressFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${T.primary}, ${T.success})`,
    transition: "width 0.5s ease",
    borderRadius: "0 4px 4px 0",
  },
  progressText: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    color: T.dark,
  },

  // ─── Main content ─────────────────────────────────────
  mainContent: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  contentNoPad: {
    flex: 1,
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
  },

  // ─── Map ──────────────────────────────────────────────
  mapContainer: {
    width: "100%",
    height: "100%",
  },
  nextCavBanner: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    background: T.white,
    borderRadius: 12,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    zIndex: 5,
    cursor: "pointer",
    borderLeft: `4px solid ${T.warning}`,
  },
  nextCavIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: T.warning,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },

  // ─── GPS Status Bar ────────────────────────────────────
  gpsStatusBar: {
    position: "absolute",
    bottom: 6,
    left: 10,
    right: 10,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 20,
    background: "rgba(37,48,54,0.85)",
    zIndex: 5,
  },

  // ─── Bottom Menu ──────────────────────────────────────
  bottomMenu: {
    background: T.white,
    padding: "8px 12px",
    paddingBottom: "max(8px, env(safe-area-inset-bottom))",
    borderTop: `1px solid ${T.border}`,
    flexShrink: 0,
    zIndex: 10,
  },
  bottomMenuRow: {
    display: "flex",
    gap: 10,
    marginBottom: 8,
  },
  qrButton: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "12px 8px",
    borderRadius: 12,
    border: `2px solid ${T.primary}`,
    background: T.primaryLight,
    color: T.primary,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  qrUnavailableButton: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "12px 8px",
    borderRadius: 12,
    border: `2px solid ${T.warning}`,
    background: T.warning + "15",
    color: T.warning,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  retourCentreBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: T.dark,
    color: T.white,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },

  // ─── Drawer ───────────────────────────────────────────
  drawerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 100,
  },
  drawer: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "85%",
    maxWidth: 360,
    background: T.white,
    zIndex: 101,
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 16px",
    background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    color: T.white,
  },
  drawerTabs: {
    display: "flex",
    flexDirection: "column",
    padding: "8px 0",
    borderBottom: `1px solid ${T.border}`,
  },
  drawerTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 20px",
    border: "none",
    background: "none",
    fontSize: 14,
    color: T.sub,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "'Poppins', sans-serif",
  },
  drawerTabBtnActive: {
    background: T.primaryLight,
    color: T.primary,
    fontWeight: 600,
    borderLeft: `3px solid ${T.primary}`,
  },
  drawerContent: {
    flex: 1,
    overflow: "auto",
    padding: "0 0 8px",
    WebkitOverflowScrolling: "touch",
  },
  drawerSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: T.sub,
    padding: "12px 16px 8px",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  drawerStats: {
    display: "flex",
    padding: "0 16px 12px",
    gap: 8,
  },
  drawerStatItem: {
    flex: 1,
    background: T.bg,
    borderRadius: 10,
    padding: "10px 8px",
    textAlign: "center",
  },
  drawerStatValue: {
    fontSize: 22,
    fontWeight: 700,
    color: T.primary,
  },
  drawerStatLabel: {
    fontSize: 10,
    color: T.sub,
    marginTop: 2,
  },
  drawerFooter: {
    padding: "12px 16px",
    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
    borderTop: `1px solid ${T.border}`,
  },

  // ─── Route item ───────────────────────────────────────
  routeItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 16px",
    borderBottom: `1px solid ${T.bg}`,
  },
  routeNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  cavListItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    borderBottom: `1px solid ${T.bg}`,
  },
  collectionItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    borderBottom: `1px solid ${T.bg}`,
  },

  // ─── Scanner ──────────────────────────────────────────
  scannerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "#000",
    display: "flex",
    flexDirection: "column",
    zIndex: 50,
  },
  scannerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "rgba(0,0,0,0.8)",
  },
  scannerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: T.white,
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  videoWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 220,
    height: 220,
    border: `3px solid ${T.primary}`,
    borderRadius: 16,
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
  },
  scanHint: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    color: T.white,
    fontSize: 14,
    fontWeight: 500,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  scannerFooter: {
    padding: "16px",
    paddingBottom: "max(16px, env(safe-area-inset-bottom))",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
  },

  // ─── Full screen panel ────────────────────────────────
  fullScreenPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: T.bg,
    display: "flex",
    flexDirection: "column",
    zIndex: 50,
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: T.white,
    borderBottom: `1px solid ${T.border}`,
  },
  panelCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: `1px solid ${T.border}`,
    background: T.white,
    color: T.dark,
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panelBody: {
    flex: 1,
    overflow: "auto",
    padding: 16,
    WebkitOverflowScrolling: "touch",
  },
  panelFooter: {
    display: "flex",
    gap: 10,
    padding: "12px 16px",
    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
    background: T.white,
    borderTop: `1px solid ${T.border}`,
  },

  // ─── CAV info ─────────────────────────────────────────
  cavInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: T.white,
    borderRadius: 12,
    marginBottom: 16,
    border: `1px solid ${T.border}`,
  },

  // ─── Section label ────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: T.sub,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ─── Motif grid ───────────────────────────────────────
  motifGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 20,
  },
  motifBtn: {
    padding: "12px 16px",
    borderRadius: 10,
    border: `2px solid ${T.border}`,
    background: T.white,
    fontSize: 14,
    color: T.dark,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.15s",
  },
  motifBtnActive: {
    borderColor: T.warning,
    background: T.warning + "15",
    color: T.warning,
    fontWeight: 600,
  },

  // ─── Photo ────────────────────────────────────────────
  photoArea: {
    marginBottom: 16,
  },
  photoCaptureBtn: {
    width: "100%",
    padding: "24px",
    borderRadius: 12,
    border: `2px dashed ${T.border}`,
    background: T.white,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  photoPreview: {
    width: "100%",
    maxHeight: 200,
    objectFit: "cover",
    borderRadius: 12,
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.6)",
    color: T.white,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Fill level grid ──────────────────────────────────
  fillLevelGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
  },
  fillLevelBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "14px 8px",
    borderRadius: 14,
    border: `2px solid ${T.border}`,
    background: T.white,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.15s",
  },
  containerVisual: {
    width: 36,
    height: 44,
    position: "relative",
  },
  containerBody: {
    width: "100%",
    height: "100%",
    border: `2px solid ${T.border}`,
    borderRadius: 4,
    borderTop: "none",
    position: "relative",
    overflow: "hidden",
  },
  containerFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    transition: "height 0.3s",
    borderRadius: "0 0 2px 2px",
  },
  containerOverflow: {
    position: "absolute",
    top: -8,
    left: "50%",
    transform: "translateX(-50%)",
  },

  // ─── Buttons ──────────────────────────────────────────
  btnPrimary: {
    padding: "12px 24px",
    borderRadius: 10,
    border: "none",
    background: T.primary,
    color: T.white,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  btnSecondary: {
    padding: "12px 24px",
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    background: T.white,
    color: T.dark,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },
  btnDanger: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: T.danger,
    color: T.white,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
  },

  // ─── Login ────────────────────────────────────────────
  loginContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
    padding: 24,
    fontFamily: "'Poppins', sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: 380,
    background: T.white,
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
  },
  loginLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    background: T.primaryLight,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 36,
  },

  // ─── Inputs ───────────────────────────────────────────
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: T.sub,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    fontSize: 15,
    fontFamily: "'Poppins', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  errorMsg: {
    padding: "10px 14px",
    borderRadius: 8,
    background: T.danger + "15",
    color: T.danger,
    fontSize: 13,
    marginBottom: 12,
  },

  // ─── Tournée card ─────────────────────────────────────
  tourneeCard: {
    background: T.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    border: `1px solid ${T.border}`,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  // ─── Empty state ──────────────────────────────────────
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    textAlign: "center",
  },

  // ─── Toast ────────────────────────────────────────────
  toast: {
    position: "fixed",
    bottom: 120,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 24px",
    borderRadius: 24,
    color: T.white,
    fontSize: 14,
    fontWeight: 500,
    zIndex: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },
};
