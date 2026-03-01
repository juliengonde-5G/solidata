import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import {
  Truck, MapPin, CheckCircle, AlertCircle, Play, Square,
  Navigation, Package, Clock, ScanLine, X, Shield,
  ChevronDown, ChevronUp, Fuel, Gauge, AlertTriangle,
  ArrowLeft, Weight, RotateCcw, ExternalLink
} from 'lucide-react';

const STATUS_COLORS = {
  planifiee: 'bg-gray-100 text-gray-600',
  en_cours: 'bg-blue-100 text-blue-700',
  terminee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700'
};

const POINT_STATUS = {
  a_collecter: { label: 'A collecter', color: 'border-gray-300 bg-white', icon: MapPin },
  collecte: { label: 'Collecté', color: 'border-green-400 bg-green-50', icon: CheckCircle },
  passe: { label: 'Passé', color: 'border-yellow-400 bg-yellow-50', icon: AlertCircle },
  probleme: { label: 'Problème', color: 'border-red-400 bg-red-50', icon: AlertCircle }
};

const QR_ISSUE_REASONS = [
  'QR code illisible',
  'QR code manquant',
  'QR code détérioré',
  'Conteneur absent',
  'Accès impossible',
  'Autre'
];

// Images de remplissage (icônes textuelles car pas d'images uploadées)
const FILL_LEVELS = [
  { value: 0, label: 'Vide', emoji: '\u2B1C', color: 'bg-gray-100 border-gray-300 text-gray-600' },
  { value: 25, label: 'Peu rempli', emoji: '\u2B1C\u2591', color: 'bg-green-50 border-green-300 text-green-700' },
  { value: 50, label: 'À moitié', emoji: '\u2B1C\u2592', color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  { value: 75, label: 'Presque plein', emoji: '\u2B1C\u2593', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { value: 100, label: 'Plein', emoji: '\u2B1B', color: 'bg-red-50 border-red-300 text-red-700' },
  { value: 110, label: 'Déborde', emoji: '\u2B1B\u26A0', color: 'bg-red-100 border-red-500 text-red-800' },
];

// Calcul distance Haversine en km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Dépôt Le Houlme
const DEPOT = { lat: 49.5008, lng: 1.0506, name: 'Centre de tri - Le Houlme' };

export default function MobileCollecte() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const gpsWatchRef = useRef(null);
  const scanInputRef = useRef(null);

  // Pre-departure checklist
  const [showPreDeparture, setShowPreDeparture] = useState(false);
  const [pendingRouteId, setPendingRouteId] = useState(null);
  const [preCheck, setPreCheck] = useState({
    vehicleOk: false, fuelLevel: 'plein', mileage: '', safetyAck: false
  });

  // Point actions
  const [expandedPoint, setExpandedPoint] = useState(null);
  const [pointFillLevel, setPointFillLevel] = useState(50);
  const [pointNotes, setPointNotes] = useState('');
  const [showQrIssue, setShowQrIssue] = useState(null); // pointId
  const [qrIssueReason, setQrIssueReason] = useState('');

  // QR-first workflow: fill level and "Collecté" only after QR scan or QR unavailable
  const [qrValidated, setQrValidated] = useState(false);
  const [qrNote, setQrNote] = useState('');

  // Truck full / return to depot
  const [showTruckFull, setShowTruckFull] = useState(false);

  // Weight entry at sorting center
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [weightKg, setWeightKg] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  // Charger les tournées du jour
  const fetchRoutes = async () => {
    try {
      const { data } = await api.get(`/collection/daily-routes/day/${today}`);
      const isManager = user && ['admin', 'manager', 'rh'].includes(user.role);
      const myRoutes = isManager ? data : data.filter(r =>
        !r.driverId || r.driverId === user?.employeeId || r.driver?.id === user?.employeeId
      );
      setRoutes(myRoutes);
      const enCours = myRoutes.find(r => r.status === 'en_cours');
      if (enCours) loadRouteDetail(enCours.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRouteDetail = async (routeId) => {
    try {
      const { data } = await api.get(`/collection/daily-routes/${routeId}`);
      setActiveRoute(data);
      setRoutePoints(data.routePoints || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  // GPS tracking
  const startGPS = () => {
    if (!navigator.geolocation) return;
    setGpsActive(true);
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCurrentPos(coords);
        if (activeRoute?.status === 'en_cours') {
          api.post('/collection/gps', {
            dailyRouteId: activeRoute.id, latitude: coords.latitude,
            longitude: coords.longitude, accuracy: coords.accuracy, speed: pos.coords.speed
          }).catch(() => {});
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  };

  const stopGPS = () => {
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setGpsActive(false);
  };

  useEffect(() => () => stopGPS(), []);

  // Calcul distance/temps estimés pour la tournée
  const getRouteEstimates = (points) => {
    if (!points || points.length === 0) return { distance: 0, time: 0 };
    let totalDist = 0;
    let prev = { lat: DEPOT.lat, lng: DEPOT.lng };
    const sorted = [...points].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    for (const rp of sorted) {
      const p = rp.collectionPoint;
      if (p?.latitude && p?.longitude) {
        totalDist += haversine(prev.lat, prev.lng, p.latitude, p.longitude);
        prev = { lat: p.latitude, lng: p.longitude };
      }
    }
    // Retour au dépôt
    totalDist += haversine(prev.lat, prev.lng, DEPOT.lat, DEPOT.lng);
    const avgSpeed = 30; // km/h en ville
    const driveTime = (totalDist / avgSpeed) * 60;
    const stopTime = sorted.length * 12; // 12 min par arrêt
    return { distance: Math.round(totalDist), time: Math.round(driveTime + stopTime) };
  };

  // Prochain point à collecter
  const getNextPoint = () => {
    const sorted = [...routePoints].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return sorted.find(rp => rp.status === 'a_collecter');
  };

  // Distance vers le prochain point
  const getDistToNext = (nextPt) => {
    if (!currentPos || !nextPt?.collectionPoint?.latitude) return null;
    return haversine(
      currentPos.latitude, currentPos.longitude,
      nextPt.collectionPoint.latitude, nextPt.collectionPoint.longitude
    );
  };

  // Ouvrir navigation GPS externe
  const openNavigation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // PRE-DEPARTURE: Initier le contrôle avant départ
  const initiateStart = (routeId) => {
    setPendingRouteId(routeId);
    setPreCheck({ vehicleOk: false, fuelLevel: 'plein', mileage: '', safetyAck: false });
    setShowPreDeparture(true);
  };

  // PRE-DEPARTURE: Confirmer et démarrer
  const confirmStart = async () => {
    if (!preCheck.vehicleOk || !preCheck.safetyAck) return;
    try {
      // Envoyer kilométrage si renseigné
      if (preCheck.mileage && activeRoute?.vehicleId) {
        api.put(`/team/vehicles/${activeRoute.vehicleId}`, { mileage: parseInt(preCheck.mileage) }).catch(() => {});
      }
      await api.put(`/collection/daily-routes/${pendingRouteId}/start`, {
        fuelLevel: preCheck.fuelLevel,
        startMileage: preCheck.mileage ? parseInt(preCheck.mileage) : undefined
      });
      setShowPreDeparture(false);
      await loadRouteDetail(pendingRouteId);
      startGPS();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // SCAN: marquer un point
  const handleScan = async (pointId, status = 'collecte', fillLevel, notes) => {
    if (!activeRoute) return;
    try {
      const body = { status };
      if (fillLevel !== undefined) body.fillLevel = fillLevel;
      if (notes) body.notes = notes;
      if (currentPos) { body.latitude = currentPos.latitude; body.longitude = currentPos.longitude; }
      await api.put(`/collection/daily-routes/${activeRoute.id}/scan/${pointId}`, body);
      await loadRouteDetail(activeRoute.id);
      setExpandedPoint(null);
      setPointFillLevel(50);
      setPointNotes('');
      setQrValidated(false);
      setQrNote('');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // QR code scan — valide le QR mais ne collecte pas automatiquement
  const handleQRScan = async () => {
    if (!scanInput.trim()) return;
    try {
      const { data } = await api.get(`/collection/points/scan/${scanInput.trim()}`);
      const matchedPoint = routePoints.find(rp => rp.collectionPointId === data.id);
      if (matchedPoint) {
        const nextPoint = getNextPoint();
        if (nextPoint && matchedPoint.collectionPointId === nextPoint.collectionPointId) {
          // QR correspond au prochain point — débloquer le remplissage
          setQrValidated(true);
          setQrNote('');
        } else if (matchedPoint.status === 'a_collecter') {
          // QR correspond à un autre point non traité — débloquer aussi
          setQrValidated(true);
          setQrNote('');
        } else {
          setScanResult({ ...data, alreadyDone: true, message: `Point "${data.name}" déjà traité` });
          return;
        }
        setScanMode(false);
        setScanInput('');
        setScanResult(null);
      } else {
        setScanResult({ ...data, notInRoute: true });
      }
    } catch (err) {
      setScanResult({ error: 'QR code non reconnu' });
    }
  };

  // QR indisponible — débloquer le remplissage avec une note
  const handleQrUnavailable = () => {
    const reason = qrIssueReason || 'QR code indisponible';
    setQrValidated(true);
    setQrNote(reason);
    setShowQrIssue(null);
    setQrIssueReason('');
  };

  // Camion plein → retour centre de tri
  const handleTruckFull = () => {
    setShowTruckFull(false);
    setShowWeightEntry(true);
  };

  // Saisie du poids au centre de tri
  const handleWeightSubmit = async () => {
    if (!weightKg || !activeRoute) return;
    try {
      await api.post(`/collection/daily-routes/${activeRoute.id}/weight`, {
        poidsNet: parseInt(weightKg),
        origine: 'Collecte de CAV',
        categorie: activeRoute.templateRoute?.name || 'Tournée'
      });
      setShowWeightEntry(false);
      setWeightKg('');
      await loadRouteDetail(activeRoute.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // Terminer la tournée
  const handleFinishRoute = async () => {
    if (!activeRoute) return;
    const done = routePoints.filter(p => p.status === 'collecte').length;
    const total = routePoints.length;
    if (!confirm(`Terminer la tournée ? (${done}/${total} points collectés)`)) return;
    // Demander le poids final
    setShowWeightEntry(true);
  };

  const confirmFinish = async () => {
    try {
      if (weightKg) {
        await api.post(`/collection/daily-routes/${activeRoute.id}/weight`, {
          poidsNet: parseInt(weightKg),
          origine: 'Collecte de CAV',
          categorie: activeRoute.templateRoute?.name || 'Tournée'
        });
      }
      await api.put(`/collection/daily-routes/${activeRoute.id}/finish`);
      stopGPS();
      setActiveRoute(null);
      setRoutePoints([]);
      setShowWeightEntry(false);
      setWeightKg('');
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  // ========================
  // VUE TOURNÉE EN COURS
  // ========================
  if (activeRoute) {
    const sorted = [...routePoints].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const done = routePoints.filter(p => p.status === 'collecte').length;
    const total = routePoints.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextPt = getNextPoint();
    const distToNext = getDistToNext(nextPt);

    // Calcul distance/temps restants
    const remaining = sorted.filter(rp => rp.status === 'a_collecter');
    let remainDist = 0;
    let prev = currentPos ? { lat: currentPos.latitude, lng: currentPos.longitude } : { lat: DEPOT.lat, lng: DEPOT.lng };
    for (const rp of remaining) {
      const p = rp.collectionPoint;
      if (p?.latitude && p?.longitude) {
        remainDist += haversine(prev.lat, prev.lng, p.latitude, p.longitude);
        prev = { lat: p.latitude, lng: p.longitude };
      }
    }
    remainDist += haversine(prev.lat, prev.lng, DEPOT.lat, DEPOT.lng);
    const remainTime = Math.round((remainDist / 30) * 60 + remaining.length * 12);

    // Points multiples CAV à la même adresse
    const nextPointCavs = nextPt?.collectionPoint?.nbCav || 1;

    // Carte Google Maps embed URL
    const mapUrl = nextPt?.collectionPoint?.latitude
      ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${currentPos ? `${currentPos.latitude},${currentPos.longitude}` : `${DEPOT.lat},${DEPOT.lng}`}&destination=${nextPt.collectionPoint.latitude},${nextPt.collectionPoint.longitude}&mode=driving&language=fr`
      : null;

    return (
      <div className="max-w-lg mx-auto pb-36">
        {/* Carte en haut de page */}
        {mapUrl && activeRoute.status === 'en_cours' ? (
          <div className="rounded-2xl overflow-hidden shadow-sm mb-3 h-48 bg-gray-100">
            <iframe src={mapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100 h-48 mb-3 flex items-center justify-center text-gray-400 text-sm">
            {!gpsActive ? (
              <button onClick={startGPS} className="bg-soltex-green text-white px-4 py-2 rounded-lg text-sm font-medium">Activer le GPS</button>
            ) : 'Carte indisponible'}
          </div>
        )}

        {/* Bandeau distance/temps restant */}
        <div className="bg-white rounded-2xl shadow-sm p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{remainDist < 1 ? `${Math.round(remainDist * 1000)} m` : `${remainDist.toFixed(1)} km`}</p>
              <p className="text-[10px] text-gray-400 uppercase">Distance</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{remainTime < 60 ? `${remainTime} min` : `${Math.floor(remainTime / 60)}h${String(remainTime % 60).padStart(2, '0')}`}</p>
              <p className="text-[10px] text-gray-400 uppercase">Temps</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-soltex-green">{done}/{total}</p>
              <p className="text-[10px] text-gray-400 uppercase">Collectés</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[10px] text-gray-400">{gpsActive ? 'GPS' : 'GPS off'}</span>
          </div>
        </div>

        {/* PROCHAIN ARRÊT — uniquement la prochaine destination */}
        {nextPt && activeRoute.status === 'en_cours' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-blue-600 uppercase">Prochain arrêt ({remaining.length} restants)</div>
              {distToNext != null && (
                <span className="text-sm font-bold text-blue-500">{distToNext < 1 ? `${Math.round(distToNext * 1000)} m` : `${distToNext.toFixed(1)} km`}</span>
              )}
            </div>
            <p className="font-bold text-gray-800 text-lg">{nextPt.collectionPoint?.name || 'Point'}</p>
            <p className="text-sm text-gray-500">{nextPt.collectionPoint?.address}, {nextPt.collectionPoint?.city}</p>
            {nextPointCavs > 1 && (
              <p className="text-xs text-soltex-green font-semibold mt-1">{nextPointCavs} CAV sur cette adresse</p>
            )}

            {/* AVANT validation QR — demander de flasher ou signaler QR indisponible */}
            {!qrValidated && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center mb-3">
                  <ScanLine className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Flashez le QR code pour collecter ce point</p>
                  <p className="text-xs text-gray-400 mt-1">ou indiquez QR indisponible si le code est absent</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { handleScan(nextPt.collectionPointId, 'passe', undefined, 'Passé'); }}
                    className="bg-yellow-500 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Passer
                  </button>
                  <button onClick={() => { setShowQrIssue(nextPt.collectionPointId); setQrIssueReason(''); }}
                    className="bg-red-500 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> QR indisponible
                  </button>
                </div>
              </div>
            )}

            {/* APRÈS validation QR — saisie remplissage + collecte */}
            {qrValidated && (
              <div className="mt-3">
                {qrNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-700 font-medium">QR : {qrNote}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-2">Niveau de remplissage :</p>
                {nextPointCavs > 1 ? (
                  // Saisie par CAV si plusieurs
                  <div className="space-y-2">
                    {Array.from({ length: nextPointCavs }, (_, i) => (
                      <div key={i} className="bg-white rounded-lg p-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">CAV {i + 1}</p>
                        <div className="grid grid-cols-6 gap-1">
                          {FILL_LEVELS.map(fl => (
                            <button key={fl.value} onClick={() => {
                              const arr = [...(Array.isArray(pointFillLevel) ? pointFillLevel : new Array(nextPointCavs).fill(50))];
                              arr[i] = fl.value;
                              setPointFillLevel(arr);
                            }}
                              className={`py-1.5 rounded-lg border-2 text-center text-[10px] font-medium transition-all ${
                                (Array.isArray(pointFillLevel) ? pointFillLevel[i] : 50) === fl.value ? fl.color + ' border-current scale-105' : 'bg-white border-gray-200 text-gray-400'
                              }`}
                            >
                              <div className="text-base">{fl.emoji}</div>
                              <div className="leading-tight">{fl.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Saisie unique
                  <div className="grid grid-cols-6 gap-1.5">
                    {FILL_LEVELS.map(fl => (
                      <button key={fl.value} onClick={() => setPointFillLevel(fl.value)}
                        className={`py-2 rounded-xl border-2 text-center text-xs font-medium transition-all ${
                          pointFillLevel === fl.value ? fl.color + ' border-current scale-105 shadow' : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        <div className="text-lg">{fl.emoji}</div>
                        <div className="leading-tight">{fl.label}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <input type="text" placeholder="Notes (optionnel)" value={pointNotes}
                  onChange={e => setPointNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-2" />

                {/* Boutons d'action */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => {
                    const avgFill = Array.isArray(pointFillLevel) ? Math.round(pointFillLevel.reduce((a, b) => a + b, 0) / pointFillLevel.length) : pointFillLevel;
                    const combinedNotes = [qrNote, pointNotes].filter(Boolean).join(' | ');
                    handleScan(nextPt.collectionPointId, 'collecte', avgFill, combinedNotes);
                  }}
                    className="bg-green-500 text-white rounded-lg py-3 text-sm font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1 col-span-2">
                    <CheckCircle className="w-5 h-5" /> Collecté
                  </button>
                  <button onClick={() => { handleScan(nextPt.collectionPointId, 'passe', undefined, 'Passé'); }}
                    className="bg-yellow-500 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Passer
                  </button>
                  <button onClick={() => { setQrValidated(false); setQrNote(''); }}
                    className="bg-gray-400 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                    <RotateCcw className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            {nextPt.collectionPoint?.latitude && (
              <button onClick={() => openNavigation(nextPt.collectionPoint.latitude, nextPt.collectionPoint.longitude)}
                className="mt-2 w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Navigation className="w-4 h-4" /> Naviguer
              </button>
            )}
          </div>
        )}

        {/* Progression compacte des points passés */}
        {sorted.filter(rp => rp.status !== 'a_collecter').length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-3 mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Points traités</p>
            <div className="flex flex-wrap gap-1.5">
              {sorted.map((rp, idx) => (
                <div key={rp.collectionPointId || idx}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    rp.status === 'collecte' ? 'bg-green-100 text-green-700' :
                    rp.status === 'passe' ? 'bg-yellow-100 text-yellow-700' :
                    rp.status === 'probleme' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-400'
                  }`}
                  title={rp.collectionPoint?.name}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre fixe en bas: Scanner QR + Camion plein + Terminer */}
        {activeRoute.status === 'en_cours' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50 safe-area-bottom">
            <div className="max-w-lg mx-auto flex gap-2">
              <button onClick={() => { setScanMode(true); setTimeout(() => scanInputRef.current?.focus(), 100); }}
                className="flex-1 bg-soltex-green text-white rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-transform shadow">
                <ScanLine className="w-5 h-5" /> Flasher QR
              </button>
              <button onClick={() => setShowTruckFull(true)}
                className="flex-1 bg-amber-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-transform shadow">
                <Truck className="w-5 h-5" /> Camion plein
              </button>
              <button onClick={handleFinishRoute}
                className="bg-red-500 text-white rounded-xl py-3 px-4 flex items-center justify-center active:scale-95 transition-transform">
                <Square className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal: QR code indisponible */}
        {showQrIssue && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
            <div className="bg-white rounded-t-3xl w-full p-6">
              <h3 className="text-lg font-bold mb-3">QR code indisponible</h3>
              <p className="text-sm text-gray-500 mb-4">Indiquez le motif :</p>
              <div className="space-y-2 mb-4">
                {QR_ISSUE_REASONS.map(r => (
                  <button key={r} onClick={() => setQrIssueReason(r)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm ${qrIssueReason === r ? 'border-soltex-green bg-soltex-green/5 font-medium' : 'border-gray-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
              {qrIssueReason === 'Autre' && (
                <input type="text" placeholder="Précisez..." className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
                  onChange={e => setQrIssueReason(e.target.value)} />
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowQrIssue(null)} className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-3 font-semibold">Annuler</button>
                <button onClick={handleQrUnavailable} disabled={!qrIssueReason}
                  className="flex-1 bg-red-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Camion plein */}
        {showTruckFull && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold">Camion plein</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Vous allez retourner au centre de tri pour décharger. La pesée sera demandée à l'arrivée.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {routePoints.filter(p => p.status === 'a_collecter').length} points restants à collecter après le retour.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowTruckFull(false)} className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-3 font-semibold">Annuler</button>
                <button onClick={handleTruckFull} className="flex-1 bg-amber-500 text-white rounded-xl py-3 font-semibold">
                  Retour au centre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Saisie poids */}
        {showWeightEntry && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Weight className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold">Pesée au centre de tri</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Indiquez le poids net de la collecte après pesée.
              </p>
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1">Poids net (kg)</label>
                <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                  placeholder="Ex: 1200" className="w-full border-2 rounded-xl px-4 py-3 text-xl font-bold text-center" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowWeightEntry(false); setWeightKg(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-3 font-semibold">Annuler</button>
                <button onClick={activeRoute.status === 'en_cours' && routePoints.some(p => p.status === 'a_collecter') ? handleWeightSubmit : confirmFinish}
                  disabled={!weightKg}
                  className="flex-1 bg-soltex-green text-white rounded-xl py-3 font-semibold disabled:opacity-50">
                  {routePoints.every(p => p.status !== 'a_collecter') ? 'Terminer' : 'Valider & continuer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal scan QR */}
        {scanMode && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
            <div className="bg-white rounded-t-3xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Scanner un QR code</h3>
                <button onClick={() => { setScanMode(false); setScanResult(null); setScanInput(''); }}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Saisissez ou scannez le code QR (format ST-XXXXXXXX)</p>
              <div className="flex gap-2 mb-4">
                <input ref={scanInputRef} type="text" placeholder="ST-XXXXXXXX" value={scanInput}
                  onChange={e => setScanInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleQRScan()}
                  className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-lg font-mono focus:border-soltex-green focus:outline-none" autoFocus />
                <button onClick={handleQRScan} className="bg-soltex-green text-white rounded-xl px-6 py-3 font-semibold active:scale-95 transition-transform">OK</button>
              </div>
              {scanResult && (
                <div className={`rounded-xl p-4 ${scanResult.error ? 'bg-red-50 text-red-700' : scanResult.notInRoute ? 'bg-yellow-50 text-yellow-700' : scanResult.alreadyDone ? 'bg-gray-50 text-gray-700' : 'bg-green-50 text-green-700'}`}>
                  {scanResult.error ? <p>{scanResult.error}</p> :
                   scanResult.notInRoute ? <p>Point "{scanResult.name}" trouvé mais pas dans cette tournée</p> :
                   scanResult.alreadyDone ? <p>{scanResult.message}</p> :
                   <p>Point "{scanResult.name}" scanné</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================
  // PRE-DEPARTURE CHECKLIST
  // ========================
  if (showPreDeparture) {
    const pendingRoute = routes.find(r => r.id === pendingRouteId);
    const estimates = pendingRoute ? getRouteEstimates(pendingRoute.routePoints || []) : { distance: 0, time: 0 };
    const canStart = preCheck.vehicleOk && preCheck.safetyAck;

    return (
      <div className="max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowPreDeparture(false)}><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
          <h1 className="text-xl font-bold text-gray-800">Contrôle pré-départ</h1>
        </div>

        {/* Infos tournée */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h2 className="font-bold text-gray-800">{pendingRoute?.templateRoute?.name || 'Tournée'}</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pendingRoute?.routePoints?.length || 0} points</span>
            <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> ~{estimates.distance} km</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.floor(estimates.time / 60)}h{String(estimates.time % 60).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Contrôle véhicule */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-soltex-green" /> Contrôle véhicule</h3>
          <label className="flex items-center gap-3 py-2">
            <input type="checkbox" checked={preCheck.vehicleOk}
              onChange={e => setPreCheck({ ...preCheck, vehicleOk: e.target.checked })}
              className="w-5 h-5 accent-soltex-green" />
            <span className="text-sm">Le véhicule est en bon état (pneus, éclairage, freins, rétroviseurs)</span>
          </label>
        </div>

        {/* Carburant */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-soltex-green" /> Niveau de carburant</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: 'plein', label: 'Plein' },
              { val: '3/4', label: '3/4' },
              { val: '1/2', label: '1/2' },
              { val: '1/4', label: '1/4' },
            ].map(f => (
              <button key={f.val} onClick={() => setPreCheck({ ...preCheck, fuelLevel: f.val })}
                className={`py-2 rounded-lg text-sm font-medium border ${preCheck.fuelLevel === f.val ? 'bg-soltex-green text-white border-soltex-green' : 'border-gray-200 text-gray-600'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {preCheck.fuelLevel === '1/4' && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Pensez à faire le plein avant de partir
            </p>
          )}
        </div>

        {/* Kilométrage */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Gauge className="w-4 h-4 text-soltex-green" /> Kilométrage</h3>
          <input type="number" placeholder="Kilométrage actuel du véhicule" value={preCheck.mileage}
            onChange={e => setPreCheck({ ...preCheck, mileage: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* Sécurité routière */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Prévention risque routier</h3>
          <ul className="text-xs text-amber-700 space-y-1 mb-3">
            <li>- Respecter les limitations de vitesse et le code de la route</li>
            <li>- Adapter la conduite aux conditions météo</li>
            <li>- Pas d'utilisation du téléphone au volant</li>
            <li>- Port de la ceinture de sécurité obligatoire</li>
            <li>- Signaler tout incident au responsable</li>
          </ul>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={preCheck.safetyAck}
              onChange={e => setPreCheck({ ...preCheck, safetyAck: e.target.checked })}
              className="w-5 h-5 accent-soltex-green" />
            <span className="text-sm font-medium text-amber-800">J'ai pris connaissance des consignes de sécurité</span>
          </label>
        </div>

        <button onClick={confirmStart} disabled={!canStart}
          className="w-full bg-soltex-green text-white rounded-xl py-4 font-bold text-lg active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2">
          <Play className="w-6 h-6" /> Démarrer la tournée
        </button>
      </div>
    );
  }

  // ========================
  // VUE LISTE DES TOURNÉES
  // ========================
  const enCours = routes.filter(r => r.status === 'en_cours');
  const planifiees = routes.filter(r => r.status === 'planifiee');
  const terminees = routes.filter(r => r.status === 'terminee');

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="w-7 h-7 text-soltex-green" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mes collectes</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {routes.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune tournée prévue aujourd'hui</p>
        </div>
      )}

      {/* En cours */}
      {enCours.map(r => (
        <div key={r.id} className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-800">{r.templateRoute?.name || 'Tournée'}</h3>
              <p className="text-xs text-gray-500">{r.routePoints?.length || 0} points</p>
            </div>
            <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">En cours</span>
          </div>
          <button onClick={() => loadRouteDetail(r.id)}
            className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Navigation className="w-5 h-5" /> Reprendre
          </button>
        </div>
      ))}

      {/* Planifiées */}
      {planifiees.map(r => {
        const est = getRouteEstimates(r.routePoints || []);
        return (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{r.templateRoute?.name || 'Tournée'}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.routePoints?.length || '?'} points</span>
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> ~{est.distance} km</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.floor(est.time / 60)}h{String(est.time % 60).padStart(2, '0')}</span>
                </div>
              </div>
              {r.vehicle && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{r.vehicle.name}</span>}
            </div>
            <button onClick={() => initiateStart(r.id)}
              className="w-full bg-soltex-green text-white rounded-xl py-3 font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> Démarrer la tournée
            </button>
          </div>
        );
      })}

      {/* Terminées */}
      {terminees.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Terminées</h3>
          {terminees.map(r => {
            const done = r.routePoints?.filter(p => p.status === 'collecte').length || 0;
            const total = r.routePoints?.length || 0;
            return (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 mb-2 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-600">{r.templateRoute?.name || 'Tournée'}</h4>
                    <p className="text-xs text-gray-400">{done}/{total} collectés</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
