const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { VakEvent, VakWorkStation, VakAssignment, Employee } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

// ==================== ÉVÉNEMENTS VAK ====================

// GET /events — Liste des VAK
router.get('/events', async (req, res) => {
  try {
    const events = await VakEvent.findAll({
      order: [['startDate', 'DESC']]
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /events — Créer une VAK
router.post('/events', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { name, startDate, endDate, notes } = req.body;
    if (!name || !startDate || !endDate) return res.status(400).json({ error: 'Nom et dates requis' });
    const event = await VakEvent.create({ name, startDate, endDate, notes });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /events/:id — Modifier une VAK
router.put('/events/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const event = await VakEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'VAK non trouvée' });
    await event.update(req.body);
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /events/:id — Supprimer une VAK
router.delete('/events/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const event = await VakEvent.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'VAK non trouvée' });
    await VakAssignment.destroy({ where: { vakEventId: event.id } });
    await event.destroy();
    res.json({ message: 'VAK supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== POSTES VAK ====================

// GET /workstations — Liste des postes VAK
router.get('/workstations', async (req, res) => {
  try {
    const stations = await VakWorkStation.findAll({
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workstations — Créer un poste VAK
router.post('/workstations', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await VakWorkStation.create(req.body);
    res.status(201).json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /workstations/:id — Modifier un poste VAK
router.put('/workstations/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await VakWorkStation.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: 'Poste VAK non trouvé' });
    await station.update(req.body);
    res.json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /workstations/:id — Supprimer un poste VAK
router.delete('/workstations/:id', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const station = await VakWorkStation.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: 'Poste VAK non trouvé' });
    await VakAssignment.destroy({ where: { vakWorkStationId: station.id } });
    await station.destroy();
    res.json({ message: 'Poste VAK supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AFFECTATIONS VAK ====================

// GET /assignments/:eventId/:date — Affectations d'un jour d'une VAK
router.get('/assignments/:eventId/:date', async (req, res) => {
  try {
    const assignments = await VakAssignment.findAll({
      where: { vakEventId: req.params.eventId, date: req.params.date },
      include: [
        { model: VakWorkStation, as: 'vakWorkStation' },
        { model: Employee, as: 'employee' }
      ],
      order: [[{ model: VakWorkStation, as: 'vakWorkStation' }, 'sortOrder', 'ASC']]
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /assignments — Affecter un collaborateur à un poste VAK
router.put('/assignments', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { vakEventId, date, vakWorkStationId, employeeId } = req.body;
    if (!vakEventId || !date || !vakWorkStationId) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    if (!employeeId) {
      await VakAssignment.destroy({ where: { vakEventId, date, vakWorkStationId } });
      return res.json({ message: 'Désaffecté' });
    }

    // findOrCreate + update pour fiabilité (upsert parfois problématique avec index composite)
    const existing = await VakAssignment.findOne({ where: { vakEventId, date, vakWorkStationId } });
    let assignment;
    if (existing) {
      await existing.update({ employeeId });
      assignment = existing;
    } else {
      assignment = await VakAssignment.create({ vakEventId, date, vakWorkStationId, employeeId });
    }

    const full = await VakAssignment.findByPk(assignment.id, {
      include: [
        { model: VakWorkStation, as: 'vakWorkStation' },
        { model: Employee, as: 'employee' }
      ]
    });
    res.json(full);
  } catch (err) {
    console.error('VAK assign error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
