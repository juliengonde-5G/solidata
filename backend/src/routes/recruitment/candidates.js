const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Candidate, CandidateHistory, JobPosition, PersonalityTest, Employee, User } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['candidature_recue', 'a_qualifier', 'non_retenu', 'convoque', 'recrute'];

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

// GET /api/recruitment/candidates - Liste avec filtrage par statut
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;

    const candidates = await Candidate.findAll({
      where,
      include: [
        { model: JobPosition, as: 'jobPosition', attributes: ['id', 'title', 'department'] },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest', attributes: ['id', 'status', 'baseType', 'phaseType'] },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
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
      a_qualifier: [],
      non_retenu: [],
      convoque: [],
      recrute: []
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

// GET /api/recruitment/candidates/users - Liste des utilisateurs pour sélection interviewer
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { active: true },
      attributes: ['id', 'firstName', 'lastName', 'role', 'team'],
      order: [['lastName', 'ASC']]
    });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
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
        { model: PersonalityTest, as: 'personalityTest' },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
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
      permisB: req.body.permisB === 'true' || req.body.permisB === true,
      caces: req.body.caces === 'true' || req.body.caces === true,
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

    // Convertir booléens depuis FormData
    if (updateData.permisB !== undefined) {
      updateData.permisB = updateData.permisB === 'true' || updateData.permisB === true;
    }
    if (updateData.caces !== undefined) {
      updateData.caces = updateData.caces === 'true' || updateData.caces === true;
    }
    if (updateData.assessmentDone !== undefined) {
      updateData.assessmentDone = updateData.assessmentDone === 'true' || updateData.assessmentDone === true;
    }

    // Si changement de statut → historiser
    const previousStatus = candidate.status;
    if (updateData.status && updateData.status !== previousStatus) {
      await CandidateHistory.create({
        candidateId: candidate.id,
        fromStatus: previousStatus,
        toStatus: updateData.status,
        changedBy: req.user.id,
        comment: updateData.statusComment || ''
      });
    }

    delete updateData.statusComment;
    await candidate.update(updateData);

    // Mettre à jour le compteur de postes pourvus
    const positionId = candidate.jobPositionId;
    if (positionId) {
      if (updateData.status === 'recrute' && previousStatus !== 'recrute') {
        await JobPosition.increment('filledPositions', { where: { id: positionId } });
      } else if (previousStatus === 'recrute' && updateData.status && updateData.status !== 'recrute') {
        await JobPosition.decrement('filledPositions', { where: { id: positionId } });
      }
    }

    const updated = await Candidate.findByPk(candidate.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
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
  body('status').isIn(VALID_STATUSES).withMessage('Statut invalide')
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

    // Si recruté, incrémenter les postes pourvus
    if (toStatus === 'recrute' && candidate.jobPositionId) {
      const position = await JobPosition.findByPk(candidate.jobPositionId);
      if (position) {
        await position.increment('filledPositions');
      }
    }

    const updated = await Candidate.findByPk(candidate.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json(updated);
  } catch (err) {
    console.error('Move candidate error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/recruitment/candidates/:id/recruit - Finaliser le recrutement et créer la fiche salarié
router.post('/:id/recruit', authenticate, [
  body('team').notEmpty().withMessage('L\'équipe est requise'),
  body('department').notEmpty().withMessage('Le département est requis'),
  body('contractType').notEmpty().withMessage('Le type de contrat est requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const candidate = await Candidate.findByPk(req.params.id, {
      include: [{ model: JobPosition, as: 'jobPosition' }]
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    if (candidate.status !== 'convoque' && candidate.status !== 'recrute') {
      return res.status(400).json({ error: 'Le candidat doit être au statut "convoqué" ou "recruté" pour être recruté' });
    }

    const { team, department, contractType, hireDate, contractEndDate } = req.body;

    // Créer la fiche salarié
    const employee = await Employee.create({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      department: department,
      contractType: contractType,
      hireDate: hireDate || new Date(),
      contractEndDate: contractEndDate || null,
      drivingLicense: candidate.permisB,
      active: true,
      notes: `Recruté via candidature du ${new Date(candidate.applicationDate).toLocaleDateString('fr-FR')}. Poste: ${candidate.jobPosition?.title || 'Non spécifié'}.`
    });

    // Mettre à jour le candidat
    const updateData = {
      status: 'recrute',
      assignedTeam: team
    };

    if (candidate.status !== 'recrute') {
      await CandidateHistory.create({
        candidateId: candidate.id,
        fromStatus: candidate.status,
        toStatus: 'recrute',
        changedBy: req.user.id,
        comment: `Recruté - Affecté à l'équipe ${team}. Fiche salarié créée.`
      });
    }

    await candidate.update(updateData);

    // Incrémenter les postes pourvus
    if (candidate.jobPositionId) {
      const position = await JobPosition.findByPk(candidate.jobPositionId);
      if (position) {
        await position.increment('filledPositions');
      }
    }

    const updated = await Candidate.findByPk(candidate.id, {
      include: [
        { model: JobPosition, as: 'jobPosition' },
        { model: CandidateHistory, as: 'history', order: [['changedAt', 'DESC']] },
        { model: PersonalityTest, as: 'personalityTest' },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json({
      candidate: updated,
      employee: employee,
      message: `Fiche salarié créée pour ${employee.firstName} ${employee.lastName}`
    });
  } catch (err) {
    console.error('Recruit candidate error:', err);
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
        { model: PersonalityTest, as: 'personalityTest' },
        { model: User, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidat non trouvé' });
    }

    if (candidate.status !== 'recrute') {
      return res.status(400).json({ error: 'La fiche synthétique n\'est disponible que pour les candidats recrutés' });
    }

    const summary = {
      identite: {
        nom: candidate.lastName,
        prenom: candidate.firstName,
        genre: candidate.gender,
        email: candidate.email,
        telephone: candidate.phone,
        permisB: candidate.permisB,
        caces: candidate.caces
      },
      candidature: {
        dateReception: candidate.applicationDate,
        poste: candidate.jobPosition ? {
          titre: candidate.jobPosition.title,
          departement: candidate.jobPosition.department
        } : null,
        equipeAffectee: candidate.assignedTeam,
        dateValidation: candidate.history
          .find(h => h.toStatus === 'recrute')?.changedAt
      },
      evaluations: {
        miseEnSituation: {
          realise: candidate.assessmentDone,
          avis: candidate.assessmentResult,
          commentaire: candidate.assessmentComment
        },
        entretien: {
          responsable: candidate.interviewer ? `${candidate.interviewer.firstName} ${candidate.interviewer.lastName}` : null,
          date: candidate.interviewDate,
          commentaire: candidate.interviewComment
        },
        profilPersonnalite: candidate.personalityTest ? {
          typeBase: candidate.personalityTest.baseType,
          phase: candidate.personalityTest.phaseType,
          scores: candidate.personalityTest.scores,
          comportementsSousStress: candidate.personalityTest.stressBehaviors,
          comportementCollectif: candidate.personalityTest.collectiveBehavior,
          forcesEtFaiblesses: candidate.personalityTest.strengthsWeaknesses,
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
