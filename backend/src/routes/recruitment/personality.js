const express = require('express');
const { body, validationResult } = require('express-validator');
const { PersonalityTest, Candidate } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { PCM_QUESTIONS, processTestResults } = require('../../services/pcmTest');

const router = express.Router();

// GET /api/recruitment/personality/questions - Retourne le questionnaire PCM
router.get('/questions', (req, res) => {
  // Pas d'auth requise : le candidat peut y accéder directement
  res.json({
    title: 'Test de personnalité',
    description: 'Ce questionnaire permet de mieux vous connaître. Il n\'y a pas de bonne ou mauvaise réponse. Répondez spontanément.',
    totalQuestions: PCM_QUESTIONS.length,
    questions: PCM_QUESTIONS.map(q => ({
      id: q.id,
      category: q.category,
      text: q.text,
      visualHint: q.visualHint,
      options: q.options.map(o => ({
        id: o.id,
        text: o.text,
        emoji: o.emoji
      }))
    }))
  });
});

// POST /api/recruitment/personality/start/:candidateId - Démarrer un test
router.post('/start/:candidateId', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    // Vérifier qu'un test n'existe pas déjà
    let test = await PersonalityTest.findOne({
      where: { candidateId: candidate.id }
    });

    if (test && test.status === 'completed') {
      return res.status(400).json({ error: 'Test déjà complété', testId: test.id });
    }

    if (!test) {
      test = await PersonalityTest.create({
        candidateId: candidate.id,
        status: 'in_progress'
      });
      await candidate.update({ personalityTestId: test.id });
    }

    res.json({
      testId: test.id,
      status: test.status,
      responses: test.responses,
      // Inclure le lien public pour le candidat
      publicLink: `/test-personnalite/${test.id}`,
      questions: PCM_QUESTIONS.map(q => ({
        id: q.id,
        category: q.category,
        text: q.text,
        visualHint: q.visualHint,
        options: q.options.map(o => ({ id: o.id, text: o.text, emoji: o.emoji }))
      }))
    });
  } catch (err) {
    console.error('Start test error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/recruitment/personality/:testId/status - Statut du test (public)
router.get('/:testId/status', async (req, res) => {
  try {
    const test = await PersonalityTest.findByPk(req.params.testId, {
      include: [{ model: Candidate, attributes: ['firstName', 'lastName'] }]
    });

    if (!test) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    res.json({
      testId: test.id,
      status: test.status,
      candidateName: test.Candidate ? `${test.Candidate.firstName}` : null,
      answeredQuestions: test.responses?.length || 0,
      totalQuestions: PCM_QUESTIONS.length,
      isComplete: test.status === 'completed'
    });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/recruitment/personality/:testId/answer - Sauvegarder une réponse (public)
router.put('/:testId/answer', [
  body('questionId').notEmpty(),
  body('answer').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const test = await PersonalityTest.findByPk(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    if (test.status === 'completed') {
      return res.status(400).json({ error: 'Test déjà complété' });
    }

    const { questionId, answer } = req.body;
    const responses = [...(test.responses || [])];

    // Remplacer ou ajouter la réponse
    const existingIdx = responses.findIndex(r => r.questionId === questionId);
    if (existingIdx >= 0) {
      responses[existingIdx] = { questionId, answer };
    } else {
      responses.push({ questionId, answer });
    }

    await test.update({ responses, status: 'in_progress' });

    res.json({
      testId: test.id,
      answeredQuestions: responses.length,
      totalQuestions: PCM_QUESTIONS.length,
      isComplete: responses.length >= PCM_QUESTIONS.length
    });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/recruitment/personality/:testId/complete - Finaliser le test (public)
router.post('/:testId/complete', async (req, res) => {
  try {
    const test = await PersonalityTest.findByPk(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    if (test.status === 'completed') {
      return res.status(400).json({ error: 'Test déjà complété' });
    }

    if (!test.responses || test.responses.length < PCM_QUESTIONS.length) {
      return res.status(400).json({
        error: 'Toutes les questions doivent être répondues',
        answered: test.responses?.length || 0,
        required: PCM_QUESTIONS.length
      });
    }

    // Calculer les résultats enrichis
    const results = processTestResults(test.responses);

    await test.update({
      status: 'completed',
      scores: results.scores,
      baseType: results.baseType,
      phaseType: results.phaseType,
      stressBehaviors: results.stressBehaviors,
      riskFactors: results.riskFactors,
      incompatibilities: results.incompatibilities,
      collectiveBehavior: results.collectiveBehavior,
      strengthsWeaknesses: results.strengthsWeaknesses,
      summary: results.summary,
      completedAt: new Date()
    });

    res.json({
      testId: test.id,
      status: 'completed',
      results: {
        baseType: results.baseType,
        phaseType: results.phaseType,
        scores: results.scores,
        summary: results.summary,
        stressBehaviors: results.stressBehaviors,
        riskFactors: results.riskFactors,
        incompatibilities: results.incompatibilities,
        collectiveBehavior: results.collectiveBehavior,
        strengthsWeaknesses: results.strengthsWeaknesses
      }
    });
  } catch (err) {
    console.error('Complete test error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/recruitment/personality/:testId/results - Résultats du test
router.get('/:testId/results', authenticate, async (req, res) => {
  try {
    const test = await PersonalityTest.findByPk(req.params.testId, {
      include: [{ model: Candidate, attributes: ['firstName', 'lastName'] }]
    });

    if (!test) {
      return res.status(404).json({ error: 'Test non trouvé' });
    }

    if (test.status !== 'completed') {
      return res.status(400).json({ error: 'Test non encore complété' });
    }

    res.json({
      testId: test.id,
      candidate: test.Candidate,
      completedAt: test.completedAt,
      baseType: test.baseType,
      phaseType: test.phaseType,
      scores: test.scores,
      summary: test.summary,
      stressBehaviors: test.stressBehaviors,
      riskFactors: test.riskFactors,
      incompatibilities: test.incompatibilities,
      collectiveBehavior: test.collectiveBehavior,
      strengthsWeaknesses: test.strengthsWeaknesses
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
