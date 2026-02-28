import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Truck, Wrench } from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'camion_20m3', label: 'Camion 20m3', capacity: 20 },
  { value: 'camion_12m3', label: 'Camion 12m3', capacity: 12 },
  { value: 'utilitaire', label: 'Utilitaire', capacity: 6 },
  { value: 'voiture', label: 'Voiture', capacity: 1 }
];

const STATUS_CONFIG = {
  disponible: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
  en_tournee: { label: 'En tournée', color: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
  hors_service: { label: 'Hors service', color: 'bg-red-100 text-red-700' }
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', licensePlate: '', type: 'camion_20m3', capacity: 20,
    status: 'disponible', mileage: 0, lastMaintenanceDate: '', nextMaintenanceDate: ''
  });

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/team/vehicles');
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/team/vehicles/${editing}`, form);
      } else {
        await api.post('/team/vehicles', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', licensePlate: '', type: 'camion_20m3', capacity: 20, status: 'disponible', mileage: 0, lastMaintenanceDate: '', nextMaintenanceDate: '' });
      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const startEdit = (v) => {
    setForm({
      name: v.name, licensePlate: v.licensePlate, type: v.type, capacity: v.capacity || 0,
      status: v.status, mileage: v.mileage || 0,
      lastMaintenanceDate: v.lastMaintenanceDate || '', nextMaintenanceDate: v.nextMaintenanceDate || ''
    });
    setEditing(v.id);
    setShowForm(true);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Véhicules</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Modifier' : 'Nouveau véhicule'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nom (ex: Camion 1)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input required placeholder="Immatriculation" value={form.licensePlate} onChange={e => setForm({...form, licensePlate: e.target.value.toUpperCase()})} className="border rounded-lg px-3 py-2" />
            <select required value={form.type} onChange={e => { const vt = VEHICLE_TYPES.find(v => v.value === e.target.value); setForm({...form, type: e.target.value, capacity: vt?.capacity || 0}); }} className="border rounded-lg px-3 py-2">
              {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border rounded-lg px-3 py-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500">Kilométrage</label>
              <input type="number" value={form.mileage} onChange={e => setForm({...form, mileage: parseInt(e.target.value) || 0})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Capacité (m3)</label>
              <input type="number" step="0.1" value={form.capacity} onChange={e => setForm({...form, capacity: parseFloat(e.target.value) || 0})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Dernier entretien</label>
              <input type="date" value={form.lastMaintenanceDate} onChange={e => setForm({...form, lastMaintenanceDate: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Prochain entretien</label>
              <input type="date" value={form.nextMaintenanceDate} onChange={e => setForm({...form, nextMaintenanceDate: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-soltex-green text-white px-6 py-2 rounded-lg">{editing ? 'Modifier' : 'Ajouter'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => startEdit(v)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-soltex-green" />
                <h3 className="font-semibold text-gray-700">{v.name}</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[v.status]?.color}`}>
                {STATUS_CONFIG[v.status]?.label}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-500">
              <p><span className="font-medium">{v.licensePlate}</span> - {VEHICLE_TYPES.find(vt => vt.value === v.type)?.label}</p>
              <p>{v.capacity} m3 - {(v.mileage || 0).toLocaleString()} km</p>
              {v.nextMaintenanceDate && (
                <p className="flex items-center gap-1 text-xs">
                  <Wrench className="w-3 h-3" /> Entretien : {new Date(v.nextMaintenanceDate).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        ))}
        {vehicles.length === 0 && <p className="text-center text-gray-400 py-8 col-span-full">Aucun véhicule</p>}
      </div>
    </div>
  );
}
