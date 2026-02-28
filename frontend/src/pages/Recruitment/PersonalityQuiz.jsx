import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ChevronLeft, ChevronRight, Check, Brain } from 'lucide-react';

// Icônes visuelles pour les questions
const VISUAL_HINTS = {
  people_meeting: '🤝',
  happy_person: '😊',
  weekend: '🏖️',
  work_motivation: '💼',
  task_given: '📋',
  work_frustration: '😤',
  mild_stress: '😰',
  high_stress: '🔥',
  relationships: '❤️',
  comforting: '🤗',
  needs: '🌟',
  unmet_needs: '😔',
  running_late: '⏰',
  criticism: '💬',
  dream_job: '✨'
};

export default function PersonalityQuiz() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [candidateName, setCandidateName] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [questionsRes, statusRes] = await Promise.all([
          api.get('/recruitment/personality/questions'),
          api.get(`/recruitment/personality/${testId}/status`)
        ]);
        setQuestions(questionsRes.data.questions);
        setCandidateName(statusRes.data.candidateName || '');

        // Si test déjà complété
        if (statusRes.data.isComplete) {
          setCompleted(true);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [testId]);

  const handleAnswer = async (questionId, answerId) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));

    try {
      await api.put(`/recruitment/personality/${testId}/answer`, {
        questionId,
        answer: answerId
      });
    } catch (err) {
      console.error('Save answer error:', err);
    }

    // Auto-avancer à la question suivante après un court délai
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 400);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await api.post(`/recruitment/personality/${testId}/complete`);
      setResults(res.data.results);
      setCompleted(true);
    } catch (err) {
      console.error('Complete error:', err);
      alert(err.response?.data?.error || 'Erreur lors de la finalisation');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 text-lg">Chargement du questionnaire...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Merci !</h1>
          <p className="text-gray-500 mb-6 text-lg">Le test est terminé.</p>
          <div className="bg-purple-50 rounded-xl p-6 mb-6">
            <p className="text-purple-700 text-lg">Vos réponses ont été enregistrées avec succès.</p>
            <p className="text-purple-500 text-sm mt-2">L'équipe RH analysera votre profil.</p>
          </div>
          <p className="text-gray-400 text-sm">Vous pouvez fermer cette page.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = (Object.keys(answers).length / questions.length) * 100;
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Brain className="w-8 h-8 text-purple-600" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">
              Test de personnalité {candidateName ? `- ${candidateName}` : ''}
            </h1>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-500 font-medium">
            {Object.keys(answers).length}/{questions.length}
          </span>
        </div>
      </div>

      {/* Instruction pour première question */}
      {currentIndex === 0 && Object.keys(answers).length === 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-purple-700 text-lg font-medium">
              Il n'y a pas de bonne ou mauvaise réponse.
            </p>
            <p className="text-purple-500 text-sm mt-1">
              Répondez spontanément, selon ce qui vous ressemble le plus.
            </p>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="max-w-2xl mx-auto p-4 mt-4">
        {currentQuestion && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            {/* Numéro et icône visuelle */}
            <div className="text-center mb-6">
              <span className="text-6xl mb-4 block">
                {VISUAL_HINTS[currentQuestion.visualHint] || '❓'}
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Question {currentIndex + 1} sur {questions.length}
              </span>
            </div>

            {/* Question */}
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 text-center mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            {/* Options - grandes zones cliquables avec emojis pour accessibilité */}
            <div className="space-y-3">
              {currentQuestion.options.map(option => {
                const isSelected = answers[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    className={`
                      w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all text-base sm:text-lg flex items-center gap-4
                      ${isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-800 font-medium shadow-md scale-[1.02]'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 text-gray-700'
                      }
                    `}
                  >
                    <span className="text-2xl sm:text-3xl flex-shrink-0">{option.emoji}</span>
                    <span>{option.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-30 text-sm font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Précédent
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium shadow-md"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!allAnswered || completing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium shadow-md"
            >
              <Check className="w-5 h-5" />
              {completing ? 'Finalisation...' : 'Terminer le test'}
            </button>
          )}
        </div>

        {/* Indicateur de navigation rapide */}
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full transition-all text-xs font-bold flex items-center justify-center ${
                answers[q.id]
                  ? 'bg-purple-600 text-white'
                  : i === currentIndex
                    ? 'bg-purple-200 text-purple-700'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
