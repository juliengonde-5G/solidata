import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import api from '../../utils/api';
import {
  Inbox, XCircle, Phone, Award, Send,
  Plus, ChevronLeft, ChevronRight, FileText, User, Car, Wrench, GripVertical, UserX
} from 'lucide-react';

const COLUMNS = [
  { key: 'candidature_recue', label: 'Candidatures reçues', icon: Inbox, color: 'border-blue-400', bgHeader: 'bg-blue-50', textColor: 'text-blue-700', dropBg: 'bg-blue-50/50' },
  { key: 'a_convoquer', label: 'À convoquer', icon: Send, color: 'border-amber-400', bgHeader: 'bg-amber-50', textColor: 'text-amber-700', dropBg: 'bg-amber-50/50' },
  { key: 'non_retenu', label: 'Non retenu', icon: XCircle, color: 'border-red-400', bgHeader: 'bg-red-50', textColor: 'text-red-700', dropBg: 'bg-red-50/50' },
  { key: 'convoque', label: 'Convoqué', icon: Phone, color: 'border-purple-400', bgHeader: 'bg-purple-50', textColor: 'text-purple-700', dropBg: 'bg-purple-50/50' },
  { key: 'recrute', label: 'Recruté', icon: Award, color: 'border-green-400', bgHeader: 'bg-green-50', textColor: 'text-green-700', dropBg: 'bg-green-50/50' },
  { key: 'refus_candidat', label: 'Refus candidat', icon: UserX, color: 'border-gray-400', bgHeader: 'bg-gray-50', textColor: 'text-gray-700', dropBg: 'bg-gray-50/50' },
];

export default function KanbanBoard() {
  const [kanban, setKanban] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ firstName: '', lastName: '', email: '', permisB: false, caces: false });
  const [cvFile, setCvFile] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

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

  // Scroll navigation
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll, kanban]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 300, behavior: 'smooth' });
  };

  const moveCandidate = async (candidateId, newStatus) => {
    try {
      await api.put(`/recruitment/candidates/${candidateId}/move`, { status: newStatus });
      fetchKanban();
    } catch (err) {
      console.error('Move error:', err);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    // Find the candidate across all columns
    for (const col of COLUMNS) {
      const found = (kanban?.[col.key] || []).find(c => String(c.id) === String(active.id));
      if (found) {
        setActiveCard({ ...found, currentStatus: col.key });
        break;
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    // over.id is the column key (droppable id)
    const targetColumn = over.id;
    const candidateId = active.id;

    // Find current column
    let currentColumn = null;
    for (const col of COLUMNS) {
      if ((kanban?.[col.key] || []).find(c => String(c.id) === String(candidateId))) {
        currentColumn = col.key;
        break;
      }
    }

    if (currentColumn && targetColumn !== currentColumn) {
      // Optimistic update
      setKanban(prev => {
        const updated = { ...prev };
        const candidate = updated[currentColumn].find(c => String(c.id) === String(candidateId));
        if (candidate) {
          updated[currentColumn] = updated[currentColumn].filter(c => String(c.id) !== String(candidateId));
          updated[targetColumn] = [...(updated[targetColumn] || []), candidate];
        }
        return updated;
      });
      moveCandidate(candidateId, targetColumn);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('firstName', newCandidate.firstName);
      formData.append('lastName', newCandidate.lastName);
      formData.append('email', newCandidate.email);
      formData.append('permisB', newCandidate.permisB);
      formData.append('caces', newCandidate.caces);
      if (cvFile) formData.append('cv', cvFile);

      await api.post('/recruitment/candidates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddModal(false);
      setNewCandidate({ firstName: '', lastName: '', email: '', permisB: false, caces: false });
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

      {/* Kanban Board with scroll navigation */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-soltex-green transition-colors border"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-soltex-green transition-colors border"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 px-1 scroll-smooth"
            style={{ scrollbarWidth: 'thin' }}
          >
            {COLUMNS.map(col => (
              <KanbanColumn key={col.key} col={col} candidates={kanban?.[col.key] || []} />
            ))}
          </div>

          <DragOverlay>
            {activeCard && <CandidateCardContent candidate={activeCard} isDragOverlay />}
          </DragOverlay>
        </DndContext>
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
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCandidate.permisB}
                    onChange={e => setNewCandidate({ ...newCandidate, permisB: e.target.checked })}
                    className="w-4 h-4 text-soltex-green rounded focus:ring-soltex-green"
                  />
                  <Car className="w-4 h-4 text-gray-400" />
                  Permis B
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCandidate.caces}
                    onChange={e => setNewCandidate({ ...newCandidate, caces: e.target.checked })}
                    className="w-4 h-4 text-soltex-green rounded focus:ring-soltex-green"
                  />
                  <Wrench className="w-4 h-4 text-gray-400" />
                  CACES
                </label>
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

function KanbanColumn({ col, candidates }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const Icon = col.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-sm border-t-4 ${col.color} transition-colors ${isOver ? col.dropBg + ' ring-2 ring-offset-1 ring-soltex-green/40' : ''}`}
    >
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
          <DraggableCandidateCard key={candidate.id} candidate={candidate} />
        ))}

        {candidates.length === 0 && (
          <div className={`text-center py-8 text-sm rounded-lg border-2 border-dashed ${isOver ? 'border-soltex-green/40 text-soltex-green' : 'border-gray-200 text-gray-300'}`}>
            {isOver ? 'Déposer ici' : 'Aucune candidature'}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCandidateCard({ candidate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(candidate.id),
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-30' : ''}`}
    >
      <CandidateCardContent candidate={candidate} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CandidateCardContent({ candidate, isDragOverlay = false, dragHandleProps = {} }) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 transition-shadow group relative ${isDragOverlay ? 'shadow-xl ring-2 ring-soltex-green/30 rotate-2' : 'hover:shadow-md'}`}>
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <Link to={`/recrutement/candidat/${candidate.id}`} className="block" onClick={e => isDragOverlay && e.preventDefault()}>
        <div className="flex items-start justify-between pr-6">
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

        {/* Badges */}
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.jobPosition && (
            <span className="text-xs bg-soltex-green/10 text-soltex-green px-2 py-0.5 rounded-full">
              {candidate.jobPosition.title}
            </span>
          )}
          {candidate.permisB && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Car className="w-3 h-3" /> B
            </span>
          )}
          {candidate.caces && (
            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wrench className="w-3 h-3" /> CACES
            </span>
          )}
          {candidate.personalityTest?.status === 'completed' && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              PCM: {candidate.personalityTest.baseType}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
