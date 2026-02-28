const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { Employee, Skill, Planning } = require('../../models');

router.use(authenticate);

// Liste des employés
router.get('/', async (req, res) => {
  try {
    const { department, active } = req.query;
    const where = {};
    if (department) where.department = department;
    if (active !== undefined) where.active = active === 'true';

    const employees = await Employee.findAll({
      where,
      include: [{ model: Skill, as: 'skills' }],
      order: [['lastName', 'ASC']]
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Détail employé
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: Skill, as: 'skills' },
        { model: Planning, as: 'plannings', limit: 30, order: [['date', 'DESC']] }
      ]
    });
    if (!employee) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un employé
router.post('/', async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Modifier un employé
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employé non trouvé' });
    await employee.update(req.body);
    res.json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ajouter une compétence
router.post('/:id/skills', async (req, res) => {
  try {
    const skill = await Skill.create({ ...req.body, employeeId: req.params.id });
    res.status(201).json(skill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer une compétence
router.delete('/:employeeId/skills/:skillId', async (req, res) => {
  try {
    const deleted = await Skill.destroy({ where: { id: req.params.skillId, employeeId: req.params.employeeId } });
    if (!deleted) return res.status(404).json({ error: 'Compétence non trouvée' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
