import { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Users, Shield, Download, Check, RefreshCw, UserX
} from 'lucide-react';

const GROUP_COLORS = {
  Tri: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
  Collecte: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
  Logistique: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
  Boutique: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
  Autre: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100' },
  Absences: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' },
};

const GROUP_ORDER = ['Tri', 'Collecte', 'Logistique', 'Boutique', 'Autre'];

const ABSENCE_LABELS = {
  repos: 'Repos',
  vacances: 'Vacances',
  absence: 'Absence',
  conge: 'Congé',
  formation: 'Formation',
};

export default function DailyPlanning() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workStations, setWorkStations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [wsRes, assignRes, availRes, statsRes] = await Promise.all([
        api.get('/team/workstations?active=true'),
        api.get(`/team/assignments/day/${date}`),
        api.get(`/team/assignments/available/${date}`),
        api.get(`/team/assignments/stats/${date}`)
      ]);
      setWorkStations(wsRes.data);
      setAssignments(assignRes.data);
      setAvailableEmployees(availRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const handleSaturdayRepos = async () => {
    try {
      const res = await api.put('/team/assignments/saturday-repos', { date });
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleAssign = async (workStationId, employeeId) => {
    try {
      await api.put('/team/assignments/assign', {
        date,
        workStationId,
        employeeId: employeeId || null
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleConfirmAll = async () => {
    try {
      await api.put('/team/assignments/confirm', { date });
      fetchData();
    } catch (err) {
      console.error('Erreur confirmation:', err);
    }
  };

  const changeDate = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleExportPDF = async () => {
    try {
      const res = await api.get(`/team/assignments/week/${date}`);
      const { dates, assignments: weekAssignments, workStations: wsAll } = res.data;

      // Build assignment lookup: { date_wsId: employeeName }
      const assignLookup = {};
      weekAssignments.forEach(a => {
        const empName = a.employee ? `${a.employee.lastName} ${a.employee.firstName}` : '';
        assignLookup[`${a.date}_${a.workStationId}`] = empName;
      });

      // Group workstations
      const groupedWs = {};
      (wsAll || []).forEach(ws => {
        if (!groupedWs[ws.group]) groupedWs[ws.group] = [];
        groupedWs[ws.group].push(ws);
      });

      // Day labels for header
      const dayLabels = dates.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      });

      // Week range label
      const weekStart = new Date(dates[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const weekEnd = new Date(dates[dates.length - 1]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      // Create PDF - A4 landscape for better readability
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(14);
      doc.text(`Affectations - Semaine du ${weekStart} au ${weekEnd}`, 14, 15);
      doc.setFontSize(8);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 21);

      // Build table rows grouped by category
      const head = [['Groupe', 'Poste', ...dayLabels]];
      const body = [];

      Object.entries(groupedWs).forEach(([groupName, stations]) => {
        stations.forEach((ws, i) => {
          const row = [
            i === 0 ? groupName : '',
            `${ws.name}${ws.mandatory ? ' *' : ''}`,
            ...dates.map(d => assignLookup[`${d}_${ws.id}`] || '')
          ];
          body.push(row);
        });
      });

      autoTable(doc, {
        startY: 25,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
        headStyles: { fillColor: [76, 140, 74], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', fontSize: 7 },
          1: { cellWidth: 38, fontSize: 7 },
        },
        didParseCell: (data) => {
          // Bold mandatory stations
          if (data.column.index === 1 && data.cell.raw?.includes(' *')) {
            data.cell.styles.textColor = [180, 40, 40];
            data.cell.styles.fontStyle = 'bold';
          }
          // Gray empty cells
          if (data.column.index >= 2 && data.section === 'body' && !data.cell.raw) {
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Footer note
      const finalY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('* = Poste obligatoire', 14, finalY);

      doc.save(`affectations_semaine_${dates[0]}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const dateObj = new Date(date);
  const dayLabel = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const isSaturday = dateObj.getDay() === 6;

  // Grouper les postes par catégorie, trié selon GROUP_ORDER
  const groups = {};
  workStations.forEach(ws => {
    if (!groups[ws.group]) groups[ws.group] = [];
    groups[ws.group].push(ws);
  });

  const sortedGroups = GROUP_ORDER
    .filter(g => groups[g])
    .map(g => [g, groups[g]]);
  // Ajouter les groupes non listés dans GROUP_ORDER
  Object.keys(groups).forEach(g => {
    if (!GROUP_ORDER.includes(g)) sortedGroups.push([g, groups[g]]);
  });

  // Map assignment par workStationId
  const assignMap = {};
  assignments.forEach(a => { assignMap[a.workStationId] = a; });

  // Employees déjà affectés
  const assignedIds = new Set(assignments.map(a => a.employeeId));

  // Absences: employés qui ne travaillent pas ce jour
  const absentEmployees = availableEmployees
    .filter(e => e.dayStatus !== 'travaille')
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Affectations du jour</h1>
        <div className="flex items-center gap-2">
          {isSaturday && (
            <button onClick={handleSaturdayRepos} className="border border-orange-300 hover:bg-orange-50 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
              <UserX className="w-4 h-4" /> Repos samedi
            </button>
          )}
          <button onClick={handleExportPDF} className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> PDF semaine
          </button>
          <button onClick={handleConfirmAll} className="bg-soltex-green hover:bg-soltex-green-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Check className="w-4 h-4" /> Confirmer tout
          </button>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-soltex-green" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-lg font-semibold border-0 outline-none bg-transparent" />
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 capitalize">{dayLabel}</span>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isWeekend && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">Weekend : vérifiez si des postes boutique sont à pourvoir.</span>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Postes pourvus" value={`${stats.filledStations}/${stats.totalStations}`}
            color={stats.filledStations === stats.totalStations ? 'text-green-600' : 'text-amber-600'} />
          <StatCard label="Obligatoires" value={`${stats.mandatoryFilled}/${stats.mandatoryTotal}`}
            color={stats.mandatoryFilled === stats.mandatoryTotal ? 'text-green-600' : 'text-red-600'} />
          <StatCard label="Disponibles" value={stats.availableEmployees} color="text-blue-600" />
          <StatCard label="Libres" value={stats.freeEmployees}
            color={stats.freeEmployees > 0 ? 'text-amber-600' : 'text-green-600'} />
          <StatCard label="Confirmés" value={`${stats.confirmed}/${stats.filledStations}`}
            color={stats.confirmed === stats.filledStations ? 'text-green-600' : 'text-gray-500'} />
        </div>
      )}

      {/* Alertes postes obligatoires */}
      {stats?.mandatoryMissing?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Postes obligatoires non affectés
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.mandatoryMissing.map(s => (
              <span key={s.id} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                {s.name} ({s.group})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grille par groupe (ordre: Tri, Collecte, Logistique, Boutique, Autre) */}
      {sortedGroups.map(([groupName, stations]) => {
        const colors = GROUP_COLORS[groupName] || GROUP_COLORS.Autre;
        const isCollecte = groupName === 'Collecte';
        return (
          <div key={groupName} className="mb-6">
            <div className={`${colors.bg} ${colors.border} border rounded-t-xl px-4 py-3 flex items-center justify-between`}>
              <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.text}`}>{groupName}</h3>
              <span className={`text-xs ${colors.text} opacity-60`}>{stations.length} postes</span>
            </div>
            <div className="bg-white border border-t-0 rounded-b-xl shadow-sm divide-y">
              {stations.map(ws => {
                const assignment = assignMap[ws.id];
                return (
                  <div key={ws.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    {/* Nom du poste */}
                    <div className="w-48 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-800">{ws.name}</span>
                        {ws.mandatory && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Obligatoire</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-0.5">
                        {ws.reqCaces && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">CACES</span>}
                        {ws.reqPermis && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Permis B</span>}
                      </div>
                    </div>

                    {/* Sélecteur employé */}
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={assignment?.employeeId || ''}
                        onChange={e => handleAssign(ws.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors ${
                          assignment ? 'border-green-300 bg-green-50/30' : ws.mandatory ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                        }`}
                      >
                        <option value="">-- Libre --</option>
                        {availableEmployees
                          .filter(e => {
                            if (assignment?.employeeId === e.id) return true;
                            if (e.assignedToWorkStationId && e.assignedToWorkStationId !== ws.id) return false;
                            if (e.dayStatus !== 'travaille') return false;
                            if (ws.reqCaces && !e.caces) return false;
                            if (ws.reqPermis && !e.drivingLicense) return false;
                            // Collecte: seuls les employés avec permis B (chauffeurs)
                            if (isCollecte && !e.drivingLicense) return false;
                            return true;
                          })
                          .map(e => (
                            <option key={e.id} value={e.id}>
                              {e.lastName} {e.firstName} ({e.contractHours || '35h'})
                              {isCollecte && e.drivingLicense ? ' 🚗' : ''}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Statut */}
                    <div className="w-28 flex-shrink-0 text-right">
                      {assignment?.status === 'confirme' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmé
                        </span>
                      ) : assignment ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5" /> Prévisionnel
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Section Absences */}
      {absentEmployees.length > 0 && (
        <div className="mb-6">
          <div className={`${GROUP_COLORS.Absences.bg} ${GROUP_COLORS.Absences.border} border rounded-t-xl px-4 py-3 flex items-center justify-between`}>
            <h3 className={`font-bold text-sm uppercase tracking-wider ${GROUP_COLORS.Absences.text}`}>
              <UserX className="w-4 h-4 inline mr-2" />Absences
            </h3>
            <span className="text-xs text-red-600 opacity-60">{absentEmployees.length} personnes</span>
          </div>
          <div className="bg-white border border-t-0 rounded-b-xl shadow-sm divide-y">
            {absentEmployees.map(e => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-gray-700">{e.lastName} {e.firstName}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  e.dayStatus === 'vacances' ? 'bg-blue-100 text-blue-700' :
                  e.dayStatus === 'formation' ? 'bg-purple-100 text-purple-700' :
                  e.dayStatus === 'conge' ? 'bg-indigo-100 text-indigo-700' :
                  e.dayStatus === 'absence' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {ABSENCE_LABELS[e.dayStatus] || e.dayStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {workStations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun poste de travail configuré.</p>
          <p className="text-sm text-gray-400 mt-1">Allez dans Postes de travail pour en créer.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
