const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/auth');
const { Collection, CollectionPoint, Employee, Vehicle, Route: CollectionRoute } = require('../../models');

router.use(authenticate);

// Liste des collectes (filtrées par date)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, routeId, status } = req.query;
    const where = {};
    if (startDate && endDate) where.collectionDate = { [Op.between]: [startDate, endDate] };
    if (routeId) where.routeId = routeId;
    if (status) where.status = status;

    const collections = await Collection.findAll({
      where,
      include: [
        { model: CollectionPoint, as: 'collectionPoint' },
        { model: Employee, as: 'employee' },
        { model: Vehicle, as: 'vehicle' },
        { model: CollectionRoute, as: 'route' }
      ],
      order: [['collectionDate', 'DESC']]
    });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enregistrer une collecte (scan QR code)
router.post('/', async (req, res) => {
  try {
    const collection = await Collection.create({
      ...req.body,
      employeeId: req.body.employeeId || req.user.id,
      scannedAt: req.body.scannedAt || new Date()
    });
    const full = await Collection.findByPk(collection.id, {
      include: [
        { model: CollectionPoint, as: 'collectionPoint' },
        { model: Employee, as: 'employee' }
      ]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier une collecte (ajouter poids, photo...)
router.put('/:id', async (req, res) => {
  try {
    const collection = await Collection.findByPk(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collecte non trouvée' });
    await collection.update(req.body);
    res.json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stats rapides
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { status: 'terminee' };
    if (startDate && endDate) where.collectionDate = { [Op.between]: [startDate, endDate] };

    const collections = await Collection.findAll({ where });
    const totalWeight = collections.reduce((sum, c) => sum + (c.weightKg || 0), 0);
    const totalBags = collections.reduce((sum, c) => sum + (c.bagsCount || 0), 0);

    res.json({
      totalCollections: collections.length,
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      totalBags,
      avgWeightPerCollection: collections.length > 0 ? Math.round(totalWeight / collections.length * 100) / 100 : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
