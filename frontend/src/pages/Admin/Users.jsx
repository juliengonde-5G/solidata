import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Edit2, RotateCcw, UserX, UserCheck, Trash2, Shield, X } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-700', icon: '🔑' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-700', icon: '👔' },
  { value: 'collaborateur', label: 'Collaborateur', color: 'bg-green-100 text-green-700', icon: '👤' },
  { value: 'rh', label: 'Ressources Humaines', color: 'bg-purple-100 text-purple-700', icon: '📋' },
  { value: 'autorite', label: 'Autorité', color: 'bg-amber-100 text-amber-700', icon: '🏛' },
];

const TEAMS = [
  { value: 'tri', label: 'Tri' },
  { value: 'collecte', label: 'Collecte' },
  { value: 'magasin_lhopital', label: "Magasin L'Hôpital" },
  { value: 'magasin_st_sever', label: 'Magasin St Sever' },
  { value: 'magasin_vernon', label: 'Magasin Vernon' },
  { value: 'administration', label: 'Administration' },
];

const AVATAR_COLORS = ['#7AB51D', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

const emptyForm = {
  email: '', firstName: '', lastName: '', role: 'collaborateur',
  team: '', phone: '', avatarColor: '#7AB51D', password: ''
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterRole, setFilterRole] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  const fetchData = async () => {
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      if (filterTeam) params.team = filterTeam;
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users', { params }),
        api.get('/admin/users/stats')
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterRole, filterTeam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.team) delete payload.team;
      if (!payload.password) delete payload.password;

      if (editing) {
        await api.put(`/admin/users/${editing}`, payload);
      } else {
        await api.post('/admin/users', payload);
      }
      closeForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Erreur');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const startEdit = (u) => {
    setForm({
      email: u.email, firstName: u.firstName, lastName: u.lastName,
      role: u.role, team: u.team || '', phone: u.phone || '',
      avatarColor: u.avatarColor || '#7AB51D', password: ''
    });
    setEditing(u.id);
    setShowForm(true);
  };

  const toggleActive = async (u) => {
    if (!confirm(`${u.active ? 'Désactiver' : 'Réactiver'} ${u.firstName} ${u.lastName} ?`)) return;
    await api.put(`/admin/users/${u.id}/toggle-active`);
    fetchData();
  };

  const resetPassword = async (u) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.firstName} ${u.lastName} ?`)) return;
    await api.put(`/admin/users/${u.id}/reset-password`);
    alert('Mot de passe réinitialisé : SolTex2026!');
    fetchData();
  };

  const deleteUser = async (u) => {
    if (!confirm(`SUPPRIMER définitivement ${u.firstName} ${u.lastName} ? Cette action est irréversible.`)) return;
    await api.delete(`/admin/users/${u.id}`);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-soltex-gray-dark">Gestion des utilisateurs</h1>
          {stats && <p className="text-sm text-gray-500 mt-1">{stats.active} actifs / {stats.total} total</p>}
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ ...emptyForm }); }} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {/* Stats par rôle */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {ROLES.map(r => (
            <div key={r.value} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterRole(filterRole === r.value ? '' : r.value)}>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.color} ${filterRole === r.value ? 'ring-2 ring-offset-1 ring-soltex-green' : ''}`}>{r.label}</span>
                <span className="text-2xl font-bold text-gray-800">{stats.byRole[r.value] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres équipe */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilterTeam('')} className={`px-3 py-1 rounded-full text-sm ${!filterTeam ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Toutes les équipes</button>
        {TEAMS.map(t => (
          <button key={t.value} onClick={() => setFilterTeam(filterTeam === t.value ? '' : t.value)} className={`px-3 py-1 rounded-full text-sm ${filterTeam === t.value ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.label}</button>
        ))}
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Prénom *</label>
                  <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nom *</label>
                  <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Téléphone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="06..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Rôle *</label>
                  <select required value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Équipe</label>
                  <select value={form.team} onChange={e => setForm({...form, team: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="">— Aucune —</option>
                    {TEAMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              {!editing && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Mot de passe (par défaut : SolTex2026!)</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Laisser vide pour le défaut" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Couleur de profil</label>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({...form, avatarColor: c})} className={`w-8 h-8 rounded-full border-2 ${form.avatarColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-soltex-green text-white py-2 rounded-lg font-medium">{editing ? 'Enregistrer' : 'Créer le compte'}</button>
                <button type="button" onClick={closeForm} className="px-6 bg-gray-100 text-gray-700 py-2 rounded-lg">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Utilisateur</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Rôle</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-600">Équipe</th>
              <th className="text-center p-3 text-sm font-semibold text-gray-600">Statut</th>
              <th className="text-center p-3 text-sm font-semibold text-gray-600">Dernière connexion</th>
              <th className="text-center p-3 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = ROLES.find(r => r.value === u.role);
              const team = TEAMS.find(t => t.value === u.team);
              return (
                <tr key={u.id} className={`border-b hover:bg-gray-50 ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: u.avatarColor || '#7AB51D' }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${role?.color}`}>{role?.label}</span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{team?.label || '—'}</td>
                  <td className="p-3 text-center">
                    {u.active
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>
                      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inactif</span>
                    }
                    {u.mustChangePassword && u.active && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">MDP temp.</span>}
                  </td>
                  <td className="p-3 text-center text-xs text-gray-400">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => resetPassword(u)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded" title="Réinitialiser MDP"><RotateCcw className="w-4 h-4" /></button>
                      <button onClick={() => toggleActive(u)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded" title={u.active ? 'Désactiver' : 'Réactiver'}>
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteUser(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun utilisateur trouvé</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
