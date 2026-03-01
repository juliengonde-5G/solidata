const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/auth');
const { CollectionPoint, Route, RouteTemplatePoint } = require('../../models');

router.use(authenticate);

// Liste des points de collecte
router.get('/', async (req, res) => {
  try {
    const { routeId, type, active, city, search } = req.query;
    const where = {};
    if (type) where.type = type;
    if (active !== undefined) where.active = active === 'true';
    if (city) where.city = city;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let points;
    if (routeId) {
      // Points d'une tournée spécifique
      const tps = await RouteTemplatePoint.findAll({
        where: { routeId },
        include: [{ model: CollectionPoint, as: 'collectionPoint', where }],
        order: [['sortOrder', 'ASC']]
      });
      points = tps.map(tp => ({ ...tp.collectionPoint.toJSON(), sortOrder: tp.sortOrder }));
    } else {
      points = await CollectionPoint.findAll({
        where,
        include: [{
          model: Route,
          as: 'routes',
          through: { attributes: ['sortOrder'] },
          attributes: ['id', 'name']
        }],
        order: [['city', 'ASC'], ['name', 'ASC']]
      });
    }
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats CAV (par ville, taux remplissage, etc.)
router.get('/stats', async (req, res) => {
  try {
    const points = await CollectionPoint.findAll({ where: { active: true } });
    const cities = {};
    let totalCav = 0;
    let withGps = 0;
    let avgFill = 0;
    let fillCount = 0;

    points.forEach(p => {
      totalCav += p.nbCav || 1;
      if (p.latitude && p.longitude) withGps++;
      if (p.avgFillRate) { avgFill += p.avgFillRate; fillCount++; }
      const c = p.city || 'Inconnue';
      if (!cities[c]) cities[c] = { count: 0, cav: 0 };
      cities[c].count++;
      cities[c].cav += p.nbCav || 1;
    });

    res.json({
      totalPoints: points.length,
      totalCav,
      withGps,
      withoutGps: points.length - withGps,
      avgFillRate: fillCount > 0 ? Math.round(avgFill / fillCount) : 0,
      byCity: Object.entries(cities)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([city, data]) => ({ city, ...data }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un point de collecte avec QR code auto-généré
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.qrCode) {
      data.qrCode = `ST-${uuidv4().slice(0, 8).toUpperCase()}`;
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
    const point = await CollectionPoint.findOne({
      where: { qrCode: req.params.qrCode },
      include: [{ model: Route, as: 'routes', through: { attributes: [] }, attributes: ['id', 'name'] }]
    });
    if (!point) return res.status(404).json({ error: 'QR code inconnu' });
    res.json(point);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Points non collectés depuis X jours (pour mode manuel)
router.get('/stale', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const points = await CollectionPoint.findAll({
      where: {
        active: true,
        [Op.or]: [
          { lastCollectionDate: { [Op.lt]: cutoffStr } },
          { lastCollectionDate: null }
        ]
      },
      order: [['lastCollectionDate', 'ASC NULLS FIRST']]
    });
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un point
router.delete('/:id', async (req, res) => {
  try {
    const point = await CollectionPoint.findByPk(req.params.id);
    if (!point) return res.status(404).json({ error: 'Point non trouvé' });
    await RouteTemplatePoint.destroy({ where: { collectionPointId: point.id } });
    await point.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
