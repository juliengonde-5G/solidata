import { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import { MapPin, Filter, Search, Layers, Navigation } from 'lucide-react';

// Leaflet CSS loaded via CDN in index.html
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const FILL_COLORS = {
  high: '#ef4444',   // > 70%
  medium: '#f59e0b', // 40-70%
  low: '#22c55e',    // < 40%
  none: '#94a3b8',   // pas de données
};

function createFillIcon(fillRate) {
  const color = !fillRate ? FILL_COLORS.none :
    fillRate >= 70 ? FILL_COLORS.high :
    fillRate >= 40 ? FILL_COLORS.medium : FILL_COLORS.low;

  return L.divIcon({
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;
      background: ${color}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: bold; color: white;
    ">${fillRate ? fillRate + '%' : ''}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

// Dépôt Le Houlme
const DEPOT = { lat: 49.5008, lng: 1.0506 };

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = points.filter(p => p.latitude && p.longitude)
        .map(p => [p.latitude, p.longitude]);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

export default function MapCAV() {
  const [points, setPoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, high, stale
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/collection/points?active=true'),
      api.get('/collection/routes?active=true'),
      api.get('/collection/points/stats')
    ]).then(([pRes, rRes, sRes]) => {
      setPoints(pRes.data);
      setRoutes(rRes.data);
      setStats(sRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredPoints = points.filter(p => {
    if (!p.latitude || !p.longitude) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'high' && (p.avgFillRate || 0) < 70) return false;
    if (filter === 'stale') {
      if (!p.lastCollectionDate) return true;
      const days = Math.floor((new Date() - new Date(p.lastCollectionDate)) / 86400000);
      return days > 7;
    }
    if (selectedRoute) {
      return p.routes?.some(r => r.id === selectedRoute);
    }
    return true;
  });

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement carte...</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-soltex-gray-dark">Carte des CAV</h1>
          {stats && (
            <span className="text-sm text-gray-500">
              {stats.totalPoints} points ({stats.totalCav} CAV) — {stats.withGps} géolocalisés
            </span>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Rechercher un CAV, une ville..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Toutes les tournées</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.points?.length || 0} pts)</option>
          ))}
        </select>
        <div className="flex gap-1">
          {[
            { val: 'all', label: 'Tous' },
            { val: 'high', label: 'Remplis > 70%' },
            { val: 'stale', label: 'Non collectés > 7j' },
          ].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.val ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{f.label}</button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filteredPoints.length} affichés</span>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border">
        <MapContainer
          center={[DEPOT.lat, DEPOT.lng]}
          zoom={11}
          className="h-full w-full"
          style={{ height: '100%', minHeight: '400px' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={filteredPoints} />

          {/* Dépôt */}
          <Marker position={[DEPOT.lat, DEPOT.lng]}
            icon={L.divIcon({
              html: `<div style="width:30px;height:30px;border-radius:50%;background:#1e40af;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🏭</div>`,
              className: '', iconSize: [30, 30], iconAnchor: [15, 15]
            })}
          >
            <Popup><strong>Centre de tri — Le Houlme</strong><br/>76770</Popup>
          </Marker>

          {filteredPoints.map(p => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={createFillIcon(p.avgFillRate)}
              eventHandlers={{ click: () => setSelected(p) }}
            >
              <Popup>
                <div className="text-xs max-w-[250px]">
                  <strong>{p.name}</strong><br/>
                  {p.address && <><span className="text-gray-500">{p.address}</span><br/></>}
                  <span className="text-gray-500">{p.postalCode} {p.city}</span><br/>
                  <div className="mt-1 flex gap-2">
                    <span className="font-medium">{p.nbCav} CAV</span>
                    {p.avgFillRate && <span>Rempli: {p.avgFillRate}%</span>}
                    <span>Freq: {p.frequence}x/sem</span>
                  </div>
                  {p.lastCollectionDate && (
                    <div className="mt-1 text-gray-400">
                      Dernière collecte: {new Date(p.lastCollectionDate).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  {p.routes?.length > 0 && (
                    <div className="mt-1">
                      Tournées: {p.routes.map(r => r.name).join(', ')}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: FILL_COLORS.high }} /> &gt;70%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: FILL_COLORS.medium }} /> 40-70%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: FILL_COLORS.low }} /> &lt;40%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ background: FILL_COLORS.none }} /> Pas de données
        </span>
      </div>
    </div>
  );
}
