const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { Route: CollectionRoute, CollectionPoint, RouteTemplatePoint } = require('../../models');

router.use(authenticate);

// Liste des tournées templates
router.get('/', async (req, res) => {
  try {
    const { dayOfWeek, active } = req.query;
    const where = {};
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;
    if (active !== undefined) where.active = active === 'true';

    const routes = await CollectionRoute.findAll({
      where,
      include: [{
        model: CollectionPoint,
        as: 'points',
        through: { attributes: ['sortOrder'] }
      }],
      order: [['name', 'ASC']]
    });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Détail tournée avec points ordonnés
router.get('/:id', async (req, res) => {
  try {
    const route = await CollectionRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });

    // Points ordonnés via la table pivot
    const templatePoints = await RouteTemplatePoint.findAll({
      where: { routeId: route.id },
      include: [{ model: CollectionPoint, as: 'collectionPoint' }],
      order: [['sortOrder', 'ASC']]
    });

    res.json({
      ...route.toJSON(),
      points: templatePoints.map(tp => ({
        ...tp.collectionPoint.toJSON(),
        sortOrder: tp.sortOrder,
        templatePointId: tp.id
      }))
    });
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

// Ajouter un point à une tournée
router.post('/:id/points', async (req, res) => {
  try {
    const { collectionPointId, sortOrder } = req.body;
    const tp = await RouteTemplatePoint.create({
      routeId: req.params.id,
      collectionPointId,
      sortOrder: sortOrder || 0
    });
    res.status(201).json(tp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retirer un point d'une tournée
router.delete('/:id/points/:pointId', async (req, res) => {
  try {
    await RouteTemplatePoint.destroy({
      where: { routeId: req.params.id, collectionPointId: req.params.pointId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une tournée
router.delete('/:id', async (req, res) => {
  try {
    const route = await CollectionRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await RouteTemplatePoint.destroy({ where: { routeId: route.id } });
    await route.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
