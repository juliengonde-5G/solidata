import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, MapPin, Clock, Route as RouteIcon } from 'lucide-react';

const DAYS = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi'
};

const VEHICLE_TYPES = {
  camion_20m3: 'Camion 20m3', camion_12m3: 'Camion 12m3',
  utilitaire: 'Utilitaire', voiture: 'Voiture'
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', sector: '', dayOfWeek: 'lundi', estimatedDuration: 0,
    estimatedDistance: 0, vehicleType: 'camion_20m3', notes: ''
  });

  const fetchRoutes = async () => {
    try {
      const { data } = await api.get('/collection/routes');
      setRoutes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/collection/routes/${editing}`, form);
      } else {
        await api.post('/collection/routes', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', sector: '', dayOfWeek: 'lundi', estimatedDuration: 0, estimatedDistance: 0, vehicleType: 'camion_20m3', notes: '' });
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const startEdit = (r) => {
    setForm({
      name: r.name, sector: r.sector, dayOfWeek: r.dayOfWeek,
      estimatedDuration: r.estimatedDuration || 0, estimatedDistance: r.estimatedDistance || 0,
      vehicleType: r.vehicleType, notes: r.notes || ''
    });
    setEditing(r.id);
    setShowForm(true);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Tournées</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Nouvelle tournée
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Modifier' : 'Nouvelle tournée'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nom de la tournée" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input required placeholder="Secteur (ex: Bordeaux Nord)" value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="border rounded-lg px-3 py-2" />
            <select required value={form.dayOfWeek} onChange={e => setForm({...form, dayOfWeek: e.target.value})} className="border rounded-lg px-3 py-2">
              {Object.entries(DAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})} className="border rounded-lg px-3 py-2">
              {Object.entries(VEHICLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500">Durée estimée (min)</label>
              <input type="number" value={form.estimatedDuration} onChange={e => setForm({...form, estimatedDuration: parseInt(e.target.value) || 0})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Distance estimée (km)</label>
              <input type="number" step="0.1" value={form.estimatedDistance} onChange={e => setForm({...form, estimatedDistance: parseFloat(e.target.value) || 0})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border rounded-lg px-3 py-2 col-span-full" rows={2} />
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-soltex-green text-white px-6 py-2 rounded-lg">{editing ? 'Modifier' : 'Créer'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Grille par jour */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map(r => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => startEdit(r)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RouteIcon className="w-5 h-5 text-soltex-green" />
                <h3 className="font-semibold text-gray-700">{r.name}</h3>
              </div>
              <span className="text-xs bg-soltex-green/10 text-soltex-green px-2 py-0.5 rounded-full">{DAYS[r.dayOfWeek]}</span>
            </div>
            <div className="space-y-1 text-sm text-gray-500">
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.sector}</p>
              <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.estimatedDuration} min - {r.estimatedDistance} km</p>
              <p>{VEHICLE_TYPES[r.vehicleType]} - {r.points?.length || 0} points</p>
            </div>
            <Link to={`/collecte/tournee/${r.id}`} onClick={e => e.stopPropagation()} className="text-xs text-soltex-green hover:underline mt-2 inline-block">
              Voir les points de collecte
            </Link>
          </div>
        ))}
        {routes.length === 0 && <p className="text-center text-gray-400 py-8 col-span-full">Aucune tournée</p>}
      </div>
    </div>
  );
}
