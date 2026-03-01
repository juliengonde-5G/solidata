const express = require('express');
const router = express.Router();
const { WorkStation } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

// GET / — Liste des postes de travail
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.active !== undefined) where.active = req.query.active === 'true';
    if (req.query.group) where.group = req.query.group;

    const stations = await WorkStation.findAll({
      where,
      order: [['group', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']]
    });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — Créer un poste
router.post('/', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await WorkStation.create(req.body);
    res.status(201).json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id — Modifier un poste
router.put('/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await WorkStation.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: 'Poste non trouvé' });
    await station.update(req.body);
    res.json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id — Supprimer un poste
router.delete('/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await WorkStation.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: 'Poste non trouvé' });
    await station.destroy();
    res.json({ message: 'Poste supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
