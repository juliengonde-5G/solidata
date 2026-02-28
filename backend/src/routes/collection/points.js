const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../../middleware/auth');
const { CollectionPoint } = require('../../models');

router.use(authenticate);

// Liste des points de collecte
router.get('/', async (req, res) => {
  try {
    const { routeId, type, active } = req.query;
    const where = {};
    if (routeId) where.routeId = routeId;
    if (type) where.type = type;
    if (active !== undefined) where.active = active === 'true';

    const points = await CollectionPoint.findAll({ where, order: [['sortOrder', 'ASC']] });
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un point de collecte avec QR code auto-généré
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.qrCode) {
      data.qrCode = `SOLTEX-CAV-${uuidv4().slice(0, 8).toUpperCase()}`;
    }
    const point = await CollectionPoint.create(data);
    res.status(201).json(point);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier un point
router.put('/:id', async (req, res) => {
  try {
    const point = await CollectionPoint.findByPk(req.params.id);
    if (!point) return res.status(404).json({ error: 'Point non trouvé' });
    await point.update(req.body);
    res.json(point);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lookup par QR code (pour scan mobile)
router.get('/scan/:qrCode', async (req, res) => {
  try {
    const point = await CollectionPoint.findOne({ where: { qrCode: req.params.qrCode } });
    if (!point) return res.status(404).json({ error: 'QR code inconnu' });
    res.json(point);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un point
router.delete('/:id', async (req, res) => {
  try {
    const point = await CollectionPoint.findByPk(req.params.id);
    if (!point) return res.status(404).json({ error: 'Point non trouvé' });
    await point.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
