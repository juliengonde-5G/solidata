import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Weight, Package, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  planifiee: { label: 'Planifiée', color: 'bg-gray-100 text-gray-700' },
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  terminee: { label: 'Terminée', color: 'bg-green-100 text-green-700' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700' }
};

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    return { startDate: start, endDate: end };
  });
  const [form, setForm] = useState({
    routeId: '', collectionPointId: '', collectionDate: new Date().toISOString().slice(0, 10),
    weightKg: '', bagsCount: '', status: 'terminee', notes: ''
  });

  const fetchData = async () => {
    try {
      const [colRes, statsRes, routesRes] = await Promise.all([
        api.get('/collection/collections', { params: dateRange }),
        api.get('/collection/collections/stats', { params: dateRange }),
        api.get('/collection/routes')
      ]);
      setCollections(colRes.data);
      setStats(statsRes.data);
      setRoutes(routesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateRange.startDate, dateRange.endDate]);

  const onRouteChange = async (routeId) => {
    setForm({ ...form, routeId, collectionPointId: '' });
    if (routeId) {
      try {
        const { data } = await api.get('/collection/points', { params: { routeId } });
        setPoints(data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPoints([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/collection/collections', {
        ...form,
        weightKg: parseFloat(form.weightKg) || 0,
        bagsCount: parseInt(form.bagsCount) || 0
      });
      setShowForm(false);
      setForm({ routeId: '', collectionPointId: '', collectionDate: new Date().toISOString().slice(0, 10), weightKg: '', bagsCount: '', status: 'terminee', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Collectes</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Saisir une collecte
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-500">Collectes</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalCollections}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Weight className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">Poids total</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{(stats.totalWeightKg / 1000).toFixed(2)} t</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-500">Sacs/bacs</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalBags}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Weight className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-500">Moy/collecte</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.avgWeightPerCollection} kg</p>
          </div>
        </div>
      )}

      {/* Filtre dates */}
      <div className="flex gap-3 mb-4 items-center">
        <label className="text-sm text-gray-500">Du</label>
        <input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" />
        <label className="text-sm text-gray-500">au</label>
        <input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" />
      </div>

      {/* Formulaire saisie */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Saisir une collecte</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select required value={form.routeId} onChange={e => onRouteChange(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="">Tournée...</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.sector})</option>)}
            </select>
            <select required value={form.collectionPointId} onChange={e => setForm({...form, collectionPointId: e.target.value})} className="border rounded-lg px-3 py-2">
              <option value="">Point de collecte...</option>
              {points.map(p => <option key={p.id} value={p.id}>{p.name} - {p.city}</option>)}
            </select>
            <input required type="date" value={form.collectionDate} onChange={e => setForm({...form, collectionDate: e.target.value})} className="border rounded-lg px-3 py-2" />
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border rounded-lg px-3 py-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500">Poids (kg)</label>
              <input type="number" step="0.1" placeholder="0" value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Nombre de sacs/bacs</label>
              <input type="number" placeholder="0" value={form.bagsCount} onChange={e => setForm({...form, bagsCount: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border rounded-lg px-3 py-2 col-span-full" rows={2} />
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-soltex-green text-white px-6 py-2 rounded-lg">Enregistrer</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Date</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Tournée</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Point</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Collecteur</th>
              <th className="text-right p-3 text-sm font-semibold text-gray-600">Poids</th>
              <th className="text-right p-3 text-sm font-semibold text-gray-600">Sacs</th>
              <th className="text-center p-3 text-sm font-semibold text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {collections.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-600">{new Date(c.collectionDate).toLocaleDateString('fr-FR')}</td>
                <td className="p-3 text-sm text-gray-600">{c.route?.name || '-'}</td>
                <td className="p-3 text-sm text-gray-600">{c.collectionPoint?.name || '-'}</td>
                <td className="p-3 text-sm text-gray-600">{c.employee ? `${c.employee.firstName} ${c.employee.lastName[0]}.` : '-'}</td>
                <td className="p-3 text-sm text-gray-600 text-right">{c.weightKg ? `${c.weightKg} kg` : '-'}</td>
                <td className="p-3 text-sm text-gray-600 text-right">{c.bagsCount || '-'}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[c.status]?.color}`}>{STATUS_CONFIG[c.status]?.label}</span>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune collecte sur cette période</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
