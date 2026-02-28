import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ChevronLeft, ChevronRight, Check, Brain } from 'lucide-react';

// Icônes visuelles pour les personnes avec compétences linguistiques limitées
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

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await api.get('/recruitment/personality/questions');
        setQuestions(res.data.questions);
      } catch (err) {
        console.error('Fetch questions error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

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

  if (loading) return <div className="text-center py-12 text-gray-500">Chargement du questionnaire...</div>;

  if (completed && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-soltex-gray flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Test terminé !</h1>
          <p className="text-gray-500 mb-6">Merci d'avoir répondu au questionnaire.</p>
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-600">Vos résultats ont été enregistrés.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = (Object.keys(answers).length / questions.length) * 100;
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-soltex-gray">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Brain className="w-8 h-8 text-purple-600" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">Test de personnalité</h1>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {Object.keys(answers).length}/{questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto p-4 mt-8">
        {currentQuestion && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Numéro et icône visuelle */}
            <div className="text-center mb-6">
              <span className="text-4xl mb-4 block">
                {VISUAL_HINTS[currentQuestion.visualHint] || '❓'}
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Question {currentIndex + 1} sur {questions.length}
              </span>
            </div>

            {/* Question */}
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>

            {/* Options - grandes zones cliquables pour accessibilité */}
            <div className="space-y-3">
              {currentQuestion.options.map(option => {
                const isSelected = answers[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all text-base
                      ${isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-800 font-medium'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 text-gray-700'
                      }
                    `}
                  >
                    {option.text}
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
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-30 text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            Précédent
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!allAnswered || completing}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              <Check className="w-5 h-5" />
              {completing ? 'Finalisation...' : 'Terminer le test'}
            </button>
          )}
        </div>

        {/* Indicateur de navigation rapide */}
        <div className="flex justify-center gap-1 mt-4">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                answers[q.id]
                  ? 'bg-purple-600'
                  : i === currentIndex
                    ? 'bg-purple-300'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
