import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Weight, Package, Calendar, Truck, MapPin, Edit2, X } from 'lucide-react';

export default function Collections() {
  const [weightRecords, setWeightRecords] = useState([]);
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tonnages'); // tonnages, regularisations, historique
  const [filterRoute, setFilterRoute] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = now.toISOString().slice(0, 10);
    return { startDate: start, endDate: end };
  });

  // Regularisation form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    categorie: '', poidsNet: '', origine: 'Collecte de CAV', notes: '',
    weighedAt: new Date().toISOString().slice(0, 10)
  });

  const fetchData = async () => {
    try {
      const [wrRes, colRes, routesRes, statsRes] = await Promise.all([
        api.get('/collection/weight-records', { params: { ...dateRange, origine: filterRoute || undefined } }),
        api.get('/collection/collections', { params: dateRange }),
        api.get('/collection/routes'),
        api.get('/collection/collections/stats', { params: dateRange })
      ]);
      setWeightRecords(wrRes.data || []);
      setCollections(colRes.data || []);
      setRoutes(routesRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); fetchData(); }, [dateRange.startDate, dateRange.endDate, filterRoute]);

  // Grouper les tonnages par tournée
  const groupedByRoute = {};
  weightRecords.forEach(wr => {
    const key = wr.categorie || 'Autre';
    if (!groupedByRoute[key]) groupedByRoute[key] = { records: [], total: 0 };
    groupedByRoute[key].records.push(wr);
    groupedByRoute[key].total += wr.poidsNet || 0;
  });

  const totalWeight = weightRecords.reduce((s, r) => s + (r.poidsNet || 0), 0);

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/collection/weight-records', {
        ...regForm,
        poidsNet: parseInt(regForm.poidsNet),
        weighedAt: regForm.weighedAt,
        mois: new Date(regForm.weighedAt).getMonth() + 1,
        annee: new Date(regForm.weighedAt).getFullYear()
      });
      setShowRegForm(false);
      setRegForm({ categorie: '', poidsNet: '', origine: 'Collecte de CAV', notes: '', weighedAt: new Date().toISOString().slice(0, 10) });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Tonnages & Historique</h1>
        <button onClick={() => setShowRegForm(true)} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Régularisation
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Weight className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Poids total</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{(totalWeight / 1000).toFixed(2)} t</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Pesées</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{weightRecords.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-500">Tournées</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{Object.keys(groupedByRoute).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Weight className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">Moy/pesée</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{weightRecords.length > 0 ? Math.round(totalWeight / weightRecords.length) : 0} kg</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <label className="text-sm text-gray-500">Du</label>
        <input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" />
        <label className="text-sm text-gray-500">au</label>
        <input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} className="border rounded-lg px-3 py-1.5 text-sm" />
        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">Toutes les origines</option>
          <option value="Collecte de CAV">Collecte de CAV</option>
          <option value="Apport Volontaire">Apport Volontaire</option>
          <option value="Tournée">Tournée</option>
          <option value="Recyclage">Recyclage</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { val: 'tonnages', label: 'Par tournée' },
          { val: 'historique', label: 'Détail chronologique' },
        ].map(t => (
          <button key={t.val} onClick={() => setActiveTab(t.val)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.val ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Vue par tournée */}
      {activeTab === 'tonnages' && (
        <div className="space-y-3">
          {Object.entries(groupedByRoute)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([routeName, data]) => (
              <div key={routeName} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-soltex-green" />
                    <span className="font-semibold text-sm text-gray-800">{routeName}</span>
                    <span className="text-xs text-gray-400">{data.records.length} pesées</span>
                  </div>
                  <span className="font-bold text-soltex-green">{(data.total / 1000).toFixed(2)} t</span>
                </div>
                <div className="divide-y max-h-48 overflow-y-auto">
                  {data.records.slice(0, 10).map(r => (
                    <div key={r.id} className="px-4 py-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500">{r.weighedAt ? new Date(r.weighedAt).toLocaleDateString('fr-FR') : '-'}</span>
                      <span className="font-medium">{r.poidsNet} kg</span>
                      <span className="text-xs text-gray-400">{r.origine}</span>
                    </div>
                  ))}
                  {data.records.length > 10 && (
                    <div className="px-4 py-2 text-xs text-gray-400 text-center">
                      +{data.records.length - 10} pesées supplémentaires
                    </div>
                  )}
                </div>
              </div>
            ))}
          {Object.keys(groupedByRoute).length === 0 && (
            <div className="text-center py-8 text-gray-400">Aucune donnée de tonnage sur cette période</div>
          )}
        </div>
      )}

      {/* Vue chronologique */}
      {activeTab === 'historique' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-600">Date</th>
                <th className="text-left p-3 font-semibold text-gray-600">Origine</th>
                <th className="text-left p-3 font-semibold text-gray-600">Catégorie</th>
                <th className="text-right p-3 font-semibold text-gray-600">Poids net</th>
                <th className="text-right p-3 font-semibold text-gray-600">Tare</th>
                <th className="text-right p-3 font-semibold text-gray-600">Poids brut</th>
              </tr>
            </thead>
            <tbody>
              {weightRecords.slice(0, 100).map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-600">{r.weighedAt ? new Date(r.weighedAt).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="p-3 text-gray-600">{r.origine || '-'}</td>
                  <td className="p-3 text-gray-700 font-medium">{r.categorie || '-'}</td>
                  <td className="p-3 text-right font-semibold">{r.poidsNet ? `${r.poidsNet} kg` : '-'}</td>
                  <td className="p-3 text-right text-gray-500">{r.tare ? `${r.tare} kg` : '-'}</td>
                  <td className="p-3 text-right text-gray-500">{r.poidsBrut ? `${r.poidsBrut} kg` : '-'}</td>
                </tr>
              ))}
              {weightRecords.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun enregistrement</td></tr>
              )}
              {weightRecords.length > 100 && (
                <tr><td colSpan={6} className="text-center py-4 text-xs text-gray-400">Affichage limité aux 100 premiers enregistrements</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulaire régularisation */}
      {showRegForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRegForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Régularisation de tonnage</h2>
              <button onClick={() => setShowRegForm(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRegSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Origine</label>
                <select value={regForm.origine} onChange={e => setRegForm({...regForm, origine: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  <option value="Collecte de CAV">Collecte de CAV</option>
                  <option value="Apport Volontaire">Apport Volontaire</option>
                  <option value="Tournée">Tournée</option>
                  <option value="Recyclage">Recyclage</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Catégorie / Tournée</label>
                <input type="text" value={regForm.categorie} onChange={e => setRegForm({...regForm, categorie: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: Barentin 1, Apport Volontaire..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Poids net (kg)</label>
                <input type="number" value={regForm.poidsNet} onChange={e => setRegForm({...regForm, poidsNet: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Date</label>
                <input type="date" value={regForm.weighedAt} onChange={e => setRegForm({...regForm, weighedAt: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Notes</label>
                <textarea value={regForm.notes} onChange={e => setRegForm({...regForm, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} placeholder="Motif de la régularisation..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRegForm(false)} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-soltex-green text-white rounded-lg text-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
