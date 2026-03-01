const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate, requireRole } = require('../../middleware/auth');
const {
  DailyRoute, DailyRoutePoint, Route, RouteTemplatePoint,
  CollectionPoint, Vehicle, Employee, GPSTrack, WeightRecord
} = require('../../models');

router.use(authenticate);

// Tournées du jour
router.get('/day/:date', async (req, res) => {
  try {
    const routes = await DailyRoute.findAll({
      where: { date: req.params.date },
      include: [
        { model: Route, as: 'templateRoute', attributes: ['id', 'name', 'sector'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'licensePlate', 'type'] },
        { model: Employee, as: 'driver', attributes: ['id', 'firstName', 'lastName'] },
        { model: Employee, as: 'follower', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: DailyRoutePoint, as: 'routePoints',
          include: [{ model: CollectionPoint, as: 'collectionPoint' }],
          order: [['sortOrder', 'ASC']]
        }
      ],
      order: [['period', 'ASC'], ['createdAt', 'ASC']]
    });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'une tournée journalière
router.get('/:id', async (req, res) => {
  try {
    const route = await DailyRoute.findByPk(req.params.id, {
      include: [
        { model: Route, as: 'templateRoute' },
        { model: Vehicle, as: 'vehicle' },
        { model: Employee, as: 'driver' },
        { model: Employee, as: 'follower' },
        {
          model: DailyRoutePoint, as: 'routePoints',
          include: [{ model: CollectionPoint, as: 'collectionPoint' }]
        },
        { model: WeightRecord, as: 'weightRecords' }
      ]
    });
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });

    // Trier les points par sortOrder
    const sorted = route.toJSON();
    sorted.routePoints.sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une tournée journalière
router.post('/', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, period, templateRouteId, vehicleId, driverId, followerId, source, notes, pointIds } = req.body;

    const dailyRoute = await DailyRoute.create({
      date, period: period || 'matin', templateRouteId, vehicleId,
      driverId, followerId, source: source || 'standard', notes
    });

    // Copier les points du template si pas de pointIds fournis
    let pointsToAdd = pointIds;
    if (!pointsToAdd && templateRouteId) {
      const tps = await RouteTemplatePoint.findAll({
        where: { routeId: templateRouteId },
        order: [['sortOrder', 'ASC']]
      });
      pointsToAdd = tps.map(tp => ({ collectionPointId: tp.collectionPointId, sortOrder: tp.sortOrder }));
    }

    if (pointsToAdd && pointsToAdd.length > 0) {
      await DailyRoutePoint.bulkCreate(
        pointsToAdd.map((p, i) => ({
          dailyRouteId: dailyRoute.id,
          collectionPointId: p.collectionPointId || p,
          sortOrder: p.sortOrder !== undefined ? p.sortOrder : i
        }))
      );
    }

    const full = await DailyRoute.findByPk(dailyRoute.id, {
      include: [
        { model: Route, as: 'templateRoute', attributes: ['id', 'name'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'licensePlate'] },
        { model: Employee, as: 'driver', attributes: ['id', 'firstName', 'lastName'] },
        { model: DailyRoutePoint, as: 'routePoints', include: [{ model: CollectionPoint, as: 'collectionPoint' }] }
      ]
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier une tournée (affecter véhicule, chauffeur, etc.)
router.put('/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const route = await DailyRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await route.update(req.body);
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Démarrer une tournée
router.put('/:id/start', async (req, res) => {
  try {
    const route = await DailyRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await route.update({ status: 'en_cours', startedAt: new Date() });
    // Mettre le véhicule en tournée
    if (route.vehicleId) {
      const { Vehicle } = require('../../models');
      await Vehicle.update({ status: 'en_tournee' }, { where: { id: route.vehicleId } });
    }
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Terminer une tournée
router.put('/:id/finish', async (req, res) => {
  try {
    const route = await DailyRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });
    await route.update({ status: 'terminee', finishedAt: new Date(), actualWeight: req.body.actualWeight });

    // Mettre à jour lastCollectionDate des CAV collectés
    const points = await DailyRoutePoint.findAll({
      where: { dailyRouteId: route.id, status: 'collecte' }
    });
    for (const p of points) {
      await CollectionPoint.update({ lastCollectionDate: route.date }, { where: { id: p.collectionPointId } });
    }

    // Véhicule redevient disponible
    if (route.vehicleId) {
      await Vehicle.update({ status: 'disponible' }, { where: { id: route.vehicleId } });
    }
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scanner/collecter un point
router.put('/:id/scan/:pointId', async (req, res) => {
  try {
    const { fillLevel, latitude, longitude, notes, status } = req.body;
    const drp = await DailyRoutePoint.findOne({
      where: { dailyRouteId: req.params.id, collectionPointId: req.params.pointId }
    });
    if (!drp) return res.status(404).json({ error: 'Point non trouvé dans cette tournée' });

    await drp.update({
      status: status || 'collecte',
      fillLevel,
      scannedAt: new Date(),
      latitude, longitude, notes
    });
    res.json(drp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une pesée à une tournée
router.post('/:id/weight', async (req, res) => {
  try {
    const { poidsNet, tare, poidsBrut } = req.body;
    const route = await DailyRoute.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Tournée non trouvée' });

    const record = await WeightRecord.create({
      dailyRouteId: route.id,
      poidsNet, tare, poidsBrut,
      weighedAt: new Date(),
      mois: new Date().getMonth() + 1,
      trimestre: `T${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      annee: new Date().getFullYear()
    });

    // Mettre à jour le poids réel de la tournée
    await route.update({ actualWeight: poidsNet });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer une tournée journalière
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    await DailyRoutePoint.destroy({ where: { dailyRouteId: req.params.id } });
    await GPSTrack.destroy({ where: { dailyRouteId: req.params.id } });
    await DailyRoute.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
