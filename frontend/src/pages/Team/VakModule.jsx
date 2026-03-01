import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Calendar, Users, Settings, ChevronRight } from 'lucide-react';

export default function VakModule() {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [vakStations, setVakStations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [eventForm, setEventForm] = useState({ name: '', startDate: '', endDate: '' });
  const [stationForm, setStationForm] = useState({ name: '', mandatory: true });

  useEffect(() => {
    api.get('/team/vak/events').then(r => setEvents(r.data)).catch(console.error);
    api.get('/team/vak/workstations').then(r => setVakStations(r.data)).catch(console.error);
    api.get('/team/employees?active=true').then(r => setEmployees(r.data)).catch(console.error);
  }, []);

  // Jours d'une VAK
  const getVakDays = (event) => {
    if (!event) return [];
    const days = [];
    let current = new Date(event.startDate);
    const end = new Date(event.endDate);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const loadAssignments = async (eventId, date) => {
    if (!eventId || !date) return;
    try {
      const res = await api.get(`/team/vak/assignments/${eventId}/${date}`);
      setAssignments(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    const days = getVakDays(event);
    if (days.length > 0) {
      setSelectedDate(days[0]);
      loadAssignments(event.id, days[0]);
    }
  };

  const handleAssign = async (vakWorkStationId, employeeId) => {
    try {
      await api.put('/team/vak/assignments', {
        vakEventId: selectedEvent.id,
        date: selectedDate,
        vakWorkStationId,
        employeeId: employeeId || null
      });
      loadAssignments(selectedEvent.id, selectedDate);
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/team/vak/events', eventForm);
      setEventForm({ name: '', startDate: '', endDate: '' });
      const res = await api.get('/team/vak/events');
      setEvents(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Supprimer cette VAK et toutes ses affectations ?')) return;
    try {
      await api.delete(`/team/vak/events/${id}`);
      setEvents(events.filter(e => e.id !== id));
      if (selectedEvent?.id === id) { setSelectedEvent(null); setAssignments([]); }
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleCreateStation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/team/vak/workstations', stationForm);
      setStationForm({ name: '', mandatory: true });
      const res = await api.get('/team/vak/workstations');
      setVakStations(res.data);
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  const handleDeleteStation = async (id) => {
    if (!confirm('Supprimer ce poste VAK ?')) return;
    try {
      await api.delete(`/team/vak/workstations/${id}`);
      setVakStations(vakStations.filter(s => s.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Erreur'); }
  };

  // Map affectation par poste
  const assignMap = {};
  assignments.forEach(a => { assignMap[a.vakWorkStationId] = a; });

  const assignedIds = new Set(assignments.map(a => a.employeeId));

  return (
    <div>
      <h1 className="text-2xl font-bold text-purple-700 mb-6">Module VAK (Vente au Kilo)</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-sm p-1.5">
        {[
          { key: 'events', label: 'Événements', icon: Calendar },
          { key: 'stations', label: 'Postes VAK', icon: Settings },
          { key: 'planning', label: 'Planning', icon: Users }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors
              ${tab === t.key ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* EVENTS TAB */}
      {tab === 'events' && (
        <div>
          <form onSubmit={handleCreateEvent} className="bg-purple-50 rounded-xl p-6 mb-6 border border-purple-100">
            <h3 className="font-semibold text-purple-700 mb-4">Créer un événement VAK</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required placeholder="VAK Printemps 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                <input type="date" value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                <input type="date" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required />
              </div>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 justify-center">
                <Plus className="w-4 h-4" /> Créer
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-400 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-purple-700">{ev.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Du {new Date(ev.startDate).toLocaleDateString('fr-FR')} au {new Date(ev.endDate).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{getVakDays(ev).length} jours</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { handleSelectEvent(ev); setTab('planning'); }}
                      className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATIONS TAB */}
      {tab === 'stations' && (
        <div>
          <form onSubmit={handleCreateStation} className="bg-purple-50 rounded-xl p-6 mb-6 border border-purple-100">
            <h3 className="font-semibold text-purple-700 mb-4">Nouveau poste VAK</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du poste</label>
                <input type="text" value={stationForm.name} onChange={e => setStationForm({ ...stationForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none" required placeholder="Caisse Entrée" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={stationForm.mandatory} onChange={e => setStationForm({ ...stationForm, mandatory: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                  <option value="true">Obligatoire</option>
                  <option value="false">Facultatif</option>
                </select>
              </div>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 justify-center">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vakStations.map(s => (
              <div key={s.id} className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${s.mandatory ? 'border-red-400' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-sm">{s.name}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${s.mandatory ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {s.mandatory ? 'OBLIGATOIRE' : 'FACULTATIF'}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteStation(s.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLANNING TAB */}
      {tab === 'planning' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choisir la VAK</label>
                <select value={selectedEvent?.id || ''} onChange={e => {
                  const ev = events.find(x => x.id === e.target.value);
                  if (ev) handleSelectEvent(ev);
                }} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                  <option value="">-- Sélectionner --</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journée</label>
                <select value={selectedDate} onChange={e => { setSelectedDate(e.target.value); loadAssignments(selectedEvent?.id, e.target.value); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                  {selectedEvent && getVakDays(selectedEvent).map(d => (
                    <option key={d} value={d}>{new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedEvent && selectedDate && (
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {vakStations.map(ws => {
                const assignment = assignMap[ws.id];
                return (
                  <div key={ws.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                    <div className="w-48 flex-shrink-0">
                      <span className="font-medium text-sm text-gray-800">{ws.name}</span>
                      {ws.mandatory && (
                        <span className="ml-2 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Obligatoire</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={assignment?.employeeId || ''}
                        onChange={e => handleAssign(ws.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${
                          assignment ? 'border-purple-300 bg-purple-50/30' : ws.mandatory ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                        }`}>
                        <option value="">-- Libre --</option>
                        {employees
                          .filter(e => e.active !== false)
                          .filter(e => assignment?.employeeId === e.id || !assignedIds.has(e.id))
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              {vakStations.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">Aucun poste VAK configuré. Allez dans l'onglet "Postes VAK".</div>
              )}
            </div>
          )}

          {!selectedEvent && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm text-gray-400">
              Sélectionnez un événement VAK pour voir le planning.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
