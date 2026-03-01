import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Users, Briefcase, CheckCircle, Clock, AlertTriangle, ClipboardList, Shield } from 'lucide-react';

const STATUS_LABELS = {
  candidature_recue: 'Candidatures reçues',
  a_qualifier: 'À qualifier',
  non_retenu: 'Non retenu',
  convoque: 'Convoqués',
  recrute: 'Recrutés'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [assignmentStats, setAssignmentStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [candidatesRes, positionsRes, assignStatsRes] = await Promise.all([
          api.get('/recruitment/candidates/kanban'),
          api.get('/recruitment/positions'),
          api.get(`/team/assignments/stats/${today}`).catch(() => ({ data: null }))
        ]);

        const kanban = candidatesRes.data;
        const positions = positionsRes.data;

        setStats({
          totalCandidates: Object.values(kanban).flat().length,
          byStatus: Object.entries(kanban).map(([status, candidates]) => ({
            status,
            label: STATUS_LABELS[status] || status,
            count: candidates.length
          })),
          totalPositions: positions.length,
          openPositions: positions.reduce((sum, p) => sum + (p.openPositions - p.filledPositions), 0),
          recentCandidates: kanban.candidature_recue?.slice(0, 5) || []
        });
        setAssignmentStats(assignStatsRes.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement du tableau de bord...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">Erreur de chargement</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-soltex-gray-dark mb-6">Tableau de bord</h1>

      {/* Alerte affectations */}
      {assignmentStats?.mandatoryMissing?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" /> Postes obligatoires non affectés aujourd'hui
          </div>
          <div className="flex flex-wrap gap-2">
            {assignmentStats.mandatoryMissing.map(s => (
              <span key={s.id} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                {s.name}
              </span>
            ))}
          </div>
          <Link to="/equipe/affectations" className="text-red-600 text-xs hover:underline mt-2 inline-block">
            Voir les affectations
          </Link>
        </div>
      )}

      {/* KPIs Recrutement + Affectations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCandidates}</p>
              <p className="text-sm text-gray-500">Candidatures</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.openPositions}</p>
              <p className="text-sm text-gray-500">Postes ouverts</p>
            </div>
          </div>
        </div>

        {assignmentStats && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{assignmentStats.filledStations}/{assignmentStats.totalStations}</p>
                  <p className="text-sm text-gray-500">Postes pourvus</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${assignmentStats.mandatoryMissing?.length ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Shield className={`w-6 h-6 ${assignmentStats.mandatoryMissing?.length ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{assignmentStats.mandatoryFilled}/{assignmentStats.mandatoryTotal}</p>
                  <p className="text-sm text-gray-500">Obligatoires pourvus</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!assignmentStats && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.byStatus.find(s => s.status === 'convoque')?.count || 0}
                  </p>
                  <p className="text-sm text-gray-500">Convoqués</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.byStatus.find(s => s.status === 'recrute')?.count || 0}
                  </p>
                  <p className="text-sm text-gray-500">Recrutés</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pipeline de recrutement</h2>
        <div className="flex gap-2 items-end h-40">
          {stats.byStatus.filter(s => s.status !== 'non_retenu').map(({ status, label, count }) => {
            const maxCount = Math.max(...stats.byStatus.map(s => s.count), 1);
            const height = Math.max((count / maxCount) * 100, 8);
            const colors = {
              candidature_recue: 'bg-blue-400',
              a_qualifier: 'bg-amber-400',
              convoque: 'bg-purple-400',
              recrute: 'bg-green-400'
            };
            return (
              <div key={status} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-lg font-bold text-gray-700">{count}</span>
                <div
                  className={`w-full rounded-t-lg ${colors[status] || 'bg-gray-300'} transition-all`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dernières candidatures */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Dernières candidatures</h2>
          <Link to="/recrutement" className="text-soltex-green text-sm hover:underline">
            Voir le Kanban
          </Link>
        </div>
        {stats.recentCandidates.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune candidature récente</p>
        ) : (
          <div className="space-y-3">
            {stats.recentCandidates.map(c => (
              <Link
                key={c.id}
                to={`/recrutement/candidat/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-soltex-green/10 rounded-full flex items-center justify-center">
                    <span className="text-soltex-green font-semibold text-sm">
                      {(c.firstName?.[0] || '?')}{(c.lastName?.[0] || '?')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.applicationDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
