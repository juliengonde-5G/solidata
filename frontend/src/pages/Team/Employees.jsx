import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Plus, Edit2, ChevronDown, ChevronUp, Award, Calendar } from 'lucide-react';

const DEPARTMENTS = [
  { value: 'collecte', label: 'Collecte' },
  { value: 'tri', label: 'Tri' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'administration', label: 'Administration' }
];

const CONTRACT_TYPES = [
  { value: 'cddi', label: 'CDDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'cdi', label: 'CDI' },
  { value: 'stage', label: 'Stage' },
  { value: 'service_civique', label: 'Service civique' }
];

const SKILL_CATEGORIES = [
  { value: 'conduite', label: 'Conduite' },
  { value: 'tri', label: 'Tri' },
  { value: 'manutention', label: 'Manutention' },
  { value: 'vente', label: 'Vente' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'encadrement', label: 'Encadrement' }
];

const SKILL_LEVELS = [
  { value: 'debutant', label: 'Débutant', color: 'bg-gray-200 text-gray-700' },
  { value: 'intermediaire', label: 'Intermédiaire', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirme', label: 'Confirmé', color: 'bg-green-100 text-green-700' },
  { value: 'expert', label: 'Expert', color: 'bg-purple-100 text-purple-700' }
];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [skillForm, setSkillForm] = useState(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    department: 'collecte', contractType: 'cddi', hireDate: '',
    contractEndDate: '', drivingLicense: false, caces: false,
    contractHours: '35h', weeklyDayOff: '', notes: ''
  });

  const fetchEmployees = async () => {
    try {
      const params = {};
      if (filterDept) params.department = filterDept;
      const { data } = await api.get('/team/employees', { params });
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [filterDept]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/team/employees/${editing}`, form);
      } else {
        await api.post('/team/employees', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ firstName: '', lastName: '', email: '', phone: '', department: 'collecte', contractType: 'cddi', hireDate: '', contractEndDate: '', drivingLicense: false, caces: false, contractHours: '35h', weeklyDayOff: '', notes: '' });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const startEdit = (emp) => {
    setForm({
      firstName: emp.firstName, lastName: emp.lastName, email: emp.email || '',
      phone: emp.phone || '', department: emp.department, contractType: emp.contractType,
      hireDate: emp.hireDate, contractEndDate: emp.contractEndDate || '',
      drivingLicense: emp.drivingLicense, caces: emp.caces || false,
      contractHours: emp.contractHours || '35h', weeklyDayOff: emp.weeklyDayOff || '',
      notes: emp.notes || ''
    });
    setEditing(emp.id);
    setShowForm(true);
  };

  const addSkill = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/team/employees/${skillForm.employeeId}/skills`, skillForm);
      setSkillForm(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Équipe</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="bg-soltex-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-soltex-green/90">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Filtre département */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button onClick={() => setFilterDept('')} className={`px-3 py-1 rounded-full text-sm ${!filterDept ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tous</button>
        {DEPARTMENTS.map(d => (
          <button key={d.value} onClick={() => setFilterDept(d.value)} className={`px-3 py-1 rounded-full text-sm ${filterDept === d.value ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d.label}</button>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Modifier' : 'Nouvel employé'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Prénom" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input required placeholder="Nom" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border rounded-lg px-3 py-2" />
            <select required value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="border rounded-lg px-3 py-2">
              {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select required value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value})} className="border rounded-lg px-3 py-2">
              {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500">Date d'embauche</label>
              <input required type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fin de contrat</label>
              <input type="date" value={form.contractEndDate} onChange={e => setForm({...form, contractEndDate: e.target.value})} className="border rounded-lg px-3 py-2 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Heures contrat</label>
              <select value={form.contractHours} onChange={e => setForm({...form, contractHours: e.target.value})} className="border rounded-lg px-3 py-2 w-full">
                {['20h', '24h', '26h', '28h', '30h', '32h', '35h'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Jour de repos hebdomadaire</label>
              <select value={form.weeklyDayOff} onChange={e => setForm({...form, weeklyDayOff: e.target.value})} className="border rounded-lg px-3 py-2 w-full">
                <option value="">Aucun (standard)</option>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-full flex gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.drivingLicense} onChange={e => setForm({...form, drivingLicense: e.target.checked})} />
                Permis de conduire
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.caces} onChange={e => setForm({...form, caces: e.target.checked})} />
                CACES
              </label>
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border rounded-lg px-3 py-2 col-span-full" rows={2} />
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-soltex-green text-white px-6 py-2 rounded-lg">{editing ? 'Modifier' : 'Ajouter'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {employees.map(emp => (
          <div key={emp.id} className="bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-soltex-green/10 rounded-full flex items-center justify-center">
                  <span className="text-soltex-green font-semibold text-sm">{emp.firstName[0]}{emp.lastName[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-gray-400">{DEPARTMENTS.find(d => d.value === emp.department)?.label} - {CONTRACT_TYPES.find(c => c.value === emp.contractType)?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emp.drivingLicense && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Permis</span>}
                {emp.caces && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">CACES</span>}
                <span className="text-xs text-gray-400">{emp.skills?.length || 0} comp.</span>
                <Link to={`/equipe/salarie/${emp.id}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-blue-500" title="Fiche & calendrier">
                  <Calendar className="w-4 h-4" />
                </Link>
                <button onClick={(e) => { e.stopPropagation(); startEdit(emp); }} className="text-gray-400 hover:text-soltex-green">
                  <Edit2 className="w-4 h-4" />
                </button>
                {expanded === emp.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
            {expanded === emp.id && (
              <div className="px-4 pb-4 border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1"><Award className="w-4 h-4" /> Compétences</h3>
                  <button onClick={() => setSkillForm({ employeeId: emp.id, name: '', category: 'tri', level: 'debutant' })} className="text-xs text-soltex-green hover:underline">+ Ajouter</button>
                </div>
                {skillForm?.employeeId === emp.id && (
                  <form onSubmit={addSkill} className="flex gap-2 mb-3 flex-wrap">
                    <input required placeholder="Compétence" value={skillForm.name} onChange={e => setSkillForm({...skillForm, name: e.target.value})} className="border rounded px-2 py-1 text-sm flex-1" />
                    <select value={skillForm.category} onChange={e => setSkillForm({...skillForm, category: e.target.value})} className="border rounded px-2 py-1 text-sm">
                      {SKILL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={skillForm.level} onChange={e => setSkillForm({...skillForm, level: e.target.value})} className="border rounded px-2 py-1 text-sm">
                      {SKILL_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                    <button type="submit" className="bg-soltex-green text-white px-3 py-1 rounded text-sm">OK</button>
                  </form>
                )}
                <div className="flex flex-wrap gap-2">
                  {emp.skills?.length === 0 && <span className="text-xs text-gray-400">Aucune compétence</span>}
                  {emp.skills?.map(s => (
                    <span key={s.id} className={`text-xs px-2 py-1 rounded-full ${SKILL_LEVELS.find(l => l.value === s.level)?.color || 'bg-gray-100'}`}>
                      {s.name} ({SKILL_CATEGORIES.find(c => c.value === s.category)?.label})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {employees.length === 0 && <p className="text-center text-gray-400 py-8">Aucun employé</p>}
      </div>
    </div>
  );
}
