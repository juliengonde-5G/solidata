import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  ArrowLeft, User, FileText, Calendar, MessageSquare,
  ClipboardList, Brain, Download, Save, Car, Wrench,
  UserCheck, Users, Copy, Check, ExternalLink
} from 'lucide-react';

const STATUS_LABELS = {
  candidature_recue: 'Candidature reçue',
  a_qualifier: 'À qualifier',
  non_retenu: 'Non retenu',
  convoque: 'Convoqué',
  recrute: 'Recruté'
};

const STATUS_COLORS = {
  candidature_recue: 'bg-blue-100 text-blue-700',
  a_qualifier: 'bg-amber-100 text-amber-700',
  non_retenu: 'bg-red-100 text-red-700',
  convoque: 'bg-purple-100 text-purple-700',
  recrute: 'bg-green-100 text-green-700'
};

const ASSESSMENT_LABELS = {
  conforme: { label: 'Conforme', color: 'bg-green-100 text-green-700 border-green-200' },
  faible: { label: 'Faible', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  recale: { label: 'Recalé', color: 'bg-red-100 text-red-700 border-red-200' }
};

const TEAMS = [
  { key: 'tri', label: 'Tri' },
  { key: 'collecte', label: 'Collecte' },
  { key: 'magasin_lhopital', label: "Magasin L'Hôpital" },
  { key: 'magasin_st_sever', label: 'Magasin St Sever' },
  { key: 'magasin_vernon', label: 'Magasin Vernon' },
  { key: 'administration', label: 'Administration' }
];

const DEPARTMENTS = [
  { key: 'collecte', label: 'Collecte' },
  { key: 'tri', label: 'Tri' },
  { key: 'logistique', label: 'Logistique' },
  { key: 'boutique', label: 'Boutique' },
  { key: 'administration', label: 'Administration' }
];

const CONTRACT_TYPES = [
  { key: 'cddi', label: 'CDDI' },
  { key: 'cdd', label: 'CDD' },
  { key: 'cdi', label: 'CDI' },
  { key: 'stage', label: 'Stage' },
  { key: 'service_civique', label: 'Service civique' }
];

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [positions, setPositions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitData, setRecruitData] = useState({
    team: '', department: '', contractType: 'cddi', hireDate: new Date().toISOString().split('T')[0], contractEndDate: ''
  });
  const [recruiting, setRecruiting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [candRes, posRes, usersRes] = await Promise.all([
          api.get(`/recruitment/candidates/${id}`),
          api.get('/recruitment/positions'),
          api.get('/recruitment/candidates/users')
        ]);
        setCandidate(candRes.data);
        setPositions(posRes.data);
        setUsers(usersRes.data);
        setEditData({
          firstName: candRes.data.firstName,
          lastName: candRes.data.lastName,
          gender: candRes.data.gender,
          email: candRes.data.email,
          phone: candRes.data.phone,
          permisB: candRes.data.permisB || false,
          caces: candRes.data.caces || false,
          comments: candRes.data.comments || '',
          jobPositionId: candRes.data.jobPositionId || '',
          // Mise en situation
          assessmentDone: candRes.data.assessmentDone || false,
          assessmentResult: candRes.data.assessmentResult || '',
          assessmentComment: candRes.data.assessmentComment || '',
          // Entretien
          interviewerId: candRes.data.interviewerId || '',
          interviewDate: candRes.data.interviewDate ? candRes.data.interviewDate.split('T')[0] : '',
          interviewComment: candRes.data.interviewComment || ''
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

  const copyTestLink = async () => {
    if (!candidate?.personalityTest?.id) return;
    const link = `${window.location.origin}/test-personnalite/${candidate.personalityTest.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      prompt('Copiez ce lien:', link);
    }
  };

  const handleRecruit = async () => {
    setRecruiting(true);
    try {
      const res = await api.post(`/recruitment/candidates/${id}/recruit`, recruitData);
      setCandidate(res.data.candidate);
      setShowRecruitModal(false);
      alert(res.data.message);
    } catch (err) {
      console.error('Recruit error:', err);
      alert(err.response?.data?.error || 'Erreur lors du recrutement');
    } finally {
      setRecruiting(false);
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

  const isConvoqueStage = ['convoque', 'recrute'].includes(candidate.status);

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
              <div className="flex gap-2 mt-1">
                {candidate.permisB && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Car className="w-3 h-3" /> Permis B
                  </span>
                )}
                {candidate.caces && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> CACES
                  </span>
                )}
              </div>
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
              <div className="flex gap-6 items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.permisB || false}
                    onChange={e => setEditData({ ...editData, permisB: e.target.checked })}
                    className="w-4 h-4 text-soltex-green rounded focus:ring-soltex-green"
                  />
                  <Car className="w-4 h-4 text-gray-400" />
                  Permis B
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.caces || false}
                    onChange={e => setEditData({ ...editData, caces: e.target.checked })}
                    className="w-4 h-4 text-soltex-green rounded focus:ring-soltex-green"
                  />
                  <Wrench className="w-4 h-4 text-gray-400" />
                  CACES
                </label>
              </div>
            </div>
          </div>

          {/* Poste visé */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Poste visé
            </h2>
            <select
              value={editData.jobPositionId || ''}
              onChange={e => setEditData({ ...editData, jobPositionId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none"
            >
              <option value="">Sélectionner un poste</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.department}) - {p.openPositions - p.filledPositions} poste(s) restant(s)
                </option>
              ))}
            </select>
          </div>

          {/* Commentaires */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Commentaires
            </h2>
            <textarea
              value={editData.comments || ''}
              onChange={e => setEditData({ ...editData, comments: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none resize-y"
              placeholder="Notes sur le candidat..."
            />
          </div>

          {/* === SECTION CONVOQUÉ === */}
          {isConvoqueStage && (
            <>
              {/* 1. Mise en situation professionnelle */}
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-400">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                  Mise en situation professionnelle
                </h2>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.assessmentDone || false}
                      onChange={e => setEditData({ ...editData, assessmentDone: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium">Test réalisé</span>
                  </label>

                  {editData.assessmentDone && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Avis</label>
                        <div className="flex gap-3">
                          {Object.entries(ASSESSMENT_LABELS).map(([key, info]) => (
                            <button
                              key={key}
                              onClick={() => setEditData({ ...editData, assessmentResult: key })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                editData.assessmentResult === key
                                  ? info.color + ' border-current'
                                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {info.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Commentaire</label>
                        <textarea
                          value={editData.assessmentComment || ''}
                          onChange={e => setEditData({ ...editData, assessmentComment: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                          placeholder="Observations lors de la mise en situation..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Test de personnalité PCM */}
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-400">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
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
                      className="text-soltex-green hover:underline text-sm font-medium"
                    >
                      Voir les résultats complets
                    </Link>
                  </div>
                ) : candidate.personalityTest?.status === 'in_progress' ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-sm text-amber-700">Test en cours - {candidate.personalityTest.responses?.length || 0}/15 réponses</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={copyTestLink}
                        className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-50 transition-colors"
                      >
                        {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {linkCopied ? 'Copié !' : 'Copier le lien'}
                      </button>
                      <a
                        href={`/test-personnalite/${candidate.personalityTest.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ouvrir le test
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">
                      Le test peut être rempli par le candidat seul (lien unique) ou accompagné par un membre RH.
                    </p>
                    <button
                      onClick={startPersonalityTest}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      Lancer le test de personnalité
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Suivi de l'entretien */}
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-400">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  Suivi de l'entretien
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Responsable de l'entretien</label>
                      <select
                        value={editData.interviewerId || ''}
                        onChange={e => setEditData({ ...editData, interviewerId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      >
                        <option value="">Sélectionner</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Date de l'entretien</label>
                      <input
                        type="date"
                        value={editData.interviewDate || ''}
                        onChange={e => setEditData({ ...editData, interviewDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Commentaire sur l'entretien</label>
                    <textarea
                      value={editData.interviewComment || ''}
                      onChange={e => setEditData({ ...editData, interviewComment: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y"
                      placeholder="Observations, ressenti, points abordés..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-soltex-green hover:bg-soltex-green-dark text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            {candidate.status === 'convoque' && (
              <button
                onClick={() => setShowRecruitModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Recruter et affecter
              </button>
            )}
          </div>
        </div>

        {/* Colonne droite */}
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

          {/* Équipe affectée (si recruté) */}
          {candidate.status === 'recrute' && candidate.assignedTeam && (
            <div className="bg-green-50 rounded-xl shadow-sm p-6 border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Affectation
              </h3>
              <p className="text-sm text-green-700 font-medium">
                {TEAMS.find(t => t.key === candidate.assignedTeam)?.label || candidate.assignedTeam}
              </p>
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
                    {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] || h.fromStatus} → ` : ''}
                    {STATUS_LABELS[h.toStatus] || h.toStatus}
                  </p>
                  {h.comment && (
                    <p className="text-xs text-gray-400 mt-1">{h.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fiche SIRH (si recruté) */}
          {candidate.status === 'recrute' && (
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

      {/* Modal Recrutement */}
      {showRecruitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Recruter {candidate.firstName} {candidate.lastName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Une fiche salarié sera automatiquement créée dans le module Équipe.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Équipe d'affectation *</label>
                <select
                  value={recruitData.team}
                  onChange={e => setRecruitData({ ...recruitData, team: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Sélectionner une équipe</option>
                  {TEAMS.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département *</label>
                <select
                  value={recruitData.department}
                  onChange={e => setRecruitData({ ...recruitData, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Sélectionner un département</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat *</label>
                <select
                  value={recruitData.contractType}
                  onChange={e => setRecruitData({ ...recruitData, contractType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  {CONTRACT_TYPES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                  <input
                    type="date"
                    value={recruitData.hireDate}
                    onChange={e => setRecruitData({ ...recruitData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin de contrat</label>
                  <input
                    type="date"
                    value={recruitData.contractEndDate}
                    onChange={e => setRecruitData({ ...recruitData, contractEndDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecruitModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRecruit}
                  disabled={recruiting || !recruitData.team || !recruitData.department}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                >
                  {recruiting ? 'En cours...' : 'Confirmer le recrutement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
