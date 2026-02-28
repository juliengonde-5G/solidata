import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ASSIGNMENTS = {
  collecte: { label: 'Collecte', color: 'bg-blue-500' },
  tri: { label: 'Tri', color: 'bg-purple-500' },
  boutique: { label: 'Boutique', color: 'bg-pink-500' },
  logistique: { label: 'Logistique', color: 'bg-orange-500' },
  formation: { label: 'Formation', color: 'bg-teal-500' },
  repos: { label: 'Repos', color: 'bg-gray-300' },
  absence: { label: 'Absence', color: 'bg-red-400' },
  conge: { label: 'Congé', color: 'bg-yellow-400' }
};

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function PlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plannings, setPlannings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState(null);
  const [cellForm, setCellForm] = useState({ assignment: 'collecte', vehicleId: '', routeId: '' });

  const weekDates = getWeekDates(weekOffset);
  const startDate = weekDates[0];
  const endDate = weekDates[5];

  const fetchData = async () => {
    try {
      const [planRes, empRes, vehRes, routeRes] = await Promise.all([
        api.get('/team/planning', { params: { startDate, endDate } }),
        api.get('/team/employees', { params: { active: true } }),
        api.get('/team/vehicles'),
        api.get('/collection/routes')
      ]);
      setPlannings(planRes.data);
      setEmployees(empRes.data);
      setVehicles(vehRes.data);
      setRoutes(routeRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [weekOffset]);

  const getPlanning = (empId, date) => plannings.find(p => p.employeeId === empId && p.date === date);

  const saveCell = async () => {
    if (!editCell) return;
    try {
      await api.post('/team/planning', {
        employeeId: editCell.empId,
        date: editCell.date,
        ...cellForm
      });
      setEditCell(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Planning</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-medium text-gray-600">
            {new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setWeekOffset(0)} className="text-xs text-soltex-green hover:underline">Aujourd'hui</button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(ASSIGNMENTS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-gray-600">
            <span className={`w-3 h-3 rounded ${v.color}`} /> {v.label}
          </span>
        ))}
      </div>

      {/* Grille planning */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 text-sm font-semibold text-gray-600 min-w-[150px]">Employé</th>
              {weekDates.map((date, i) => (
                <th key={date} className="text-center p-3 text-sm font-semibold text-gray-600 min-w-[100px]">
                  <div>{DAYS[i]}</div>
                  <div className="text-xs font-normal text-gray-400">{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm font-medium text-gray-700">{emp.firstName} {emp.lastName[0]}.</td>
                {weekDates.map(date => {
                  const p = getPlanning(emp.id, date);
                  const isEditing = editCell?.empId === emp.id && editCell?.date === date;
                  return (
                    <td key={date} className="p-1 text-center">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 p-1">
                          <select value={cellForm.assignment} onChange={e => setCellForm({...cellForm, assignment: e.target.value})} className="text-xs border rounded px-1 py-0.5">
                            {Object.entries(ASSIGNMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          {cellForm.assignment === 'collecte' && (
                            <select value={cellForm.routeId} onChange={e => setCellForm({...cellForm, routeId: e.target.value})} className="text-xs border rounded px-1 py-0.5">
                              <option value="">Tournée...</option>
                              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          )}
                          <div className="flex gap-1">
                            <button onClick={saveCell} className="text-xs bg-soltex-green text-white px-2 rounded">OK</button>
                            <button onClick={() => setEditCell(null)} className="text-xs bg-gray-200 px-2 rounded">X</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditCell({ empId: emp.id, date }); setCellForm({ assignment: p?.assignment || 'collecte', vehicleId: p?.vehicleId || '', routeId: p?.routeId || '' }); }}
                          className={`w-full py-2 rounded text-xs text-white font-medium ${p ? ASSIGNMENTS[p.assignment]?.color : 'bg-gray-100 text-gray-400'}`}
                        >
                          {p ? ASSIGNMENTS[p.assignment]?.label : '-'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun employé actif</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
