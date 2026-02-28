import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { ChevronLeft, ChevronRight, MapPin, Truck } from 'lucide-react';

const ASSIGNMENTS = {
  collecte: { label: 'Collecte', color: 'bg-blue-500', emoji: '🚛' },
  tri: { label: 'Tri', color: 'bg-purple-500', emoji: '🧵' },
  boutique: { label: 'Boutique', color: 'bg-pink-500', emoji: '🏪' },
  logistique: { label: 'Logistique', color: 'bg-orange-500', emoji: '📦' },
  formation: { label: 'Formation', color: 'bg-teal-500', emoji: '📚' },
  repos: { label: 'Repos', color: 'bg-gray-300', emoji: '🏠' },
  absence: { label: 'Absence', color: 'bg-red-400', emoji: '❌' },
  conge: { label: 'Congé', color: 'bg-yellow-400', emoji: '🌴' }
};

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function MonPlanning() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchPlanning() {
      setLoading(true);
      try {
        const { data } = await api.get('/team/planning', {
          params: { startDate: weekDates[0], endDate: weekDates[6] }
        });
        // Filtrer sur l'employé connecté (par email ou userId)
        // Le backend renvoie tous les plannings, on filtre côté client
        setPlannings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlanning();
  }, [weekOffset]);

  // Trouver le planning de l'utilisateur pour un jour
  const getMyPlanning = (date) => {
    return plannings.find(p => {
      const empEmail = p.employee?.email;
      return p.date === date && empEmail === user?.email;
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Mon planning</h1>

      {/* Navigation semaine */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-2xl shadow-sm p-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">
            {new Date(weekDates[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — {new Date(weekDates[6]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button onClick={() => setWeekOffset(0)} className="text-sm text-soltex-green hover:underline mt-1">Cette semaine</button>
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-95 transition-all">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {weekDates.map((date, i) => {
            const p = getMyPlanning(date);
            const assignment = p ? ASSIGNMENTS[p.assignment] : null;
            const isToday = date === today;
            const isWeekend = i >= 5;

            return (
              <div
                key={date}
                className={`bg-white rounded-2xl shadow-sm p-5 transition-all ${isToday ? 'ring-2 ring-soltex-green ring-offset-2' : ''} ${isWeekend && !p ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Jour */}
                    <div className={`text-center min-w-[60px] ${isToday ? 'text-soltex-green' : 'text-gray-500'}`}>
                      <p className="text-xs font-semibold uppercase">{JOURS[i]}</p>
                      <p className="text-2xl font-bold">{new Date(date).getDate()}</p>
                    </div>

                    {/* Activité */}
                    {assignment ? (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{assignment.emoji}</span>
                        <div>
                          <p className="text-lg font-bold text-gray-800">{assignment.label}</p>
                          {p.route && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.route.name}</p>}
                          {p.vehicle && <p className="text-sm text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" /> {p.vehicle.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-lg">{isWeekend ? 'Week-end' : 'Pas d\'affectation'}</p>
                    )}
                  </div>

                  {/* Badge couleur */}
                  {assignment && (
                    <div className={`w-4 h-12 rounded-full ${assignment.color}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
