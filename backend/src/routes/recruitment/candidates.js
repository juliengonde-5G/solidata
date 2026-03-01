const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Candidate, CandidateHistory, JobPosition, PersonalityTest, Employee, User } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['candidature_recue', 'a_convoquer', 'a_qualifier', 'non_retenu', 'convoque', 'recrute', 'refus_candidat'];

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
      a_convoquer: [],
      non_retenu: [],
      convoque: [],
      recrute: [],
      refus_candidat: []
    };

    // Migrer les anciens a_qualifier vers a_convoquer dans l'affichage
    candidates.forEach(c => {
      if (c.status === 'a_qualifier') c.status = 'a_convoquer';
    });

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

// POST /api/recruitment/candidates/:id/ocr — Extraction texte CV (OCR simplifié)
router.post('/:id/ocr', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidat non trouvé' });
    if (!candidate.cvText && !candidate.cvFilePath) {
      return res.status(400).json({ error: 'Aucun CV disponible pour l\'extraction' });
    }

    let text = candidate.cvText || '';

    // Si pas de texte extrait, essayer de lire le fichier (pour les PDF textuels)
    if (!text && candidate.cvFilePath) {
      try {
        const fs = require('fs');
        const raw = fs.readFileSync(candidate.cvFilePath, 'utf8');
        text = raw;
      } catch { /* pas de texte brut extractible */ }
    }

    if (!text) {
      return res.status(400).json({ error: 'Texte du CV non disponible. Uploadez un CV au format texte/PDF.' });
    }

    // Extraction par patterns regex
    const result = {};

    // Email
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) result.email = emailMatch[0].toLowerCase();

    // Téléphone (formats FR: 06, 07, +33)
    const phoneMatch = text.match(/(?:\+33|0)\s?[67][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/);
    if (phoneMatch) result.phone = phoneMatch[0].replace(/[\s.-]/g, '');

    // Permis B
    const permisRegex = /permis\s*b|permis\s*de\s*conduire|cat[ée]gorie\s*b/i;
    result.permisB = permisRegex.test(text);

    // CACES
    const cacesRegex = /caces|certificat\s+d'aptitude/i;
    result.caces = cacesRegex.test(text);

    // Nom / Prénom (première ligne ou pattern "NOM Prénom")
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 60);
    if (lines.length >= 1) {
      const firstLine = lines[0].replace(/[^a-zA-ZÀ-ÿ\s-]/g, '').trim();
      const parts = firstLine.split(/\s+/);
      if (parts.length >= 2) {
        // Heuristique: le mot en majuscules = nom, l'autre = prénom
        const upper = parts.find(p => p === p.toUpperCase() && p.length > 1);
        const lower = parts.find(p => p !== p.toUpperCase() && p.length > 1);
        if (upper) result.lastName = upper.charAt(0) + upper.slice(1).toLowerCase();
        if (lower) result.firstName = lower;
      }
    }

    // Sauvegarder le texte extrait s'il n'était pas déjà stocké
    if (!candidate.cvText && text) {
      await candidate.update({ cvText: text.substring(0, 10000) });
    }

    res.json(result);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Erreur extraction CV' });
  }
});

// POST /api/recruitment/candidates/:id/sms-convocation — Envoi SMS convocation
router.post('/:id/sms-convocation', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidat non trouvé' });
    if (!candidate.phone) return res.status(400).json({ error: 'Numéro de téléphone manquant' });

    const { convocationDate, convocationLocation } = req.body;
    if (!convocationDate) return res.status(400).json({ error: 'Date de convocation requise' });

    const locationLabels = {
      siege: 'au siège de Solidarité Textiles, Le Houlme',
      boutique_lhopital: 'à la boutique L\'Hôpital',
      boutique_st_sever: 'à la boutique St Sever',
      boutique_vernon: 'à la boutique Vernon'
    };

    const dateFormatted = new Date(convocationDate).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const smsBody = `Bonjour ${candidate.firstName}, nous vous confirmons votre rendez-vous le ${dateFormatted} ${locationLabels[convocationLocation] || convocationLocation}. Merci de confirmer votre présence. Solidarité Textiles`;

    // Sauvegarder les infos de convocation
    await candidate.update({
      convocationDate: new Date(convocationDate),
      convocationLocation: convocationLocation,
      convocationSmsStatus: 'sent'
    });

    // Log l'historique
    await CandidateHistory.create({
      candidateId: candidate.id,
      fromStatus: candidate.status,
      toStatus: candidate.status,
      changedBy: req.user.id,
      comment: `SMS de convocation envoyé: ${dateFormatted} - ${locationLabels[convocationLocation] || convocationLocation}`
    });

    // TODO: Intégrer un service SMS réel (OVH, Twilio, etc.)
    // Pour l'instant, on log le message
    console.log(`[SMS] To: ${candidate.phone} | Message: ${smsBody}`);

    res.json({ message: 'Convocation enregistrée', smsBody });
  } catch (err) {
    console.error('SMS convocation error:', err);
    res.status(500).json({ error: 'Erreur envoi convocation' });
  }
});

// POST /api/recruitment/candidates/:id/send-rejection — Envoi email de refus
router.post('/:id/send-rejection', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidat non trouvé' });
    if (!candidate.email) return res.status(400).json({ error: 'Email du candidat manquant' });

    const { AppSettings } = require('../../models');
    const template = await AppSettings.getValue('email_rejection_template',
      `Bonjour {prenom},\n\nNous vous remercions de l'intérêt que vous portez à Solidarité Textiles.\n\nAprès examen attentif de votre candidature, nous avons le regret de vous informer que votre profil n'a pas été retenu pour ce poste.\n\nNous vous souhaitons bonne continuation dans vos recherches.\n\nCordialement,\nSolidarité Textiles`
    );

    const emailBody = template
      .replace(/{prenom}/g, candidate.firstName || '')
      .replace(/{nom}/g, candidate.lastName || '');

    // TODO: Intégrer un service email réel (nodemailer)
    console.log(`[EMAIL REJECTION] To: ${candidate.email} | Body: ${emailBody}`);

    await CandidateHistory.create({
      candidateId: candidate.id,
      fromStatus: candidate.status,
      toStatus: candidate.status,
      changedBy: req.user.id,
      comment: 'Email de refus envoyé'
    });

    res.json({ message: 'Email de refus envoyé', emailBody });
  } catch (err) {
    console.error('Send rejection error:', err);
    res.status(500).json({ error: 'Erreur envoi email' });
  }
});

// POST /api/recruitment/candidates/:id/send-recruitment-letter — Envoi courrier recrutement
router.post('/:id/send-recruitment-letter', authenticate, async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidat non trouvé' });
    if (!candidate.email) return res.status(400).json({ error: 'Email du candidat manquant' });

    const { AppSettings } = require('../../models');
    const template = await AppSettings.getValue('email_recruitment_template',
      `Bonjour {prenom},\n\nNous avons le plaisir de vous confirmer votre recrutement au sein de Solidarité Textiles.\n\nVous trouverez ci-joint les documents suivants :\n- Les engagements réciproques\n- Le règlement intérieur\n- L'attestation mutuelle\n\nNous vous attendons avec impatience.\n\nCordialement,\nSolidarité Textiles`
    );

    const emailBody = template
      .replace(/{prenom}/g, candidate.firstName || '')
      .replace(/{nom}/g, candidate.lastName || '');

    // TODO: Intégrer un service email réel avec pièces jointes
    console.log(`[EMAIL RECRUITMENT] To: ${candidate.email} | Body: ${emailBody}`);

    await CandidateHistory.create({
      candidateId: candidate.id,
      fromStatus: candidate.status,
      toStatus: candidate.status,
      changedBy: req.user.id,
      comment: 'Courrier de recrutement envoyé'
    });

    res.json({ message: 'Courrier de recrutement envoyé', emailBody });
  } catch (err) {
    console.error('Send recruitment letter error:', err);
    res.status(500).json({ error: 'Erreur envoi courrier' });
  }
});

// GET /api/recruitment/candidates/:id/pre-interview-questions — 20 questions pré-entretien
router.get('/:id/pre-interview-questions', authenticate, async (req, res) => {
  try {
    const questions = [
      { id: 1, question: "Qu'est-ce qui vous motive à travailler dans le secteur du textile solidaire ?" },
      { id: 2, question: "Comment décririez-vous votre expérience professionnelle ?" },
      { id: 3, question: "Quelle est votre plus grande qualité au travail ?" },
      { id: 4, question: "Quel aspect du travail en équipe appréciez-vous le plus ?" },
      { id: 5, question: "Comment réagissez-vous face à une situation stressante ?" },
      { id: 6, question: "Avez-vous déjà travaillé dans un environnement de tri ou logistique ?" },
      { id: 7, question: "Quels sont vos horaires de disponibilité ?" },
      { id: 8, question: "Comment vous organisez-vous dans votre travail quotidien ?" },
      { id: 9, question: "Qu'attendez-vous de cette expérience professionnelle ?" },
      { id: 10, question: "Avez-vous des contraintes de transport pour vous rendre au travail ?" },
      { id: 11, question: "Comment percevez-vous le travail physique (port de charges, station debout) ?" },
      { id: 12, question: "Avez-vous une formation ou un diplôme en particulier ?" },
      { id: 13, question: "Que connaissez-vous de Solidarité Textiles et de son activité ?" },
      { id: 14, question: "Quels sont vos objectifs professionnels à court terme ?" },
      { id: 15, question: "Comment réagissez-vous face aux consignes et à l'autorité ?" },
      { id: 16, question: "Parlez-nous d'une difficulté que vous avez surmontée récemment." },
      { id: 17, question: "Que signifie pour vous le respect des horaires et de la ponctualité ?" },
      { id: 18, question: "Comment vous sentez-vous à l'idée de découvrir un nouveau métier ?" },
      { id: 19, question: "Avez-vous des questions sur le poste ou l'association ?" },
      { id: 20, question: "Y a-t-il quelque chose que vous aimeriez que nous sachions sur vous ?" }
    ];
    res.json({ questions, note: "Il n'y a aucune mauvaise réponse. Ces questions servent d'axes de discussion pour le jour J." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
