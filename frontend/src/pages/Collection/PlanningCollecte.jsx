import { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import {
  Calendar, ChevronLeft, ChevronRight, Truck, Users, MapPin,
  Zap, Cog, Hand, Play, Check, X, AlertTriangle, RefreshCw,
  Download, Plus, Trash2
} from 'lucide-react';

const STATUS_COLORS = {
  planifiee: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  terminee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
};

const SOURCE_LABELS = {
  standard: { label: 'Standard', icon: Cog, color: 'bg-blue-50 text-blue-700' },
  intelligent: { label: 'Intelligent', icon: Zap, color: 'bg-purple-50 text-purple-700' },
  manuel: { label: 'Manuel', icon: Hand, color: 'bg-amber-50 text-amber-700' },
};

// Prochain jour ouvré (demain ou lundi si vendredi/samedi/dimanche)
function nextBusinessDay() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function PlanningCollecte() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [genDate, setGenDate] = useState(nextBusinessDay);
  const [weekData, setWeekData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('week'); // week, generate
  const [genMode, setGenMode] = useState('standard');
  const [genResult, setGenResult] = useState(null);
  // Standard mode: available templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  // Manual mode criteria
  const [criteria, setCriteria] = useState({ cities: [], daysSinceCollection: 7, minFillRate: '' });
  const [criteriaOptions, setCriteriaOptions] = useState({ cities: [], communautes: [] });

  const fetchWeek = useCallback(async () => {
    try {
      const [weekRes, vRes, eRes] = await Promise.all([
        api.get(`/collection/planning/week/${date}`),
        api.get('/team/vehicles'),
        api.get('/team/employees?department=collecte'),
      ]);
      setWeekData(weekRes.data);
      setVehicles(vRes.data);
      setEmployees(eRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { setLoading(true); fetchWeek(); }, [fetchWeek]);
  useEffect(() => {
    api.get('/collection/planning/criteria-options').then(r => setCriteriaOptions(r.data)).catch(() => {});
    api.get('/collection/routes').then(r => setTemplates(r.data.filter(t => t.active !== false))).catch(() => {});
  }, []);

  const changeWeek = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset * 7);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      let res;
      if (genMode === 'standard') {
        res = await api.post('/collection/planning/generate/standard', {
          date: genDate,
          templateIds: selectedTemplates.length > 0 ? selectedTemplates : undefined
        });
      } else if (genMode === 'intelligent') {
        res = await api.post('/collection/planning/generate/intelligent', { date: genDate });
      } else {
        res = await api.post('/collection/planning/generate/manual', { date: genDate, criteria });
      }
      setGenResult(res.data);
      fetchWeek();
    } catch (err) {
      setGenResult({ error: err.response?.data?.error || 'Erreur' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!confirm('Supprimer cette tournée ?')) return;
    try {
      await api.delete(`/collection/daily-routes/${id}`);
      fetchWeek();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleAssign = async (routeId, field, value) => {
    try {
      await api.put(`/collection/daily-routes/${routeId}`, { [field]: value || null });
      fetchWeek();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Planning collecte</h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'week' ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Calendar className="w-4 h-4 inline mr-1" /> Semaine
          </button>
          <button onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'generate' ? 'bg-soltex-green text-white' : 'bg-gray-100 text-gray-600'}`}>
            <Plus className="w-4 h-4 inline mr-1" /> Générer
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
        <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-soltex-green" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-lg font-semibold border-0 outline-none bg-transparent" />
          {weekData && (
            <span className="text-sm text-gray-500">
              Semaine du {new Date(weekData.dates[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {new Date(weekData.dates[weekData.dates.length - 1]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {activeTab === 'week' && weekData && (
        <>
          {/* Stats semaine */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {weekData.dates.map(d => {
              const s = weekData.statsByDay[d] || {};
              const dayRoutes = weekData.routes.filter(r => r.date === d);
              return (
                <div key={d} className="bg-white rounded-xl shadow-sm p-3 text-center">
                  <div className="text-xs text-gray-400 uppercase">
                    {new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-lg font-bold text-gray-800 mt-1">{dayRoutes.length}</div>
                  <div className="text-[10px] text-gray-400">tournée{dayRoutes.length > 1 ? 's' : ''}</div>
                  <div className="text-[10px] text-gray-400">{s.points || 0} pts</div>
                </div>
              );
            })}
          </div>

          {/* Grille par jour */}
          {weekData.dates.map(d => {
            const dayRoutes = weekData.routes.filter(r => r.date === d);
            if (dayRoutes.length === 0) return null;
            return (
              <div key={d} className="mb-6">
                <div className="bg-soltex-green/10 border border-soltex-green/20 rounded-t-xl px-4 py-2">
                  <h3 className="font-bold text-sm text-soltex-green capitalize">
                    {new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <div className="bg-white border border-t-0 rounded-b-xl shadow-sm divide-y">
                  {dayRoutes.map(route => {
                    const src = SOURCE_LABELS[route.source] || SOURCE_LABELS.standard;
                    const SrcIcon = src.icon;
                    const isConfirmed = route.vehicleId && route.driverId;
                    return (
                      <div key={route.id} className={`px-4 py-3 flex items-center gap-4 flex-wrap ${isConfirmed ? '' : 'bg-gray-50/50'}`}>
                        {/* Source badge */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${src.color}`}>
                          <SrcIcon className="w-3 h-3" /> {src.label}
                        </div>

                        {/* Période */}
                        <span className="text-xs font-medium text-gray-500 w-16">
                          {route.period === 'matin' ? '🌅 Matin' : '🌇 Après-midi'}
                        </span>

                        {/* Template */}
                        <span className={`text-sm min-w-[150px] ${isConfirmed ? 'font-bold text-gray-900' : 'italic text-gray-500'}`}>
                          {route.templateRoute?.name || 'Tournée libre'}
                        </span>

                        {/* Points count */}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" /> {route.routePoints?.length || 0} pts
                        </span>

                        {/* Affectations */}
                        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                          {/* Vehicle */}
                          <div className="flex items-center gap-1 flex-1">
                            <Truck className={`w-3.5 h-3.5 ${route.vehicleId ? 'text-soltex-green' : 'text-gray-300'}`} />
                            <select value={route.vehicleId || ''} onChange={e => handleAssign(route.id, 'vehicleId', e.target.value)}
                              className={`border rounded px-2 py-1 text-xs flex-1 ${route.vehicleId ? 'font-semibold border-soltex-green/30' : 'italic text-gray-400 border-dashed'}`}>
                              <option value="">-- Véhicule --</option>
                              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>)}
                            </select>
                          </div>

                          {/* Driver */}
                          <div className="flex items-center gap-1 flex-1">
                            <Users className={`w-3.5 h-3.5 ${route.driverId ? 'text-soltex-green' : 'text-gray-300'}`} />
                            <select value={route.driverId || ''} onChange={e => handleAssign(route.id, 'driverId', e.target.value)}
                              className={`border rounded px-2 py-1 text-xs flex-1 ${route.driverId ? 'font-semibold border-soltex-green/30' : 'italic text-gray-400 border-dashed'}`}>
                              <option value="">-- Chauffeur --</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Status */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[route.status]}`}>
                          {route.status}
                        </span>

                        {/* Confirmed indicator */}
                        {isConfirmed && (
                          <span className="text-[10px] text-green-600 font-bold">Confirmée</span>
                        )}
                        {!isConfirmed && (
                          <span className="text-[10px] text-gray-400 italic">Provisoire</span>
                        )}

                        {/* Actions */}
                        {route.status === 'planifiee' && (
                          <button onClick={() => handleDeleteRoute(route.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {weekData.routes.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune tournée planifiée cette semaine</p>
              <button onClick={() => setActiveTab('generate')} className="mt-3 text-soltex-green text-sm hover:underline">
                Générer des tournées
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'generate' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Date de génération */}
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-semibold">Générer des tournées pour le</h2>
            <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="text-lg font-semibold border rounded-lg px-3 py-1 bg-soltex-green/5 border-soltex-green/30" />
            <span className="text-sm text-gray-500">
              {new Date(genDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { val: 'standard', icon: Cog, label: 'Standard', desc: 'Choisir parmi les tournées prédéfinies' },
              { val: 'intelligent', icon: Zap, label: 'Intelligent', desc: 'Optimisé selon remplissage, fréquence et géographie' },
              { val: 'manuel', icon: Hand, label: 'Manuel', desc: 'Sélection par zone géographique ou critères' },
            ].map(m => (
              <button key={m.val} onClick={() => setGenMode(m.val)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  genMode === m.val ? 'border-soltex-green bg-soltex-green/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <m.icon className={`w-6 h-6 mb-2 ${genMode === m.val ? 'text-soltex-green' : 'text-gray-400'}`} />
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs text-gray-400 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Standard mode: template selector */}
          {genMode === 'standard' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Tournées standard disponibles</h3>
                <button type="button"
                  onClick={() => setSelectedTemplates(selectedTemplates.length === templates.length ? [] : templates.map(t => t.id))}
                  className="text-xs text-soltex-green hover:underline">
                  {selectedTemplates.length === templates.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {templates.map(t => (
                  <label key={t.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplates.includes(t.id) ? 'bg-soltex-green/10 border border-soltex-green/30' : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="checkbox" checked={selectedTemplates.includes(t.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedTemplates([...selectedTemplates, t.id]);
                        else setSelectedTemplates(selectedTemplates.filter(id => id !== t.id));
                      }}
                      className="accent-soltex-green" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.points?.length || 0} pts - {t.sector || 'Pas de secteur'}</div>
                    </div>
                  </label>
                ))}
              </div>
              {templates.length === 0 && <p className="text-sm text-gray-400">Aucune tournée standard configurée</p>}
            </div>
          )}

          {/* Manual mode criteria */}
          {genMode === 'manuel' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <h3 className="font-medium text-sm">Critères de sélection</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Villes</label>
                  <select multiple value={criteria.cities}
                    onChange={e => setCriteria({...criteria, cities: Array.from(e.target.selectedOptions, o => o.value)})}
                    className="border rounded-lg px-3 py-2 w-full text-sm" size={4}>
                    {criteriaOptions.cities.map(c => (
                      <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Non collectés depuis (jours)</label>
                  <input type="number" value={criteria.daysSinceCollection}
                    onChange={e => setCriteria({...criteria, daysSinceCollection: e.target.value})}
                    className="border rounded-lg px-3 py-2 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Taux de remplissage min (%)</label>
                  <input type="number" value={criteria.minFillRate}
                    onChange={e => setCriteria({...criteria, minFillRate: e.target.value})}
                    className="border rounded-lg px-3 py-2 w-full text-sm"
                    placeholder="Ex: 50" />
                </div>
              </div>
            </div>
          )}

          <button onClick={handleGenerate} disabled={generating}
            className="bg-soltex-green text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-soltex-green/90 disabled:opacity-50">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? 'Génération...' : 'Générer'}
          </button>

          {genResult && (
            <div className={`mt-4 p-4 rounded-lg ${genResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {genResult.error ? (
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {genResult.error}</div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 font-medium"><Check className="w-4 h-4" /> {genResult.created} tournée(s) créée(s)</div>
                  {genResult.totalPoints && <div className="text-sm mt-1">{genResult.totalPoints} CAV planifiés — {genResult.remainingPoints} restants</div>}
                  {genResult.message && <div className="text-sm mt-1">{genResult.message}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
