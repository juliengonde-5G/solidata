import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { BarChart3, Weight, MapPin, Users, TrendingUp } from 'lucide-react';

export default function ReportingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data } = await api.get('/reporting/reports/dashboard');
        setData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!data) return <div className="text-center py-12 text-gray-500">Erreur de chargement</div>;

  const maxWeight = Math.max(...(data.monthlyData?.map(m => m.weightKg) || [0]), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Reporting {data.year}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Weight className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.totalTonnage} t</p>
          <p className="text-sm text-gray-500">Tonnage collecté</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.totalCollections}</p>
          <p className="text-sm text-gray-500">Collectes réalisées</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.activePoints}</p>
          <p className="text-sm text-gray-500">Points actifs</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.activeEmployees}</p>
          <p className="text-sm text-gray-500">Salariés actifs</p>
        </div>
      </div>

      {/* Graphique mensuel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-soltex-green" /> Tonnage mensuel
        </h2>
        {data.monthlyData?.length > 0 ? (
          <div className="flex items-end gap-3 h-48">
            {data.monthlyData.map(m => {
              const height = Math.max((m.weightKg / maxWeight) * 100, 5);
              const month = m.period.split('-')[1];
              const monthNames = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
              return (
                <div key={m.period} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-600">{(m.weightKg / 1000).toFixed(1)}t</span>
                  <div className="w-full bg-soltex-green rounded-t-lg transition-all" style={{ height: `${height}%` }} />
                  <span className="text-xs text-gray-500">{monthNames[parseInt(month)]}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">Aucune donnée pour cette année</p>
        )}
      </div>
    </div>
  );
}
