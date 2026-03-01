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
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // QR code scan
  const handleQRScan = async () => {
    if (!scanInput.trim()) return;
    try {
      const { data } = await api.get(`/collection/points/scan/${scanInput.trim()}`);
      const matchedPoint = routePoints.find(rp => rp.collectionPointId === data.id);
      if (matchedPoint) {
        handleScan(matchedPoint.collectionPointId);
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

  // QR indisponible
  const handleQrUnavailable = (pointId) => {
    const reason = qrIssueReason || 'QR code indisponible';
    handleScan(pointId, 'probleme', undefined, reason);
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

    return (
      <div className="max-w-lg mx-auto pb-28">
        {/* Header tournée */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {activeRoute.templateRoute?.name || 'Tournée'}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(activeRoute.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLORS[activeRoute.status]}`}>
              {activeRoute.status === 'en_cours' ? 'En cours' : activeRoute.status}
            </span>
          </div>

          {/* Barre de progression */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{done}/{total} collectés</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-soltex-green h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* GPS + position */}
          <div className="flex items-center gap-2 text-xs mt-2">
            <div className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-gray-500">{gpsActive ? 'GPS actif' : 'GPS inactif'}</span>
            {!gpsActive && activeRoute.status === 'en_cours' && (
              <button onClick={startGPS} className="text-soltex-green text-xs underline">Activer</button>
            )}
            {currentPos && (
              <span className="text-gray-400 ml-auto">
                {currentPos.latitude.toFixed(4)}, {currentPos.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {/* Prochain point + navigation */}
        {nextPt && activeRoute.status === 'en_cours' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-blue-600 uppercase">Prochain arrêt</div>
              {distToNext != null && (
                <span className="text-xs text-blue-500">{distToNext < 1 ? `${Math.round(distToNext * 1000)} m` : `${distToNext.toFixed(1)} km`}</span>
              )}
            </div>
            <p className="font-bold text-gray-800">{nextPt.collectionPoint?.name || 'Point'}</p>
            <p className="text-xs text-gray-500">{nextPt.collectionPoint?.address}, {nextPt.collectionPoint?.city}</p>
            {nextPt.collectionPoint?.latitude && (
              <button onClick={() => openNavigation(nextPt.collectionPoint.latitude, nextPt.collectionPoint.longitude)}
                className="mt-2 w-full bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Navigation className="w-4 h-4" /> Naviguer vers ce point
              </button>
            )}
          </div>
        )}

        {/* Actions rapides */}
        {activeRoute.status === 'en_cours' && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => { setScanMode(true); setTimeout(() => scanInputRef.current?.focus(), 100); }}
              className="bg-soltex-green text-white rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform shadow">
              <ScanLine className="w-5 h-5" /> Scanner QR
            </button>
            <button onClick={() => setShowTruckFull(true)}
              className="bg-amber-500 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform shadow">
              <Truck className="w-5 h-5" /> Camion plein
            </button>
          </div>
        )}

        {/* Liste des points */}
        <div className="space-y-2">
          {sorted.map((rp, idx) => {
            const point = rp.collectionPoint;
            const cfg = POINT_STATUS[rp.status] || POINT_STATUS.a_collecter;
            const Icon = cfg.icon;
            const isExpanded = expandedPoint === rp.collectionPointId;
            const isNext = nextPt?.collectionPointId === rp.collectionPointId;

            return (
              <div key={rp.collectionPointId || idx}>
                <div
                  className={`bg-white rounded-xl border-2 ${cfg.color} p-4 transition-all ${isNext ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setExpandedPoint(isExpanded ? null : rp.collectionPointId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isNext ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{point?.name || 'Point inconnu'}</p>
                      <p className="text-xs text-gray-500 truncate">{point?.address}, {point?.city}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {point?.nbCav > 1 && <span className="text-xs text-soltex-green font-medium">{point.nbCav} CAV</span>}
                        {point?.qrCode && <span className="text-[10px] text-gray-300 font-mono">{point.qrCode}</span>}
                      </div>
                    </div>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${rp.status === 'collecte' ? 'text-green-500' : rp.status === 'probleme' ? 'text-red-500' : rp.status === 'passe' ? 'text-yellow-500' : 'text-gray-400'}`} />
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {rp.scannedAt && (
                    <p className="text-xs text-gray-400 mt-1 ml-11">
                      {new Date(rp.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {rp.fillLevel != null && ` - Remplissage: ${rp.fillLevel}%`}
                      {rp.notes && ` - ${rp.notes}`}
                    </p>
                  )}
                </div>

                {/* Panneau étendu — actions */}
                {isExpanded && activeRoute.status === 'en_cours' && rp.status === 'a_collecter' && (
                  <div className="bg-gray-50 rounded-b-xl border-x-2 border-b-2 border-gray-200 p-4 -mt-1 space-y-3">
                    {/* Navigation vers ce point */}
                    {point?.latitude && (
                      <button onClick={(e) => { e.stopPropagation(); openNavigation(point.latitude, point.longitude); }}
                        className="w-full bg-blue-50 text-blue-600 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Google Maps
                      </button>
                    )}
                    {/* Remplissage */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Remplissage: {pointFillLevel}%</label>
                      <input type="range" min="0" max="100" step="10" value={pointFillLevel}
                        onChange={e => setPointFillLevel(parseInt(e.target.value))} className="w-full accent-soltex-green" />
                    </div>
                    {/* Notes */}
                    <input type="text" placeholder="Notes (optionnel)" value={pointNotes}
                      onChange={e => setPointNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                    {/* Boutons d'action */}
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleScan(rp.collectionPointId, 'collecte', pointFillLevel, pointNotes)}
                        className="bg-green-500 text-white rounded-lg py-3 text-sm font-semibold active:scale-95 transition-transform flex flex-col items-center gap-1 col-span-2">
                        <CheckCircle className="w-5 h-5" /> Collecté
                      </button>
                      <button onClick={() => { handleScan(rp.collectionPointId, 'passe', undefined, 'Passé'); }}
                        className="bg-yellow-500 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Passer
                      </button>
                      <button onClick={() => { setShowQrIssue(rp.collectionPointId); setQrIssueReason(''); }}
                        className="bg-red-500 text-white rounded-lg py-2.5 text-xs font-semibold active:scale-95 transition-transform flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> QR indisponible
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bouton retour centre de tri */}
        {activeRoute.status === 'en_cours' && (
          <button onClick={() => openNavigation(DEPOT.lat, DEPOT.lng)}
            className="w-full mt-3 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retour au centre de tri
          </button>
        )}

        {/* Barre d'action en bas */}
        {activeRoute.status === 'en_cours' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
            <button onClick={handleFinishRoute}
              className="w-full bg-red-500 text-white rounded-xl py-3 font-semibold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Square className="w-5 h-5" /> Terminer la tournée ({done}/{total})
            </button>
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
                <button onClick={() => handleQrUnavailable(showQrIssue)} disabled={!qrIssueReason}
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
                <div className={`rounded-xl p-4 ${scanResult.error ? 'bg-red-50 text-red-700' : scanResult.notInRoute ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                  {scanResult.error ? <p>{scanResult.error}</p> :
                   scanResult.notInRoute ? <p>Point "{scanResult.name}" trouvé mais pas dans cette tournée</p> :
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
