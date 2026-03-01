import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import {
  Truck, MapPin, CheckCircle, AlertCircle, Play, Square,
  ChevronRight, Navigation, Package, Clock, ScanLine, X,
  ChevronDown, ChevronUp
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

  const today = new Date().toISOString().slice(0, 10);

  // Charger les tournées du jour (filtrées pour le chauffeur connecté)
  const fetchRoutes = async () => {
    try {
      const { data } = await api.get(`/collection/daily-routes/day/${today}`);
      // Filtrer : montrer les tournées assignées au chauffeur connecté, ou toutes si admin/manager
      const isManager = user && ['admin', 'manager', 'rh'].includes(user.role);
      const myRoutes = isManager ? data : data.filter(r =>
        !r.driverId || r.driverId === user?.employeeId || r.driver?.id === user?.employeeId
      );
      setRoutes(myRoutes);
      // Si une tournée est en cours, la sélectionner automatiquement
      const enCours = myRoutes.find(r => r.status === 'en_cours');
      if (enCours) {
        loadRouteDetail(enCours.id);
      }
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
        // Envoyer la position au serveur si une tournée est active
        if (activeRoute?.status === 'en_cours') {
          api.post('/collection/gps', {
            dailyRouteId: activeRoute.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            speed: pos.coords.speed
          }).catch(() => {});
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
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

  // Démarrer une tournée
  const handleStartRoute = async (routeId) => {
    try {
      await api.put(`/collection/daily-routes/${routeId}/start`);
      await loadRouteDetail(routeId);
      startGPS();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // Terminer une tournée
  const handleFinishRoute = async () => {
    if (!activeRoute) return;
    const done = routePoints.filter(p => p.status === 'collecte').length;
    const total = routePoints.length;
    if (!confirm(`Terminer la tournée ? (${done}/${total} points collectés)`)) return;
    try {
      await api.put(`/collection/daily-routes/${activeRoute.id}/finish`);
      stopGPS();
      setActiveRoute(null);
      setRoutePoints([]);
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // Scanner / sélectionner un point
  const handleScan = async (pointId, status = 'collecte', fillLevel, notes) => {
    if (!activeRoute) return;
    try {
      const body = { status };
      if (fillLevel !== undefined) body.fillLevel = fillLevel;
      if (notes) body.notes = notes;
      if (currentPos) {
        body.latitude = currentPos.latitude;
        body.longitude = currentPos.longitude;
      }
      await api.put(`/collection/daily-routes/${activeRoute.id}/scan/${pointId}`, body);
      await loadRouteDetail(activeRoute.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // Scan par QR code
  const handleQRScan = async () => {
    if (!scanInput.trim()) return;
    try {
      const { data } = await api.get(`/collection/points/scan/${scanInput.trim()}`);
      setScanResult(data);
      // Vérifier si ce point est dans la tournée active
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

  // Vue détaillée d'un point
  const [expandedPoint, setExpandedPoint] = useState(null);
  const [pointFillLevel, setPointFillLevel] = useState(50);
  const [pointNotes, setPointNotes] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  // Vue active route (tournée en cours)
  if (activeRoute) {
    const done = routePoints.filter(p => p.status === 'collecte').length;
    const skipped = routePoints.filter(p => p.status === 'passe' || p.status === 'probleme').length;
    const total = routePoints.length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div className="max-w-lg mx-auto pb-24">
        {/* Header tournée */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
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
              <div
                className="bg-soltex-green h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* GPS status */}
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

        {/* Bouton scan QR */}
        {activeRoute.status === 'en_cours' && (
          <button
            onClick={() => { setScanMode(true); setTimeout(() => scanInputRef.current?.focus(), 100); }}
            className="w-full bg-soltex-green text-white rounded-2xl p-4 mb-4 flex items-center justify-center gap-3 text-lg font-semibold active:scale-95 transition-transform shadow-lg"
          >
            <ScanLine className="w-6 h-6" />
            Scanner un QR code
          </button>
        )}

        {/* Liste des points */}
        <div className="space-y-2">
          {routePoints
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((rp, idx) => {
              const point = rp.collectionPoint;
              const cfg = POINT_STATUS[rp.status] || POINT_STATUS.a_collecter;
              const Icon = cfg.icon;
              const isExpanded = expandedPoint === rp.collectionPointId;

              return (
                <div key={rp.collectionPointId || idx}>
                  <div
                    className={`bg-white rounded-xl border-2 ${cfg.color} p-4 transition-all`}
                    onClick={() => setExpandedPoint(isExpanded ? null : rp.collectionPointId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{point?.name || 'Point inconnu'}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {point?.address}, {point?.city}
                        </p>
                        {point?.nbCav > 1 && (
                          <span className="text-xs text-soltex-green font-medium">{point.nbCav} CAV</span>
                        )}
                      </div>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${rp.status === 'collecte' ? 'text-green-500' : rp.status === 'probleme' ? 'text-red-500' : rp.status === 'passe' ? 'text-yellow-500' : 'text-gray-400'}`} />
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>

                    {rp.scannedAt && (
                      <p className="text-xs text-gray-400 mt-1 ml-11">
                        {new Date(rp.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {rp.fillLevel != null && ` - Remplissage: ${rp.fillLevel}%`}
                      </p>
                    )}
                  </div>

                  {/* Panneau étendu — actions */}
                  {isExpanded && activeRoute.status === 'en_cours' && rp.status === 'a_collecter' && (
                    <div className="bg-gray-50 rounded-b-xl border-x-2 border-b-2 border-gray-200 p-4 -mt-1 space-y-3">
                      {/* Taux de remplissage */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Remplissage: {pointFillLevel}%</label>
                        <input
                          type="range" min="0" max="100" step="10"
                          value={pointFillLevel}
                          onChange={e => setPointFillLevel(parseInt(e.target.value))}
                          className="w-full accent-soltex-green"
                        />
                      </div>
                      {/* Notes */}
                      <input
                        type="text" placeholder="Notes (optionnel)"
                        value={pointNotes}
                        onChange={e => setPointNotes(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                      {/* Boutons d'action */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => { handleScan(rp.collectionPointId, 'collecte', pointFillLevel, pointNotes); setExpandedPoint(null); setPointFillLevel(50); setPointNotes(''); }}
                          className="bg-green-500 text-white rounded-lg py-3 text-sm font-semibold active:scale-95 transition-transform flex flex-col items-center gap-1"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Collecté
                        </button>
                        <button
                          onClick={() => { handleScan(rp.collectionPointId, 'passe'); setExpandedPoint(null); }}
                          className="bg-yellow-500 text-white rounded-lg py-3 text-sm font-semibold active:scale-95 transition-transform flex flex-col items-center gap-1"
                        >
                          <AlertCircle className="w-5 h-5" />
                          Passé
                        </button>
                        <button
                          onClick={() => { handleScan(rp.collectionPointId, 'probleme', undefined, pointNotes || 'Accès impossible'); setExpandedPoint(null); setPointNotes(''); }}
                          className="bg-red-500 text-white rounded-lg py-3 text-sm font-semibold active:scale-95 transition-transform flex flex-col items-center gap-1"
                        >
                          <AlertCircle className="w-5 h-5" />
                          Problème
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Barre d'action en bas */}
        {activeRoute.status === 'en_cours' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
            <button
              onClick={handleFinishRoute}
              className="w-full bg-red-500 text-white rounded-xl py-3 font-semibold text-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Terminer la tournée ({done}/{total})
            </button>
          </div>
        )}

        {/* Modal scan QR */}
        {scanMode && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
            <div className="bg-white rounded-t-3xl w-full p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Scanner un QR code</h3>
                <button onClick={() => { setScanMode(false); setScanResult(null); setScanInput(''); }}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Saisissez ou scannez le code QR du point de collecte (format ST-XXXXXXXX)
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  ref={scanInputRef}
                  type="text"
                  placeholder="ST-XXXXXXXX"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleQRScan()}
                  className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-lg font-mono focus:border-soltex-green focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleQRScan}
                  className="bg-soltex-green text-white rounded-xl px-6 py-3 font-semibold active:scale-95 transition-transform"
                >
                  OK
                </button>
              </div>
              {scanResult && (
                <div className={`rounded-xl p-4 ${scanResult.error ? 'bg-red-50 text-red-700' : scanResult.notInRoute ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                  {scanResult.error ? (
                    <p>{scanResult.error}</p>
                  ) : scanResult.notInRoute ? (
                    <p>Point "{scanResult.name}" trouvé mais pas dans cette tournée</p>
                  ) : (
                    <p>Point "{scanResult.name}" scanné avec succès</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vue liste des tournées du jour
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
          <button
            onClick={() => loadRouteDetail(r.id)}
            className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            Reprendre
          </button>
        </div>
      ))}

      {/* Planifiées */}
      {planifiees.map(r => (
        <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-800">{r.templateRoute?.name || 'Tournée'}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.routePoints?.length || '?'} points</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.period === 'matin' ? 'Matin' : 'Après-midi'}</span>
              </div>
            </div>
            {r.vehicle && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{r.vehicle.name}</span>
            )}
          </div>
          <button
            onClick={() => handleStartRoute(r.id)}
            className="w-full bg-soltex-green text-white rounded-xl py-3 font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Démarrer la tournée
          </button>
        </div>
      ))}

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
