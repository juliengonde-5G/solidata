import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Pencil, Trash2, Shield, Wrench, Car } from 'lucide-react';

const GROUPS = ['Tri', 'Logistique', 'Collecte', 'Boutique', 'Autre'];

export default function WorkStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', group: 'Tri', mandatory: false, reqCaces: false, reqPermis: false });

  const fetchStations = async () => {
    try {
      const res = await api.get('/team/workstations');
      setStations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/team/workstations/${editing}`, form);
      } else {
        await api.post('/team/workstations', form);
      }
      setForm({ name: '', group: 'Tri', mandatory: false, reqCaces: false, reqPermis: false });
      setEditing(null);
      fetchStations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, group: s.group, mandatory: s.mandatory, reqCaces: s.reqCaces, reqPermis: s.reqPermis });
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce poste ?')) return;
    try {
      await api.delete(`/team/workstations/${id}`);
      fetchStations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  // Grouper
  const groups = {};
  stations.forEach(s => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Postes de travail</h1>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">{editing ? 'Modifier le poste' : 'Nouveau poste'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-soltex-green" required placeholder="Ex: Opérateur tri R3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groupe</label>
            <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-soltex-green">
              {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.mandatory} onChange={e => setForm({ ...form, mandatory: e.target.checked })}
                className="w-4 h-4 accent-soltex-green" />
              Obligatoire
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.reqCaces} onChange={e => setForm({ ...form, reqCaces: e.target.checked })}
                className="w-4 h-4 accent-soltex-green" />
              CACES
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.reqPermis} onChange={e => setForm({ ...form, reqPermis: e.target.checked })}
                className="w-4 h-4 accent-soltex-green" />
              Permis B
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit" className="bg-soltex-green hover:bg-soltex-green-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> {editing ? 'Modifier' : 'Ajouter'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm({ name: '', group: 'Tri', mandatory: false, reqCaces: false, reqPermis: false }); }}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
          )}
        </div>
      </form>

      {/* Liste par groupe */}
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} className="mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{groupName}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(s => (
              <div key={s.id} className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${s.mandatory ? 'border-red-400' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                    <div className="flex gap-1 mt-1">
                      {s.mandatory && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Obligatoire</span>}
                      {s.reqCaces && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Wrench className="w-3 h-3" />CACES</span>}
                      {s.reqPermis && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Car className="w-3 h-3" />Permis</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-soltex-green hover:bg-gray-50 rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {stations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun poste de travail.</p>
        </div>
      )}
    </div>
  );
}
