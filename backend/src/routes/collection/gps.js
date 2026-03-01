const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { GPSTrack, DailyRoute, Vehicle, Employee } = require('../../models');

router.use(authenticate);

// Envoi position GPS (depuis mobile)
router.post('/', async (req, res) => {
  try {
    const { dailyRouteId, latitude, longitude, accuracy, speed } = req.body;
    if (!dailyRouteId || !latitude || !longitude) {
      return res.status(400).json({ error: 'dailyRouteId, latitude, longitude requis' });
    }
    const track = await GPSTrack.create({
      dailyRouteId, latitude, longitude, accuracy, speed,
      employeeId: req.user.employeeId || null,
      recordedAt: new Date()
    });
    res.status(201).json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Envoi batch GPS
router.post('/batch', async (req, res) => {
  try {
    const { points } = req.body;
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Tableau de points requis' });
    }
    const records = await GPSTrack.bulkCreate(
      points.map(p => ({
        dailyRouteId: p.dailyRouteId,
        employeeId: req.user.employeeId || null,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        speed: p.speed,
        recordedAt: p.recordedAt || new Date()
      }))
    );
    res.status(201).json({ count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historique GPS d'une tournée
router.get('/route/:dailyRouteId', async (req, res) => {
  try {
    const tracks = await GPSTrack.findAll({
      where: { dailyRouteId: req.params.dailyRouteId },
      order: [['recordedAt', 'ASC']]
    });
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live — Toutes les tournées en cours avec dernière position
router.get('/live', async (req, res) => {
  try {
    const activeRoutes = await DailyRoute.findAll({
      where: { status: 'en_cours' },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'licensePlate'] },
        { model: Employee, as: 'driver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    const result = [];
    for (const route of activeRoutes) {
      const lastPos = await GPSTrack.findOne({
        where: { dailyRouteId: route.id },
        order: [['recordedAt', 'DESC']]
      });
      result.push({
        ...route.toJSON(),
        lastPosition: lastPos ? {
          latitude: lastPos.latitude,
          longitude: lastPos.longitude,
          speed: lastPos.speed,
          recordedAt: lastPos.recordedAt
        } : null
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
