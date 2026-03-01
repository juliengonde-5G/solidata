const express = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const { AppSettings, sequelize } = require('../../models');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

// Paramètres par défaut de l'ERP
const DEFAULT_SETTINGS = [
  // Général
  { key: 'app.name', value: 'Solidata', type: 'string', category: 'general', label: 'Nom de l\'application', description: 'Nom affiché dans l\'interface' },
  { key: 'app.company', value: 'Solidarité Textiles', type: 'string', category: 'general', label: 'Nom de la structure', description: 'Raison sociale' },
  { key: 'app.siret', value: '', type: 'string', category: 'general', label: 'SIRET', description: 'Numéro SIRET de la structure' },
  { key: 'app.address', value: '', type: 'string', category: 'general', label: 'Adresse', description: 'Adresse du siège' },
  { key: 'app.phone', value: '', type: 'string', category: 'general', label: 'Téléphone', description: 'Numéro principal' },

  // Équipes
  { key: 'teams.list', value: '["tri","collecte","magasin_lhopital","magasin_st_sever","magasin_vernon"]', type: 'json', category: 'equipes', label: 'Liste des équipes', description: 'Équipes actives' },
  { key: 'teams.labels', value: '{"tri":"Tri","collecte":"Collecte","magasin_lhopital":"Magasin L\'Hôpital","magasin_st_sever":"Magasin St Sever","magasin_vernon":"Magasin Vernon","administration":"Administration"}', type: 'json', category: 'equipes', label: 'Libellés des équipes', description: 'Noms affichés' },

  // Collecte
  { key: 'collecte.weight_unit', value: 'kg', type: 'string', category: 'collecte', label: 'Unité de poids', description: 'Unité par défaut pour les pesées' },
  { key: 'collecte.default_bags_weight', value: '15', type: 'number', category: 'collecte', label: 'Poids moyen par sac (kg)', description: 'Estimation par défaut' },

  // Reporting
  { key: 'reporting.refashion_id', value: '', type: 'string', category: 'reporting', label: 'Identifiant Refashion', description: 'Numéro adhérent Refashion' },
  { key: 'reporting.reuse_rate', value: '55', type: 'number', category: 'reporting', label: 'Taux de réemploi par défaut (%)', description: 'Estimation pour les rapports' },
  { key: 'reporting.recycle_rate', value: '32', type: 'number', category: 'reporting', label: 'Taux de recyclage par défaut (%)', description: 'Estimation pour les rapports' },

  // Email
  { key: 'email_rejection_template', value: 'Bonjour {prenom},\n\nNous vous remercions de l\'intérêt que vous portez à Solidarité Textiles.\n\nAprès examen attentif de votre candidature, nous avons le regret de vous informer que votre profil n\'a pas été retenu pour ce poste.\n\nNous vous souhaitons bonne continuation dans vos recherches.\n\nCordialement,\nSolidarité Textiles', type: 'string', category: 'email', label: 'Modèle email de refus', description: 'Variables disponibles: {prenom}, {nom}' },
  { key: 'email_recruitment_template', value: 'Bonjour {prenom},\n\nNous avons le plaisir de vous confirmer votre recrutement au sein de Solidarité Textiles.\n\nVous trouverez ci-joint les documents suivants :\n- Les engagements réciproques\n- Le règlement intérieur\n- L\'attestation mutuelle\n\nNous vous attendons avec impatience.\n\nCordialement,\nSolidarité Textiles', type: 'string', category: 'email', label: 'Modèle courrier de recrutement', description: 'Variables disponibles: {prenom}, {nom}' },
  { key: 'sms_convocation_template', value: 'Bonjour {prenom}, nous vous confirmons votre rendez-vous le {date} {lieu}. Merci de confirmer votre présence. Solidarité Textiles', type: 'string', category: 'email', label: 'Modèle SMS convocation', description: 'Variables: {prenom}, {nom}, {date}, {lieu}' },
  { key: 'sms_preinterview_template', value: 'Bonjour {prenom}, votre entretien est prévu demain. Pensez à apporter votre CV, une pièce d\'identité et vos questions. À demain ! Solidarité Textiles', type: 'string', category: 'email', label: 'Modèle SMS veille entretien', description: 'Variables: {prenom}, {nom}, {date}' },

  // Sécurité
  { key: 'security.session_duration', value: '24', type: 'number', category: 'securite', label: 'Durée de session (heures)', description: 'Expiration du token JWT' },
  { key: 'security.min_password_length', value: '6', type: 'number', category: 'securite', label: 'Longueur min. mot de passe', description: 'Nombre de caractères minimum' },
  { key: 'security.default_password', value: 'SolTex2026!', type: 'string', category: 'securite', label: 'Mot de passe par défaut', description: 'Attribué à la création d\'un compte' },
];

// GET /api/admin/settings — Tous les paramètres
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;

    const settings = await AppSettings.findAll({ where, order: [['category', 'ASC'], ['key', 'ASC']] });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/settings/init — Initialiser les paramètres par défaut
router.post('/init', async (req, res) => {
  try {
    let created = 0;
    for (const setting of DEFAULT_SETTINGS) {
      const [, wasCreated] = await AppSettings.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      if (wasCreated) created++;
    }
    res.json({ message: `${created} paramètres initialisés`, total: DEFAULT_SETTINGS.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings/:key — Modifier un paramètre
router.put('/:key', async (req, res) => {
  try {
    const setting = await AppSettings.findOne({ where: { key: req.params.key } });
    if (!setting) return res.status(404).json({ error: 'Paramètre non trouvé' });

    const value = typeof req.body.value === 'object' ? JSON.stringify(req.body.value) : String(req.body.value);
    await setting.update({ value });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/db/stats — Statistiques BDD
router.get('/db/stats', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT schemaname, tablename,
             pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
             n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
