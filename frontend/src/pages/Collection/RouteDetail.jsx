import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, MapPin, QrCode, ArrowLeft, Trash2, Search } from 'lucide-react';

export default function RouteDetail() {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [allPoints, setAllPoints] = useState([]);

  const fetchRoute = async () => {
    try {
      const { data } = await api.get(`/collection/routes/${id}`);
      setRoute(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoute(); }, [id]);

  const loadAllPoints = async () => {
    const { data } = await api.get('/collection/points?active=true');
    setAllPoints(data);
  };

  const handleAdd = async (pointId) => {
    try {
      const maxOrder = Math.max(0, ...(route.points || []).map(p => p.sortOrder || 0));
      await api.post(`/collection/routes/${id}/points`, {
        collectionPointId: pointId,
        sortOrder: maxOrder + 1
      });
      fetchRoute();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleRemove = async (pointId) => {
    if (!confirm('Retirer ce point de la tournée ?')) return;
    try {
      await api.delete(`/collection/routes/${id}/points/${pointId}`);
      fetchRoute();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!route) return <div className="text-center py-12 text-gray-500">Tournée non trouvée</div>;

  const pointIds = new Set((route.points || []).map(p => p.id));
  const filteredAvailable = allPoints.filter(p =>
    !pointIds.has(p.id) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/collecte/tournees" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">{route.name}</h1>
          <p className="text-sm text-gray-400">{route.sector || '—'} — {route.dayOfWeek || 'Flexible'} — {route.points?.length || 0} points</p>
        </div>
      </div>

      <button onClick={() => { setShowAdd(!showAdd); if (!showAdd) loadAllPoints(); }}
        className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90 mb-4">
        <Plus className="w-4 h-4" /> Ajouter un CAV
      </button>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher un CAV..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y">
            {filteredAvailable.slice(0, 30).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.city} — {p.nbCav} CAV</span>
                </div>
                <button onClick={() => handleAdd(p.id)} className="text-soltex-green hover:text-soltex-green/80 text-xs font-medium">+ Ajouter</button>
              </div>
            ))}
            {filteredAvailable.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucun CAV disponible</p>}
          </div>
        </div>
      )}

      {/* Liste des points de la tournée */}
      <div className="space-y-2">
        {route.points?.map((p, i) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-8 h-8 bg-soltex-green/10 rounded-full flex items-center justify-center text-soltex-green font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-700 text-sm">{p.name}</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{p.nbCav || 1} CAV</span>
                {p.avgFillRate && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{p.avgFillRate}%</span>}
              </div>
              <p className="text-xs text-gray-500">{p.address} {p.addressComplement ? `(${p.addressComplement})` : ''}, {p.postalCode} {p.city}</p>
            </div>
            <button onClick={() => handleRemove(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {(!route.points || route.points.length === 0) && <p className="text-center text-gray-400 py-8">Aucun point de collecte</p>}
      </div>
    </div>
  );
}
