const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate, requireRole } = require('../../middleware/auth');
const { RefashionDeclaration, CollectionReport, Employee } = require('../../models');

router.use(authenticate);

// Liste des déclarations Refashion
router.get('/', async (req, res) => {
  try {
    const { year, status } = req.query;
    const where = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const declarations = await RefashionDeclaration.findAll({
      where,
      include: [{ model: CollectionReport, as: 'report' }],
      order: [['year', 'DESC'], ['semester', 'DESC']]
    });
    res.json(declarations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Générer une déclaration semestrielle
router.post('/generate', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { year, semester } = req.body;
    if (!year || !semester) return res.status(400).json({ error: 'year et semester (S1/S2) requis' });

    const startMonth = semester === 'S1' ? 1 : 7;
    const endMonth = semester === 'S1' ? 6 : 12;

    // Agréger les rapports mensuels
    const periods = [];
    for (let m = startMonth; m <= endMonth; m++) {
      periods.push(`${year}-${String(m).padStart(2, '0')}`);
    }

    const reports = await CollectionReport.findAll({
      where: { period: { [Op.in]: periods }, periodType: 'mensuel' }
    });

    const totalWeight = reports.reduce((sum, r) => sum + r.totalWeightKg, 0);
    const totalTonnage = totalWeight / 1000;

    // Compter les employés actifs en insertion (CDDI)
    const insertionEmployees = await Employee.count({
      where: { active: true, contractType: 'cddi' }
    });

    // Création du rapport semestriel agrégé
    const [semReport] = await CollectionReport.findOrCreate({
      where: { period: `${year}-${semester}`, periodType: 'semestriel' },
      defaults: {
        totalWeightKg: totalWeight,
        totalCollections: reports.reduce((s, r) => s + r.totalCollections, 0),
        totalPoints: Math.max(...reports.map(r => r.totalPoints), 0),
        status: 'valide'
      }
    });

    // Estimations par défaut des taux (modifiables ensuite)
    const reuse = totalTonnage * 0.55;
    const recycle = totalTonnage * 0.32;
    const energy = totalTonnage * 0.05;
    const waste = totalTonnage * 0.08;

    const [declaration, created] = await RefashionDeclaration.findOrCreate({
      where: { year, semester },
      defaults: {
        reportId: semReport.id,
        totalTonnage,
        reuseTonnage: Math.round(reuse * 100) / 100,
        recycleTonnage: Math.round(recycle * 100) / 100,
        energyRecoveryTonnage: Math.round(energy * 100) / 100,
        wasteTonnage: Math.round(waste * 100) / 100,
        numberOfCollectionPoints: semReport.totalPoints,
        numberOfEmployees: insertionEmployees,
        numberOfInsertionHours: insertionEmployees * 26 * 35, // estimation 26 semaines x 35h
        status: 'brouillon'
      }
    });

    if (!created) {
      await declaration.update({
        reportId: semReport.id,
        totalTonnage,
        numberOfEmployees: insertionEmployees,
        numberOfInsertionHours: insertionEmployees * 26 * 35,
        numberOfCollectionPoints: semReport.totalPoints
      });
    }

    res.status(created ? 201 : 200).json(declaration);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier une déclaration
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const declaration = await RefashionDeclaration.findByPk(req.params.id);
    if (!declaration) return res.status(404).json({ error: 'Déclaration non trouvée' });
    await declaration.update(req.body);
    res.json(declaration);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Exporter en CSV
router.get('/:id/export', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const declaration = await RefashionDeclaration.findByPk(req.params.id);
    if (!declaration) return res.status(404).json({ error: 'Déclaration non trouvée' });

    const csv = [
      'Champ;Valeur',
      `Année;${declaration.year}`,
      `Semestre;${declaration.semester}`,
      `Tonnage total;${declaration.totalTonnage}`,
      `Tonnage réemploi;${declaration.reuseTonnage}`,
      `Tonnage recyclage;${declaration.recycleTonnage}`,
      `Tonnage valorisation énergétique;${declaration.energyRecoveryTonnage}`,
      `Tonnage déchets;${declaration.wasteTonnage}`,
      `Nombre de points de collecte;${declaration.numberOfCollectionPoints}`,
      `Nombre de salariés insertion;${declaration.numberOfEmployees}`,
      `Heures d'insertion;${declaration.numberOfInsertionHours}`,
      `Statut;${declaration.status}`
    ].join('\n');

    await declaration.update({ exportedAt: new Date(), exportFormat: 'csv', status: 'transmis' });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="refashion_${declaration.year}_${declaration.semester}.csv"`);
    res.send('\ufeff' + csv); // BOM pour Excel
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
