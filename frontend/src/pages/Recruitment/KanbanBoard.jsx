import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import {
  Inbox, XCircle, CheckCircle, Calendar, Award,
  Plus, ChevronRight, FileText, User
} from 'lucide-react';

const COLUMNS = [
  { key: 'candidature_recue', label: 'Candidatures reçues', icon: Inbox, color: 'border-kanban-received', bgHeader: 'bg-blue-50', textColor: 'text-blue-700' },
  { key: 'candidature_qualifiee', label: 'Qualifiées', icon: CheckCircle, color: 'border-kanban-qualified', bgHeader: 'bg-amber-50', textColor: 'text-amber-700' },
  { key: 'entretien_confirme', label: 'Entretien confirmé', icon: Calendar, color: 'border-kanban-interview', bgHeader: 'bg-purple-50', textColor: 'text-purple-700' },
  { key: 'recrutement_valide', label: 'Recrutement validé', icon: Award, color: 'border-kanban-validated', bgHeader: 'bg-green-50', textColor: 'text-green-700' },
  { key: 'candidature_rejetee', label: 'Rejetées', icon: XCircle, color: 'border-kanban-rejected', bgHeader: 'bg-red-50', textColor: 'text-red-700' },
];

export default function KanbanBoard() {
  const [kanban, setKanban] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ firstName: '', lastName: '', email: '' });
  const [cvFile, setCvFile] = useState(null);

  const fetchKanban = async () => {
    try {
      const res = await api.get('/recruitment/candidates/kanban');
      setKanban(res.data);
    } catch (err) {
      console.error('Kanban error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKanban(); }, []);

  const moveCandidate = async (candidateId, newStatus, comment = '') => {
    try {
      await api.put(`/recruitment/candidates/${candidateId}/move`, {
        status: newStatus,
        comment
      });
      fetchKanban();
    } catch (err) {
      console.error('Move error:', err);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('firstName', newCandidate.firstName);
      formData.append('lastName', newCandidate.lastName);
      formData.append('email', newCandidate.email);
      if (cvFile) formData.append('cv', cvFile);

      await api.post('/recruitment/candidates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddModal(false);
      setNewCandidate({ firstName: '', lastName: '', email: '' });
      setCvFile(null);
      fetchKanban();
    } catch (err) {
      console.error('Add error:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement du Kanban...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-soltex-gray-dark">Suivi des candidatures</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-soltex-green hover:bg-soltex-green-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle candidature
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const Icon = col.icon;
          const candidates = kanban?.[col.key] || [];

          return (
            <div key={col.key} className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-sm border-t-4 ${col.color}`}>
              <div className={`p-4 ${col.bgHeader} rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${col.textColor}`} />
                    <h3 className={`font-semibold text-sm ${col.textColor}`}>{col.label}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${col.bgHeader} ${col.textColor}`}>
                    {candidates.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 min-h-[200px] max-h-[70vh] overflow-y-auto">
                {candidates.map(candidate => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    currentStatus={col.key}
                    onMove={moveCandidate}
                  />
                ))}

                {candidates.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-sm">
                    Aucune candidature
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal ajout candidature */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Nouvelle candidature</h2>
            </div>
            <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={newCandidate.firstName}
                    onChange={e => setNewCandidate({ ...newCandidate, firstName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newCandidate.lastName}
                    onChange={e => setNewCandidate({ ...newCandidate, lastName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newCandidate.email}
                  onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-soltex-green focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CV (PDF, DOC)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.odt"
                  onChange={e => setCvFile(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-soltex-green/10 file:text-soltex-green hover:file:bg-soltex-green/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-soltex-green text-white rounded-lg hover:bg-soltex-green-dark text-sm font-medium"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ candidate, currentStatus, onMove }) {
  const [showActions, setShowActions] = useState(false);

  const possibleMoves = COLUMNS
    .filter(c => c.key !== currentStatus)
    .map(c => ({ key: c.key, label: c.label }));

  return (
    <div className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow group relative">
      <Link to={`/recrutement/candidat/${candidate.id}`} className="block">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-soltex-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-soltex-green" />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800">
                {candidate.firstName} {candidate.lastName}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(candidate.applicationDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          {candidate.cvFilePath && (
            <FileText className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {candidate.jobPosition && (
          <div className="mt-2">
            <span className="text-xs bg-soltex-green/10 text-soltex-green px-2 py-1 rounded-full">
              {candidate.jobPosition.title}
            </span>
          </div>
        )}

        {candidate.personalityTest?.status === 'completed' && (
          <div className="mt-2">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              PCM: {candidate.personalityTest.baseType}
            </span>
          </div>
        )}
      </Link>

      {/* Bouton déplacer */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-soltex-green"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {showActions && (
        <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border py-1 w-48">
          {possibleMoves.map(move => (
            <button
              key={move.key}
              onClick={(e) => {
                e.stopPropagation();
                onMove(candidate.id, move.key);
                setShowActions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {move.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
