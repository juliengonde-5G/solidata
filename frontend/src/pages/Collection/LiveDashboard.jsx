import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import { Truck, MapPin, Clock, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEPOT = { lat: 49.5008, lng: 1.0506 };

function truckIcon(color = '#1e40af') {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:16px;">🚛</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16]
  });
}

export default function LiveDashboard() {
  const [liveData, setLiveData] = useState([]);
  const [todayRoutes, setTodayRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchLive = async () => {
    try {
      const [liveRes, dayRes] = await Promise.all([
        api.get('/collection/gps/live'),
        api.get(`/collection/daily-routes/day/${today}`)
      ]);
      setLiveData(liveRes.data);
      setTodayRoutes(dayRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(fetchLive, 30000); // Refresh toutes les 30s
    return () => clearInterval(intervalRef.current);
  }, []);

  const enCours = todayRoutes.filter(r => r.status === 'en_cours');
  const terminees = todayRoutes.filter(r => r.status === 'terminee');
  const planifiees = todayRoutes.filter(r => r.status === 'planifiee');

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement live...</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">Suivi en direct</h1>
          <p className="text-sm text-gray-400">
            {lastRefresh && `Mis à jour à ${lastRefresh.toLocaleTimeString('fr-FR')}`}
            {' — rafraîchi toutes les 30s'}
          </p>
        </div>
        <button onClick={fetchLive} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{todayRoutes.length}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{enCours.length}</div>
          <div className="text-xs text-gray-400">En cours</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{terminees.length}</div>
          <div className="text-xs text-gray-400">Terminées</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-gray-500">{planifiees.length}</div>
          <div className="text-xs text-gray-400">Planifiées</div>
        </div>
      </div>

      <div className="flex-1 flex gap-4">
        {/* Carte */}
        <div className="flex-1 rounded-xl overflow-hidden shadow-sm border">
          <MapContainer center={[DEPOT.lat, DEPOT.lng]} zoom={11} className="h-full w-full" style={{ height: '100%', minHeight: '300px' }}>
            <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Dépôt */}
            <Marker position={[DEPOT.lat, DEPOT.lng]}
              icon={L.divIcon({
                html: `<div style="width:28px;height:28px;border-radius:50%;background:#1e40af;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🏭</div>`,
                className: '', iconSize: [28, 28], iconAnchor: [14, 14]
              })}
            >
              <Popup><strong>Centre de tri — Le Houlme</strong></Popup>
            </Marker>

            {/* Camions en cours */}
            {liveData.filter(r => r.lastPosition).map(route => (
              <Marker
                key={route.id}
                position={[route.lastPosition.latitude, route.lastPosition.longitude]}
                icon={truckIcon()}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{route.vehicle?.name || 'Véhicule'}</strong> — {route.vehicle?.licensePlate}<br/>
                    Chauffeur: {route.driver ? `${route.driver.firstName} ${route.driver.lastName}` : '—'}<br/>
                    {route.lastPosition.speed > 0 && <span>Vitesse: {Math.round(route.lastPosition.speed)} km/h<br/></span>}
                    <span className="text-gray-400">
                      {new Date(route.lastPosition.recordedAt).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Liste tournées */}
        <div className="w-80 bg-white rounded-xl shadow-sm overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Tournées du jour</h3>
          </div>
          <div className="divide-y">
            {todayRoutes.map(route => {
              const live = liveData.find(l => l.id === route.id);
              const pointsDone = route.routePoints?.filter(p => p.status === 'collecte').length || 0;
              const pointsTotal = route.routePoints?.length || 0;
              return (
                <div key={route.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {route.status === 'en_cours' ? (
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      ) : route.status === 'terminee' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="font-medium text-sm">{route.templateRoute?.name || 'Libre'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{route.period === 'matin' ? 'AM' : 'PM'}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {route.vehicle ? `${route.vehicle.name}` : '—'} •
                    {route.driver ? ` ${route.driver.lastName}` : ' —'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-soltex-green rounded-full h-1.5 transition-all"
                        style={{ width: `${pointsTotal > 0 ? (pointsDone / pointsTotal * 100) : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{pointsDone}/{pointsTotal}</span>
                  </div>
                </div>
              );
            })}
            {todayRoutes.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">Aucune tournée aujourd'hui</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
