const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth');
const { User } = require('../../models');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'rh'));

// GET /api/admin/users — Liste tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const { role, team, active } = req.query;
    const where = {};
    if (role) where.role = role;
    if (team) where.team = team;
    if (active !== undefined) where.active = active === 'true';

    const users = await User.findAll({
      where,
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/stats — Stats utilisateurs
router.get('/stats', async (req, res) => {
  try {
    const total = await User.count();
    const active = await User.count({ where: { active: true } });
    const byRole = {};
    for (const role of ['admin', 'manager', 'collaborateur', 'rh']) {
      byRole[role] = await User.count({ where: { role, active: true } });
    }
    const byTeam = {};
    for (const team of ['tri', 'collecte', 'magasin_lhopital', 'magasin_st_sever', 'magasin_vernon', 'administration']) {
      byTeam[team] = await User.count({ where: { team, active: true } });
    }
    res.json({ total, active, inactive: total - active, byRole, byTeam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — Créer un utilisateur
router.post('/', [
  body('email').isEmail().withMessage('Email invalide'),
  body('firstName').notEmpty().withMessage('Prénom requis'),
  body('lastName').notEmpty().withMessage('Nom requis'),
  body('role').isIn(['admin', 'manager', 'collaborateur', 'rh']).withMessage('Rôle invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Vérifier unicité email
    const existing = await User.findOne({ where: { email: req.body.email } });
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

    // Mot de passe par défaut si non fourni
    const password = req.body.password || 'SolTex2026!';

    const user = await User.create({
      ...req.body,
      password,
      mustChangePassword: true
    });
    res.status(201).json(user.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id — Modifier un utilisateur
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // On ne touche pas au mot de passe via cette route
    const { password, ...updateData } = req.body;
    await user.update(updateData);
    res.json(user.toJSON());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/reset-password — Réinitialiser le mdp
router.put('/:id/reset-password', requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const newPassword = req.body.password || 'SolTex2026!';
    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();
    res.json({ message: 'Mot de passe réinitialisé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/toggle-active — Activer/désactiver
router.put('/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Ne pas se désactiver soi-même
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous désactiver' });
    }

    await user.update({ active: !user.active });
    res.json(user.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — Supprimer (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    await user.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
