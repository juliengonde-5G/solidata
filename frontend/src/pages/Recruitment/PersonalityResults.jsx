import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, Brain, AlertTriangle, Shield, Users } from 'lucide-react';

const TYPE_COLORS = {
  empathique: { bg: 'bg-pink-100', text: 'text-pink-700', bar: 'bg-pink-500' },
  travaillomane: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
  perseverant: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
  reveur: { bg: 'bg-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  promoteur: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  rebelle: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' }
};

const TYPE_NAMES = {
  empathique: 'Empathique',
  travaillomane: 'Travaillomane',
  perseverant: 'Persévérant',
  reveur: 'Rêveur',
  promoteur: 'Promoteur',
  rebelle: 'Rebelle'
};

export default function PersonalityResults() {
  const { testId } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await api.get(`/recruitment/personality/${testId}/results`);
        setResults(res.data);
      } catch (err) {
        console.error('Fetch results error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [testId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement des résultats...</div>;
  if (!results) return <div className="text-center py-12 text-red-500">Résultats non disponibles</div>;

  const sortedScores = Object.entries(results.scores)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/recrutement" className="flex items-center gap-2 text-soltex-green hover:underline mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Retour aux candidatures
      </Link>

      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Profil PCM - {results.candidate?.firstName} {results.candidate?.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              Test complété le {new Date(results.completedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <div className={`px-4 py-2 rounded-lg ${TYPE_COLORS[results.baseType]?.bg} ${TYPE_COLORS[results.baseType]?.text}`}>
            <span className="text-xs uppercase tracking-wider">Base</span>
            <p className="font-bold">{TYPE_NAMES[results.baseType]}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${TYPE_COLORS[results.phaseType]?.bg} ${TYPE_COLORS[results.phaseType]?.text}`}>
            <span className="text-xs uppercase tracking-wider">Phase</span>
            <p className="font-bold">{TYPE_NAMES[results.phaseType]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scores */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Profil de personnalité</h2>
          <div className="space-y-4">
            {sortedScores.map(([type, score]) => {
              const colors = TYPE_COLORS[type] || {};
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${colors.text}`}>{TYPE_NAMES[type]}</span>
                    <span className="text-sm text-gray-500">{score}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${colors.bar}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comportements sous stress */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Comportements sous stress
          </h2>
          {results.stressBehaviors && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Stress léger (niveau 1)</p>
                <p className="text-sm text-gray-700">{results.stressBehaviors.stressNiveau1}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">Stress fort (niveau 2)</p>
                <p className="text-sm text-gray-700">{results.stressBehaviors.stressNiveau2}</p>
              </div>
            </div>
          )}
        </div>

        {/* Facteurs de risque RPS */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Risques psychosociaux
          </h2>
          {results.riskFactors && (
            <div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                results.riskFactors.niveau === 'élevé' ? 'bg-red-100 text-red-700' :
                results.riskFactors.niveau === 'modéré' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                Niveau : {results.riskFactors.niveau}
              </div>
              <ul className="space-y-2">
                {results.riskFactors.facteurs?.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-1">•</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 bg-soltex-green/5 rounded-lg p-3">
                <p className="text-xs font-semibold text-soltex-green uppercase mb-1">Recommandation management</p>
                <p className="text-sm text-gray-700">{results.riskFactors.recommandationsManagement}</p>
              </div>
            </div>
          )}
        </div>

        {/* Compatibilités */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Compatibilités
          </h2>
          {results.incompatibilities && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-2">Points de vigilance</p>
                <div className="space-y-2">
                  {results.incompatibilities.profilsVigilance?.map((p, i) => (
                    <div key={i} className="bg-red-50 rounded-lg p-3">
                      <p className="font-medium text-sm text-red-700">{p.nom}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.raison}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase mb-2">Profils complémentaires</p>
                <div className="flex flex-wrap gap-2">
                  {results.incompatibilities.profilsComplementaires?.map((p, i) => (
                    <span key={i} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                      {p.nom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Synthèse complète */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Synthèse complète</h2>
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
          {results.summary}
        </div>
      </div>
    </div>
  );
}
