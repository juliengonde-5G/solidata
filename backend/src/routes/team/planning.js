const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/auth');
const { Planning, Employee, Vehicle, Route: CollectionRoute } = require('../../models');

router.use(authenticate);

// Planning par semaine
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate et endDate requis (YYYY-MM-DD)' });
    }

    const employeeWhere = {};
    if (department) employeeWhere.department = department;

    const plannings = await Planning.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Employee, as: 'employee', where: employeeWhere },
        { model: Vehicle, as: 'vehicle' },
        { model: CollectionRoute, as: 'route' }
      ],
      order: [['date', 'ASC'], [{ model: Employee, as: 'employee' }, 'lastName', 'ASC']]
    });
    res.json(plannings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer/modifier une affectation
router.post('/', async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    const [planning, created] = await Planning.findOrCreate({
      where: { employeeId, date },
      defaults: req.body
    });
    if (!created) {
      await planning.update(req.body);
    }
    const full = await Planning.findByPk(planning.id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Vehicle, as: 'vehicle' },
        { model: CollectionRoute, as: 'route' }
      ]
    });
    res.status(created ? 201 : 200).json(full);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer une affectation
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Planning.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Affectation non trouvée' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
