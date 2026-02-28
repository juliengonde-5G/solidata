const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate, requireRole } = require('../../middleware/auth');
const { CollectionReport, RefashionDeclaration, Collection, CollectionPoint, Employee } = require('../../models');

router.use(authenticate);

// Liste des rapports
router.get('/', async (req, res) => {
  try {
    const { periodType, status } = req.query;
    const where = {};
    if (periodType) where.periodType = periodType;
    if (status) where.status = status;

    const reports = await CollectionReport.findAll({ where, order: [['period', 'DESC']] });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Générer un rapport mensuel à partir des collectes
router.post('/generate', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ error: 'year et month requis' });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Collecter les données
    const collections = await Collection.findAll({
      where: {
        collectionDate: { [Op.between]: [startDate, endDate] },
        status: 'terminee'
      },
      include: [{ model: CollectionPoint, as: 'collectionPoint' }]
    });

    const totalWeight = collections.reduce((sum, c) => sum + (c.weightKg || 0), 0);
    const pointIds = new Set(collections.map(c => c.collectionPointId));

    // Poids par type de point
    const weightByType = {};
    collections.forEach(c => {
      const type = c.collectionPoint?.type || 'autre';
      weightByType[type] = (weightByType[type] || 0) + (c.weightKg || 0);
    });

    const [report, created] = await CollectionReport.findOrCreate({
      where: { period, periodType: 'mensuel' },
      defaults: {
        totalWeightKg: totalWeight,
        totalCollections: collections.length,
        totalPoints: pointIds.size,
        weightByType,
        generatedBy: req.user.id,
        status: 'brouillon'
      }
    });

    if (!created) {
      await report.update({
        totalWeightKg: totalWeight,
        totalCollections: collections.length,
        totalPoints: pointIds.size,
        weightByType,
        generatedBy: req.user.id
      });
    }

    res.status(created ? 201 : 200).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Valider un rapport
router.put('/:id/validate', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const report = await CollectionReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    await report.update({
      status: 'valide',
      validatedBy: req.user.id,
      validatedAt: new Date()
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier les taux (réemploi, recyclage, déchets)
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const report = await CollectionReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Rapport non trouvé' });
    await report.update(req.body);
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard stats globales
router.get('/dashboard', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const reports = await CollectionReport.findAll({
      where: {
        period: { [Op.startsWith]: String(currentYear) },
        periodType: 'mensuel'
      },
      order: [['period', 'ASC']]
    });

    const totalWeight = reports.reduce((sum, r) => sum + r.totalWeightKg, 0);
    const totalCollections = reports.reduce((sum, r) => sum + r.totalCollections, 0);

    const activeEmployees = await Employee.count({ where: { active: true } });
    const activePoints = await CollectionPoint.count({ where: { active: true } });

    res.json({
      year: currentYear,
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      totalTonnage: Math.round(totalWeight / 10) / 100,
      totalCollections,
      activeEmployees,
      activePoints,
      monthlyData: reports.map(r => ({
        period: r.period,
        weightKg: r.totalWeightKg,
        collections: r.totalCollections,
        points: r.totalPoints
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
