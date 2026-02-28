const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Candidate, CandidateHistory, JobPosition, PersonalityTest } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

// Configuration multer pour upload CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/app/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cv_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.odt', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté'));
    }
  }
});

// GET /api/recruitment/candidates - Liste avec filtrage par statut (Kanban)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const candidates = await Candidate.findAll({
      where,
      include: [
        { model: JobPosition, as: 'jobPosition', attributes: ['id', 'title', 'department'] },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest', attributes: ['id', 'status', 'baseType', 'phaseType'] }
      ],
      order: [['applicationDate', 'DESC']]
    });
    res.json(candidates);
  } catch (err) {
    console.error('Get candidates error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/recruitment/candidates/kanban - Vue Kanban groupée par statut
router.get('/kanban', authenticate, async (req, res) => {
  try {
    const candidates = await Candidate.findAll({
      include: [
        { model: JobPosition, as: 'jobPosition', attributes: ['id', 'title', 'department'] },
        { model: PersonalityTest, as: 'personalityTest', attributes: ['id', 'status', 'baseType', 'phaseType'] }
      ],
      order: [['applicationDate', 'DESC']]
    });

    const kanban = {
      candidature_recue: [],
      candidature_rejetee: [],
      candidature_qualifiee: [],
      entretien_confirme: [],
      recrutement_valide: []
    };

    candidates.forEach(c => {
      if (kanban[c.status]) {
        kanban[c.status].push(c);
      }
    });

    res.json(kanban);
  } catch (err) {
    console.error('Get kanban error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/recruitment/candidates/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' }
      ]
    });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }
    res.json(candidate);
  } catch (err) {
    console.error('Get candidate error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/recruitment/candidates - Création manuelle avec upload CV
router.post('/', authenticate, upload.single('cv'), async (req, res) => {
  try {
    const data = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      gender: req.body.gender || 'non_renseigne',
      email: req.body.email,
      phone: req.body.phone,
      applicationDate: req.body.applicationDate || new Date(),
      status: 'candidature_recue',
      comments: req.body.comments
    };

    if (req.file) {
      data.cvFilePath = req.file.path;
      data.cvOriginalName = req.file.originalname;
    }

    const candidate = await Candidate.create(data);

    // Historique
    await CandidateHistory.create({
      candidateId: candidate.id,
      fromStatus: null,
      toStatus: 'candidature_recue',
      changedBy: req.user.id,
      comment: 'Candidature créée manuellement'
    });

    const fullCandidate = await Candidate.findByPk(candidate.id, {
      include: [
        { model: CandidateHistory, as: 'history' }
      ]
    });

    res.status(201).json(fullCandidate);
  } catch (err) {
    console.error('Create candidate error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/recruitment/candidates/:id - Mise à jour
router.put('/:id', authenticate, upload.single('cv'), async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    const updateData = { ...req.body };
    if (req.file) {
      updateData.cvFilePath = req.file.path;
      updateData.cvOriginalName = req.file.originalname;
    }

    // Si changement de statut → historiser
    if (updateData.status && updateData.status !== candidate.status) {
      await CandidateHistory.create({
        candidateId: candidate.id,
        fromStatus: candidate.status,
        toStatus: updateData.status,
        changedBy: req.user.id,
        comment: updateData.statusComment || ''
      });
    }

    delete updateData.statusComment;
    await candidate.update(updateData);

    const updated = await Candidate.findByPk(candidate.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' }
      ]
    });

    res.json(updated);
  } catch (err) {
    console.error('Update candidate error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/recruitment/candidates/:id/move - Déplacement Kanban
router.put('/:id/move', authenticate, [
  body('status').isIn([
    'candidature_recue', 'candidature_rejetee', 'candidature_qualifiee',
    'entretien_confirme', 'recrutement_valide'
  ]).withMessage('Statut invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    const fromStatus = candidate.status;
    const toStatus = req.body.status;

    if (fromStatus === toStatus) {
      return res.json(candidate);
    }

    await CandidateHistory.create({
      candidateId: candidate.id,
      fromStatus,
      toStatus,
      changedBy: req.user.id,
      comment: req.body.comment || ''
    });

    await candidate.update({ status: toStatus });

    // Si recrutement validé, incrémenter les postes pourvus
    if (toStatus === 'recrutement_valide' && candidate.jobPositionId) {
      const position = await JobPosition.findByPk(candidate.jobPositionId);
      if (position) {
        await position.increment('filledPositions');
      }
    }

    const updated = await Candidate.findByPk(candidate.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' }
      ]
    });

    res.json(updated);
  } catch (err) {
    console.error('Move candidate error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/recruitment/candidates/:id/summary - Fiche synthétique pour SIRH
router.get('/:id/summary', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'ASC']] },
        { model: PersonalityTest, as: 'personalityTest' }
      ]
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    if (candidate.status !== 'recrutement_valide') {
      return res.status(400).json({ error: 'La fiche synthétique n\'est disponible que pour les recrutements validés' });
    }

    const summary = {
      identite: {
        nom: candidate.lastName,
        prenom: candidate.firstName,
        genre: candidate.gender,
        email: candidate.email,
        telephone: candidate.phone
      },
      candidature: {
        dateReception: candidate.applicationDate,
        poste: candidate.jobPosition ? {
          titre: candidate.jobPosition.title,
          departement: candidate.jobPosition.department
        } : null,
        dateValidation: candidate.history
          .find(h => h.toStatus === 'recrutement_valide')?.changedAt
      },
      evaluations: {
        compteRenduEntretien: candidate.interviewReport,
        compteRenduTest: candidate.testReport,
        profilPersonnalite: candidate.personalityTest ? {
          typeBase: candidate.personalityTest.baseType,
          phase: candidate.personalityTest.phaseType,
          scores: candidate.personalityTest.scores,
          comportementsSousStress: candidate.personalityTest.stressBehaviors,
          facteursRPS: candidate.personalityTest.riskFactors,
          synthese: candidate.personalityTest.summary
        } : null
      },
      parcours: candidate.history.map(h => ({
        de: h.fromStatus,
        vers: h.toStatus,
        date: h.changedAt,
        commentaire: h.comment
      }))
    };

    res.json(summary);
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
