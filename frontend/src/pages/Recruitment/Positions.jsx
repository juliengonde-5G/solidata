import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Briefcase, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const DEPARTMENTS = [
  { value: 'collecte', label: 'Collecte' },
  { value: 'tri', label: 'Tri' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'administration', label: 'Administration' }
];

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    department: 'collecte',
    description: '',
    openPositions: 1,
    month: new Date().toISOString().slice(0, 7)
  });

  const fetchPositions = async () => {
    try {
      const res = await api.get('/recruitment/positions');
      setPositions(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPositions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/recruitment/positions/${editingId}`, form);
      } else {
        await api.post('/recruitment/positions', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', department: 'collecte', description: '', openPositions: 1, month: new Date().toISOString().slice(0, 7) });
      fetchPositions();
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleEdit = (position) => {
    setForm({
      title: position.title,
      department: position.department,
      description: position.description || '',
      openPositions: position.openPositions,
      month: position.month
    });
    setEditingId(position.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Désactiver ce poste ?')) return;
    try {
      await api.delete(`/recruitment/positions/${id}`);
      fetchPositions();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Postes ouverts</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="bg-soltex-green hover:bg-soltex-green-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouveau poste
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Modifier le poste' : 'Nouveau poste'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre du poste</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                <select
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green outline-none"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de postes</label>
                <input
                  type="number"
                  min={0}
                  value={form.openPositions}
                  onChange={e => setForm({ ...form, openPositions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <input
                  type="month"
                  value={form.month}
                  onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green outline-none resize-y"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 border rounded-lg text-gray-600 text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-soltex-green text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {positions.filter(p => p.active).map(position => (
          <div key={position.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-soltex-green/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-soltex-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{position.title}</h3>
                  <p className="text-sm text-gray-500">
                    {DEPARTMENTS.find(d => d.value === position.department)?.label} - {position.month}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-soltex-green/10 text-soltex-green px-3 py-1 rounded-full font-medium">
                  {position.filledPositions}/{position.openPositions} pourvus
                </span>
                <button onClick={() => handleEdit(position)} className="text-gray-400 hover:text-soltex-green">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(position.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {position.description && (
              <p className="text-sm text-gray-500 mt-2 ml-15">{position.description}</p>
            )}
          </div>
        ))}

        {positions.filter(p => p.active).length === 0 && (
          <div className="text-center py-12 text-gray-400">Aucun poste ouvert</div>
        )}
      </div>
    </div>
  );
}
