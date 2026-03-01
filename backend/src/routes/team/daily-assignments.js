const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { DailyAssignment, WorkStation, Employee, EmployeeDayStatus, User } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');

router.use(authenticate);

// GET /day/:date — Toutes les affectations d'un jour
router.get('/day/:date', async (req, res) => {
  try {
    const assignments = await DailyAssignment.findAll({
      where: { date: req.params.date },
      include: [
        { model: WorkStation, as: 'workStation' },
        { model: Employee, as: 'employee' }
      ],
      order: [[{ model: WorkStation, as: 'workStation' }, 'group', 'ASC'], [{ model: WorkStation, as: 'workStation' }, 'sortOrder', 'ASC']]
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /week/:date — Affectations de la semaine (lundi-vendredi ou mardi-samedi)
router.get('/week/:date', async (req, res) => {
  try {
    const d = new Date(req.params.date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const dates = [];
    for (let i = 0; i < 6; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      dates.push(current.toISOString().split('T')[0]);
    }

    const assignments = await DailyAssignment.findAll({
      where: { date: { [Op.in]: dates } },
      include: [
        { model: WorkStation, as: 'workStation' },
        { model: Employee, as: 'employee' }
      ],
      order: [['date', 'ASC']]
    });

    // Statuts des employés pour la semaine
    const statuses = await EmployeeDayStatus.findAll({
      where: { date: { [Op.in]: dates } }
    });

    // Tous les postes actifs pour la grille
    const workStations = await WorkStation.findAll({
      where: { active: true },
      order: [['group', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({ dates, assignments, statuses, workStations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stats/:date — Stats du jour (postes pourvus, alertes)
router.get('/stats/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const workStations = await WorkStation.findAll({ where: { active: true } });
    const assignments = await DailyAssignment.findAll({ where: { date } });
    const statuses = await EmployeeDayStatus.findAll({ where: { date } });
    const employees = await Employee.findAll({ where: { active: true } });

    const assignedMap = {};
    assignments.forEach(a => { assignedMap[a.workStationId] = a; });

    const totalStations = workStations.length;
    const filledStations = assignments.length;
    const mandatoryStations = workStations.filter(s => s.mandatory);
    const mandatoryFilled = mandatoryStations.filter(s => assignedMap[s.id]).length;
    const mandatoryMissing = mandatoryStations.filter(s => !assignedMap[s.id]);

    const dateObj = new Date(date);
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[dateObj.getDay()];

    // Employés indisponibles ce jour
    const unavailableIds = new Set();
    statuses.filter(s => s.status !== 'travaille').forEach(s => unavailableIds.add(s.employeeId));
    employees.filter(e => e.weeklyDayOff === dayName).forEach(e => unavailableIds.add(e.id));

    const availableCount = employees.filter(e => !unavailableIds.has(e.id)).length;
    const assignedEmployeeIds = new Set(assignments.map(a => a.employeeId));
    const freeCount = availableCount - assignedEmployeeIds.size;

    const confirmed = assignments.filter(a => a.status === 'confirme').length;
    const previsionnel = assignments.filter(a => a.status === 'previsionnel').length;

    res.json({
      totalStations,
      filledStations,
      mandatoryTotal: mandatoryStations.length,
      mandatoryFilled,
      mandatoryMissing: mandatoryMissing.map(s => ({ id: s.id, name: s.name, group: s.group })),
      availableEmployees: availableCount,
      freeEmployees: freeCount,
      confirmed,
      previsionnel,
      dayName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /assign — Affecter un collaborateur à un poste (ou désaffecter)
router.put('/assign', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, workStationId, employeeId } = req.body;
    if (!date || !workStationId) return res.status(400).json({ error: 'Date et poste requis' });

    // Désaffectation
    if (!employeeId) {
      await DailyAssignment.destroy({ where: { date, workStationId } });
      return res.json({ message: 'Désaffecté' });
    }

    // Vérifier que l'employé n'est pas déjà affecté ailleurs ce jour
    const existing = await DailyAssignment.findOne({
      where: { date, employeeId, workStationId: { [Op.ne]: workStationId } }
    });
    if (existing) {
      const ws = await WorkStation.findByPk(existing.workStationId);
      return res.status(409).json({ error: `Déjà affecté au poste: ${ws?.name || 'inconnu'}` });
    }

    // Vérifier les qualifications
    const workStation = await WorkStation.findByPk(workStationId);
    const employee = await Employee.findByPk(employeeId);
    if (!workStation || !employee) return res.status(404).json({ error: 'Poste ou employé non trouvé' });

    if (workStation.reqCaces && !employee.caces) {
      return res.status(400).json({ error: 'CACES requis pour ce poste' });
    }
    if (workStation.reqPermis && !employee.drivingLicense) {
      return res.status(400).json({ error: 'Permis B requis pour ce poste' });
    }

    // Upsert
    const [assignment] = await DailyAssignment.upsert({
      date,
      workStationId,
      employeeId,
      status: 'previsionnel'
    }, {
      conflictFields: ['date', 'workStationId']
    });

    const full = await DailyAssignment.findByPk(assignment.id, {
      include: [
        { model: WorkStation, as: 'workStation' },
        { model: Employee, as: 'employee' }
      ]
    });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /confirm — Confirmer les affectations d'un jour
router.put('/confirm', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, assignmentIds } = req.body;
    const where = {};
    if (date) where.date = date;
    if (assignmentIds) where.id = { [Op.in]: assignmentIds };

    await DailyAssignment.update(
      { status: 'confirme', confirmedBy: req.user.id, confirmedAt: new Date() },
      { where }
    );
    res.json({ message: 'Affectations confirmées' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /available/:date — Employés disponibles pour un jour donné
router.get('/available/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const dateObj = new Date(date);
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[dateObj.getDay()];

    const employees = await Employee.findAll({ where: { active: true }, order: [['lastName', 'ASC']] });
    const statuses = await EmployeeDayStatus.findAll({ where: { date } });
    const assignments = await DailyAssignment.findAll({ where: { date } });

    const statusMap = {};
    statuses.forEach(s => { statusMap[s.employeeId] = s.status; });
    const assignedMap = {};
    assignments.forEach(a => { assignedMap[a.employeeId] = a.workStationId; });

    const result = employees.map(e => ({
      ...e.toJSON(),
      dayStatus: statusMap[e.id] || (e.weeklyDayOff === dayName ? 'repos' : 'travaille'),
      assignedToWorkStationId: assignedMap[e.id] || null,
      available: !assignedMap[e.id] && (statusMap[e.id] || 'travaille') === 'travaille' && e.weeklyDayOff !== dayName
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Statuts journaliers des employés ===

// GET /employee-status/:date — Statuts de tous les employés pour un jour
router.get('/employee-status/:date', async (req, res) => {
  try {
    const statuses = await EmployeeDayStatus.findAll({
      where: { date: req.params.date },
      include: [{ model: Employee, as: 'employee' }]
    });
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /employee-status — Définir le statut d'un employé pour un jour
router.put('/employee-status', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { employeeId, date, status, notes } = req.body;
    if (!employeeId || !date || !status) return res.status(400).json({ error: 'Champs requis manquants' });

    // Si statut = travaille, supprimer l'entrée (c'est le défaut)
    if (status === 'travaille') {
      await EmployeeDayStatus.destroy({ where: { employeeId, date } });
      return res.json({ message: 'Statut réinitialisé' });
    }

    const [dayStatus] = await EmployeeDayStatus.upsert({
      employeeId, date, status, notes
    }, {
      conflictFields: ['employeeId', 'date']
    });
    res.json(dayStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /employee-calendar/:employeeId — Calendrier mensuel d'un employé
router.get('/employee-calendar/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query; // format YYYY-MM
    if (!month) return res.status(400).json({ error: 'Paramètre month requis (YYYY-MM)' });

    const startDate = `${month}-01`;
    const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
      .toISOString().split('T')[0];

    const statuses = await EmployeeDayStatus.findAll({
      where: { employeeId, date: { [Op.between]: [startDate, endDate] } }
    });

    const assignments = await DailyAssignment.findAll({
      where: { employeeId, date: { [Op.between]: [startDate, endDate] } },
      include: [{ model: WorkStation, as: 'workStation' }]
    });

    const vakAssignments = await require('../../models').VakAssignment.findAll({
      where: { employeeId, date: { [Op.between]: [startDate, endDate] } },
      include: [{ model: require('../../models').VakWorkStation, as: 'vakWorkStation' }]
    });

    res.json({ statuses, assignments, vakAssignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
