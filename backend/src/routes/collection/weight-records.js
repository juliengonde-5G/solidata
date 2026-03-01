const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/auth');
const { WeightRecord } = require('../../models');

router.use(authenticate);

// GET / — Liste des enregistrements de poids (filtrés par date, origine)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, origine } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.weighedAt = { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] };
    }
    if (origine) where.origine = origine;

    const records = await WeightRecord.findAll({
      where,
      order: [['weighedAt', 'DESC']],
      limit: 5000
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — Créer un enregistrement de poids (régularisation)
router.post('/', async (req, res) => {
  try {
    const { categorie, poidsNet, origine, notes, weighedAt, mois, annee } = req.body;
    if (!categorie || !poidsNet) {
      return res.status(400).json({ error: 'Catégorie et poids net requis' });
    }
    const record = await WeightRecord.create({
      categorie,
      poidsNet: parseInt(poidsNet),
      origine: origine || 'Collecte de CAV',
      notes,
      weighedAt: weighedAt || new Date(),
      mois: mois || new Date(weighedAt || Date.now()).getMonth() + 1,
      annee: annee || new Date(weighedAt || Date.now()).getFullYear()
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
