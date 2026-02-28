import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  ArrowLeft, User, FileText, Calendar, MessageSquare,
  ClipboardList, Brain, Download, Save
} from 'lucide-react';

const STATUS_LABELS = {
  candidature_recue: 'Candidature reçue',
  candidature_rejetee: 'Candidature rejetée',
  candidature_qualifiee: 'Candidature qualifiée',
  entretien_confirme: 'Entretien confirmé',
  recrutement_valide: 'Recrutement validé'
};

const STATUS_COLORS = {
  candidature_recue: 'bg-blue-100 text-blue-700',
  candidature_rejetee: 'bg-red-100 text-red-700',
  candidature_qualifiee: 'bg-amber-100 text-amber-700',
  entretien_confirme: 'bg-purple-100 text-purple-700',
  recrutement_valide: 'bg-green-100 text-green-700'
};

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [candRes, posRes] = await Promise.all([
          api.get(`/recruitment/candidates/${id}`),
          api.get('/recruitment/positions')
        ]);
        setCandidate(candRes.data);
        setPositions(posRes.data);
        setEditData({
          firstName: candRes.data.firstName,
          lastName: candRes.data.lastName,
          gender: candRes.data.gender,
          email: candRes.data.email,
          phone: candRes.data.phone,
          comments: candRes.data.comments || '',
          jobPositionId: candRes.data.jobPositionId || '',
          interviewReport: candRes.data.interviewReport || '',
          testReport: candRes.data.testReport || ''
        });
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/recruitment/candidates/${id}`, editData);
      setCandidate(res.data);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const startPersonalityTest = async () => {
    try {
      const res = await api.post(`/recruitment/personality/start/${id}`);
      navigate(`/recrutement/personnalite/${res.data.testId}`);
    } catch (err) {
      if (err.response?.data?.testId) {
        navigate(`/recrutement/personnalite/${err.response.data.testId}`);
      } else {
        console.error('Start test error:', err);
      }
    }
  };

  const downloadSummary = async () => {
    try {
      const res = await api.get(`/recruitment/candidates/${id}/summary`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_${candidate.lastName}_${candidate.firstName}.json`;
      a.click();
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  if (!candidate) return <div className="text-center py-12 text-red-500">Candidat non trouvé</div>;

  const isInterviewStage = ['entretien_confirme', 'recrutement_valide'].includes(candidate.status);

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/recrutement" className="flex items-center gap-2 text-soltex-green hover:underline mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Retour au Kanban
      </Link>

      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-soltex-green/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-soltex-green" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <p className="text-gray-500 text-sm">
                Candidature du {new Date(candidate.applicationDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[candidate.status]}`}>
            {STATUS_LABELS[candidate.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : infos et formulaire */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations personnelles
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Prénom</label>
                <input
                  type="text"
                  value={editData.firstName || ''}
                  onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nom</label>
                <input
                  type="text"
                  value={editData.lastName || ''}
                  onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Genre</label>
                <select
                  value={editData.gender || 'non_renseigne'}
                  onChange={e => setEditData({ ...editData, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                >
                  <option value="non_renseigne">Non renseigné</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={editData.phone || ''}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Commentaire */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Commentaires
            </h2>
            <textarea
              value={editData.comments || ''}
              onChange={e => setEditData({ ...editData, comments: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none resize-y"
              placeholder="Notes sur le candidat..."
            />
          </div>

          {/* Champs activés à partir de "Entretien confirmé" */}
          {isInterviewStage && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Évaluations
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Poste visé</label>
                    <select
                      value={editData.jobPositionId || ''}
                      onChange={e => setEditData({ ...editData, jobPositionId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
                    >
                      <option value="">Sélectionner un poste</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.department})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">CR Entretien</label>
                    <textarea
                      value={editData.interviewReport || ''}
                      onChange={e => setEditData({ ...editData, interviewReport: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none resize-y"
                      placeholder="Compte-rendu de l'entretien..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">CR Test / Mise en situation</label>
                    <textarea
                      value={editData.testReport || ''}
                      onChange={e => setEditData({ ...editData, testReport: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none resize-y"
                      placeholder="Compte-rendu du test / mise en situation professionnelle..."
                    />
                  </div>
                </div>
              </div>

              {/* Test de personnalité */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Test de personnalité (PCM)
                </h2>
                {candidate.personalityTest?.status === 'completed' ? (
                  <div>
                    <div className="flex gap-3 mb-4">
                      <span className="bg-soltex-green/10 text-soltex-green px-3 py-1 rounded-full text-sm font-medium">
                        Base: {candidate.personalityTest.baseType}
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                        Phase: {candidate.personalityTest.phaseType}
                      </span>
                    </div>
                    <Link
                      to={`/recrutement/personnalite/${candidate.personalityTest.id}`}
                      className="text-soltex-green hover:underline text-sm"
                    >
                      Voir les résultats complets
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={startPersonalityTest}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Lancer le test de personnalité
                  </button>
                )}
              </div>
            </>
          )}

          {/* Bouton sauvegarder */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-soltex-green hover:bg-soltex-green-dark text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>

        {/* Colonne droite : CV et historique */}
        <div className="space-y-6">
          {/* CV */}
          {candidate.cvFilePath && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CV
              </h3>
              <p className="text-xs text-gray-500 mb-2">{candidate.cvOriginalName}</p>
              <a
                href={`${import.meta.env.VITE_API_URL || ''}/uploads/${candidate.cvFilePath.split('/').pop()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-soltex-green hover:underline text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Télécharger le CV
              </a>
            </div>
          )}

          {/* Historique */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Historique
            </h3>
            <div className="space-y-3">
              {(candidate.history || []).map((h, i) => (
                <div key={h.id || i} className="border-l-2 border-soltex-green pl-3 py-1">
                  <p className="text-xs text-gray-500">
                    {new Date(h.changedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ''}
                    {STATUS_LABELS[h.toStatus]}
                  </p>
                  {h.comment && (
                    <p className="text-xs text-gray-400 mt-1">{h.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fiche SIRH (si validé) */}
          {candidate.status === 'recrutement_valide' && (
            <button
              onClick={downloadSummary}
              className="w-full bg-soltex-green hover:bg-soltex-green-dark text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger fiche SIRH
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
