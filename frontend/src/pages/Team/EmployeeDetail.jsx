import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ChevronLeft, ChevronRight, User, Car, Wrench, Briefcase } from 'lucide-react';

const STATUS_LABELS = {
  travaille: { label: 'Travaillé', bg: 'bg-green-100', text: 'text-green-700', short: 'T' },
  formation: { label: 'Formation', bg: 'bg-blue-100', text: 'text-blue-700', short: 'F' },
  repos: { label: 'Repos', bg: 'bg-gray-100', text: 'text-gray-500', short: 'R' },
  vacances: { label: 'Vacances', bg: 'bg-amber-100', text: 'text-amber-700', short: 'V' },
  absence: { label: 'Absence', bg: 'bg-red-100', text: 'text-red-700', short: 'A' },
  conge: { label: 'Congé', bg: 'bg-purple-100', text: 'text-purple-700', short: 'C' },
};

const DEPT_LABELS = { collecte: 'Collecte', tri: 'Tri', logistique: 'Logistique', boutique: 'Boutique', administration: 'Administration' };
const CONTRACT_LABELS = { cddi: 'CDDI', cdd: 'CDD', cdi: 'CDI', stage: 'Stage', service_civique: 'Service civique' };

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/team/employees/${id}`).then(r => setEmployee(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !month) return;
    api.get(`/team/assignments/employee-calendar/${id}?month=${month}`)
      .then(r => setCalendar(r.data))
      .catch(console.error);
  }, [id, month]);

  const handleStatusChange = async (date, status) => {
    try {
      await api.put('/team/assignments/employee-status', { employeeId: id, date, status });
      const res = await api.get(`/team/assignments/employee-calendar/${id}?month=${month}`);
      setCalendar(res.data);
    } catch (err) { console.error(err); }
  };

  const changeMonth = (offset) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!employee) return <div className="text-center py-12 text-red-500">Employé non trouvé</div>;

  // Build calendar grid
  const [year, monthNum] = month.split('-').map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  let startDay = firstDay.getDay();
  if (startDay === 0) startDay = 7; // Lundi = 1

  // Status map
  const statusMap = {};
  calendar?.statuses?.forEach(s => { statusMap[s.date] = s.status; });
  // Assignment map
  const assignmentMap = {};
  calendar?.assignments?.forEach(a => { assignmentMap[a.date] = a.workStation?.name; });
  calendar?.vakAssignments?.forEach(a => { assignmentMap[a.date] = `VAK: ${a.vakWorkStation?.name}`; });

  const monthLabel = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <Link to="/equipe" className="text-soltex-green hover:text-soltex-green-dark text-sm flex items-center gap-1 mb-4">
        <ChevronLeft className="w-4 h-4" /> Retour aux salariés
      </Link>

      {/* Fiche employé */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-soltex-green/10 flex items-center justify-center text-soltex-green text-xl font-bold">
            {employee.firstName?.[0]}{employee.lastName?.[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">{employee.firstName} {employee.lastName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-soltex-green/10 text-soltex-green px-2 py-1 rounded-full">{DEPT_LABELS[employee.department]}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{CONTRACT_LABELS[employee.contractType]}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{employee.contractHours || '35h'}</span>
              {employee.drivingLicense && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1"><Car className="w-3 h-3" />Permis B</span>}
              {employee.caces && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1"><Wrench className="w-3 h-3" />CACES</span>}
              {employee.weeklyDayOff && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">Repos: {employee.weeklyDayOff}</span>}
            </div>
            {employee.email && <p className="text-sm text-gray-500 mt-2">{employee.email}</p>}
          </div>
        </div>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 capitalize">{monthLabel}</h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Légende */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-4 h-4 rounded ${val.bg}`}></span>
              <span className="text-gray-600">{val.label}</span>
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-7 gap-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}

          {/* Espaces vides avant le 1er */}
          {Array.from({ length: startDay - 1 }).map((_, i) => <div key={`empty-${i}`} />)}

          {/* Jours */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, monthNum - 1, dayNum).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Determine status
            let status = statusMap[dateStr] || 'travaille';
            if (employee.weeklyDayOff) {
              const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
              if (dayNames[dayOfWeek] === employee.weeklyDayOff && !statusMap[dateStr]) status = 'repos';
            }
            if (isWeekend && !statusMap[dateStr] && employee.department !== 'boutique') status = 'repos';

            const st = STATUS_LABELS[status] || STATUS_LABELS.travaille;
            const assignment = assignmentMap[dateStr];
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div key={dayNum} className={`relative rounded-lg p-1.5 min-h-[70px] border cursor-pointer group
                ${st.bg} ${isToday ? 'ring-2 ring-soltex-green' : 'border-transparent hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${st.text}`}>{dayNum}</span>
                  <span className={`text-[9px] font-bold ${st.text}`}>{st.short}</span>
                </div>
                {assignment && (
                  <div className="mt-1">
                    <span className="text-[9px] text-gray-600 leading-tight block truncate" title={assignment}>
                      <Briefcase className="w-2.5 h-2.5 inline mr-0.5" />{assignment}
                    </span>
                  </div>
                )}
                {/* Dropdown on hover for status change */}
                <div className="absolute top-0 right-0 z-10 hidden group-hover:block">
                  <select
                    value={status}
                    onChange={e => handleStatusChange(dateStr, e.target.value)}
                    className="text-[10px] bg-white border rounded shadow-lg p-0.5 cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
