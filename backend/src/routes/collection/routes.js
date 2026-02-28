const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { Route: CollectionRoute, CollectionPoint } = require('../../models');

router.use(authenticate);

// Liste des tournées
router.get('/', async (req, res) => {
  try {
    const { dayOfWeek, active } = req.query;
    const where = {};
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;
    if (active !== undefined) where.active = active === 'true';

    const routes = await CollectionRoute.findAll({
      where,
      include: [{ model: CollectionPoint, as: 'points', order: [['sortOrder', 'ASC']] }],
      order: [['name', 'ASC']]
    });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Détail tournée
router.get('/:id', async (req, res) => {
  try {
    const route = await CollectionRoute.findByPk(req.params.id, {
      include: [{ model: CollectionPoint, as: 'points', order: [['sortOrder', 'ASC']] }]
    });
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une tournée
router.post('/', async (req, res) => {
  try {
    const route = await CollectionRoute.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier une tournée
router.put('/:id', async (req, res) => {
  try {
    const route = await CollectionRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await route.update(req.body);
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer une tournée
router.delete('/:id', async (req, res) => {
  try {
    const route = await CollectionRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await route.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
