import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, MapPin, QrCode, ArrowLeft, Trash2 } from 'lucide-react';

const POINT_TYPES = {
  cav: { label: 'CAV', color: 'bg-blue-100 text-blue-700' },
  decheterie: { label: 'Déchèterie', color: 'bg-orange-100 text-orange-700' },
  partenaire: { label: 'Partenaire', color: 'bg-green-100 text-green-700' },
  evenement: { label: 'Événement', color: 'bg-purple-100 text-purple-700' },
  boite_a_dons: { label: 'Boîte à dons', color: 'bg-pink-100 text-pink-700' }
};

export default function RouteDetail() {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'cav', address: '', city: '', postalCode: '',
    contactName: '', contactPhone: '', sortOrder: 0
  });

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

  const addPoint = async (e) => {
    e.preventDefault();
    try {
      await api.post('/collection/points', { ...form, routeId: id });
      setShowForm(false);
      setForm({ name: '', type: 'cav', address: '', city: '', postalCode: '', contactName: '', contactPhone: '', sortOrder: 0 });
      fetchRoute();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const deletePoint = async (pointId) => {
    if (!confirm('Supprimer ce point de collecte ?')) return;
    try {
      await api.delete(`/collection/points/${pointId}`);
      fetchRoute();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!route) return <div className="text-center py-12 text-gray-500">Tournée non trouvée</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/collecte/tournees" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">{route.name}</h1>
          <p className="text-sm text-gray-400">{route.sector} - {route.points?.length || 0} points de collecte</p>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90 mb-4">
        <Plus className="w-4 h-4" /> Ajouter un point
      </button>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nouveau point de collecte</h2>
          <form onSubmit={addPoint} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nom du point" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded-lg px-3 py-2" />
            <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="border rounded-lg px-3 py-2">
              {Object.entries(POINT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input required placeholder="Adresse" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="border rounded-lg px-3 py-2 col-span-full" />
            <input required placeholder="Ville" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Code postal" maxLength={5} value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Contact (nom)" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Contact (tél)" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} className="border rounded-lg px-3 py-2" />
            <div>
              <label className="text-xs text-gray-500">Ordre de passage</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-soltex-green text-white px-6 py-2 rounded-lg">Ajouter</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des points */}
      <div className="space-y-3">
        {route.points?.map((p, i) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <div className="w-8 h-8 bg-soltex-green/10 rounded-full flex items-center justify-center text-soltex-green font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-700">{p.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${POINT_TYPES[p.type]?.color}`}>{POINT_TYPES[p.type]?.label}</span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.address}, {p.postalCode} {p.city}</p>
              {p.contactName && <p className="text-xs text-gray-400">{p.contactName} - {p.contactPhone}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <QrCode className="w-5 h-5 text-gray-400 mx-auto" />
                <span className="text-xs text-gray-400 block mt-1">{p.qrCode}</span>
              </div>
              <button onClick={() => deletePoint(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {(!route.points || route.points.length === 0) && <p className="text-center text-gray-400 py-8">Aucun point de collecte</p>}
      </div>
    </div>
  );
}
