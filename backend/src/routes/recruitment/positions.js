const express = require('express');
const { body, validationResult } = require('express-validator');
const { JobPosition, Candidate } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

const router = express.Router();

// GET /api/recruitment/positions
router.get('/', authenticate, async (req, res) => {
  try {
    const { month, department, active } = req.query;
    const where = {};
    if (month) where.month = month;
    if (department) where.department = department;
    if (active !== undefined) where.active = active === 'true';

    const positions = await JobPosition.findAll({
      where,
      include: [{ model: Candidate, as: 'candidates', attributes: ['id', 'status'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(positions);
  } catch (err) {
    console.error('Get positions error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/recruitment/positions
router.post('/', authenticate, requireRole('admin', 'manager'), [
  body('title').notEmpty().withMessage('Titre requis'),
  body('department').isIn(['collecte', 'tri', 'logistique', 'boutique', 'administration']),
  body('openPositions').isInt({ min: 0 }),
  body('month').matches(/^\d{4}-\d{2}$/).withMessage('Format YYYY-MM requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const position = await JobPosition.create(req.body);
    res.status(201).json(position);
  } catch (err) {
    console.error('Create position error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/recruitment/positions/:id
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const position = await JobPosition.findByPk(req.params.id);
    if (!position) {
      return res.status(404).json({ error: 'Poste non trouvé' });
    }
    await position.update(req.body);
    res.json(position);
  } catch (err) {
    console.error('Update position error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/recruitment/positions/:id
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const position = await JobPosition.findByPk(req.params.id);
    if (!position) {
      return res.status(404).json({ error: 'Poste non trouvé' });
    }
    await position.update({ active: false });
    res.json({ message: 'Poste désactivé' });
  } catch (err) {
    console.error('Delete position error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
