const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../../middleware/auth');
const { CollectionPoint, WeightRecord, DailyRoute, DailyRoutePoint, sequelize } = require('../../models');

router.use(authenticate);

// Accessible uniquement aux rôles autorite + admin
function requireAutorite(req, res, next) {
  if (!req.user || !['autorite', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès réservé aux autorités administratives' });
  }
  next();
}

router.use(requireAutorite);

// ============================================================
// GET /kpis — Indicateurs principaux
// Params: startDate, endDate (période filtrée)
// ============================================================
router.get('/kpis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const currentYear = new Date().getFullYear();
    const ytdStart = `${currentYear}-01-01`;
    const ytdEnd = new Date().toISOString().slice(0, 10);
    const prevYear = currentYear - 1;

    // CAV disponibles / indisponibles
    const totalCAV = await CollectionPoint.count({ where: { active: true } });
    const suspendedCAV = await CollectionPoint.count({
      where: { active: true, suspensionMotif: { [Op.ne]: null } }
    });
    const availableCAV = totalCAV - suspendedCAV;

    // Total nb de CAV (bornes)
    const cavResult = await CollectionPoint.findAll({
      where: { active: true },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('nbCav')), 'totalNbCav']
      ],
      raw: true
    });
    const totalNbCav = parseInt(cavResult[0]?.totalNbCav) || totalCAV;

    // Tonnages sur la période filtrée
    const periodWhere = {};
    if (startDate && endDate) {
      periodWhere.weighedAt = { [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')] };
    } else {
      periodWhere.weighedAt = { [Op.between]: [new Date(ytdStart), new Date(ytdEnd + 'T23:59:59')] };
    }

    const periodTonnage = await WeightRecord.findAll({
      where: periodWhere,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']
      ],
      raw: true
    });
    const periodTotalKg = parseInt(periodTonnage[0]?.total) || 0;

    // Tonnages depuis début d'année
    const ytdTonnage = await WeightRecord.findAll({
      where: { weighedAt: { [Op.between]: [new Date(ytdStart), new Date(ytdEnd + 'T23:59:59')] } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']
      ],
      raw: true
    });
    const ytdTotalKg = parseInt(ytdTonnage[0]?.total) || 0;

    // Tonnages année précédente (même période relative)
    let prevYearTotalKg = 0;
    if (startDate && endDate) {
      const prevStart = startDate.replace(String(currentYear), String(prevYear));
      const prevEnd = endDate.replace(String(currentYear), String(prevYear));
      const prevTonnage = await WeightRecord.findAll({
        where: { weighedAt: { [Op.between]: [new Date(prevStart), new Date(prevEnd + 'T23:59:59')] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']
        ],
        raw: true
      });
      prevYearTotalKg = parseInt(prevTonnage[0]?.total) || 0;
    } else {
      // YTD N-1
      const prevYtdStart = `${prevYear}-01-01`;
      const prevYtdEnd = ytdEnd.replace(String(currentYear), String(prevYear));
      const prevTonnage = await WeightRecord.findAll({
        where: { weighedAt: { [Op.between]: [new Date(prevYtdStart), new Date(prevYtdEnd + 'T23:59:59')] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']
        ],
        raw: true
      });
      prevYearTotalKg = parseInt(prevTonnage[0]?.total) || 0;
    }

    // Tendance en %
    const tendance = prevYearTotalKg > 0
      ? Math.round(((periodTotalKg - prevYearTotalKg) / prevYearTotalKg) * 100)
      : null;

    // Économie CO2 : facteur textile réemploi ≈ 25 kg CO2 économisé par tonne collectée
    // Source : ADEME - réemploi textile
    const CO2_FACTOR = 25; // kg CO2 / tonne
    const periodCO2 = Math.round((periodTotalKg / 1000) * CO2_FACTOR);
    const ytdCO2 = Math.round((ytdTotalKg / 1000) * CO2_FACTOR);

    res.json({
      cav: {
        disponibles: availableCAV,
        indisponibles: suspendedCAV,
        totalPoints: totalCAV,
        totalNbCav
      },
      tonnage: {
        periode: Math.round(periodTotalKg),
        annee: Math.round(ytdTotalKg),
        periodeTonnes: Math.round(periodTotalKg / 10) / 100,
        anneeTonnes: Math.round(ytdTotalKg / 10) / 100
      },
      tendance: {
        pourcentage: tendance,
        periodePrecedente: Math.round(prevYearTotalKg),
        periodeActuelle: Math.round(periodTotalKg)
      },
      co2: {
        periode: periodCO2,
        annee: ytdCO2
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /points — Tous les points de collecte avec stats individuelles
// Params: startDate, endDate
// ============================================================
router.get('/points', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const currentYear = new Date().getFullYear();
    const ytdStart = `${currentYear}-01-01`;

    const points = await CollectionPoint.findAll({
      where: { active: true },
      attributes: ['id', 'name', 'address', 'city', 'latitude', 'longitude', 'nbCav',
        'avgFillRate', 'lastCollectionDate', 'suspensionMotif', 'active'],
      order: [['city', 'ASC'], ['name', 'ASC']]
    });

    // Récupérer les collectes via DailyRoutePoint pour les stats par CAV
    // On fait un calcul agrégé : combien de fois chaque point a été collecté et poids associé
    const pointStats = {};

    // Stats via DailyRoutePoint (collectes terrain)
    const collectedPoints = await DailyRoutePoint.findAll({
      where: { status: 'collecte' },
      include: [{
        model: DailyRoute,
        as: 'dailyRoute',
        attributes: ['date'],
        where: {
          date: { [Op.gte]: ytdStart }
        }
      }],
      attributes: ['collectionPointId', 'scannedAt'],
      raw: true
    });

    collectedPoints.forEach(cp => {
      const id = cp.collectionPointId;
      if (!pointStats[id]) pointStats[id] = { collectionsYTD: 0, collectionsPeriod: 0 };
      pointStats[id].collectionsYTD++;
      if (startDate && endDate) {
        const d = cp['dailyRoute.date'];
        if (d >= startDate && d <= endDate) {
          pointStats[id].collectionsPeriod++;
        }
      }
    });

    // Poids par point via WeightRecord liés aux DailyRoutes ayant ces points
    // Simplifié : on retourne les données de tonnage globales
    // et le nombre de collectes par point

    const result = points.map(p => {
      const pj = p.toJSON();
      const stats = pointStats[p.id] || {};
      return {
        ...pj,
        collectionsYTD: stats.collectionsYTD || p.totalCollections2025 || 0,
        collectionsPeriod: stats.collectionsPeriod || 0
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /point/:id/stats — Stats détaillées d'un point de collecte
// Params: startDate, endDate
// ============================================================
router.get('/point/:id/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const currentYear = new Date().getFullYear();
    const ytdStart = `${currentYear}-01-01`;

    const point = await CollectionPoint.findByPk(req.params.id);
    if (!point) return res.status(404).json({ error: 'Point non trouvé' });

    // Dernière collecte
    const lastCollection = await DailyRoutePoint.findOne({
      where: { collectionPointId: point.id, status: 'collecte' },
      include: [{ model: DailyRoute, as: 'dailyRoute', attributes: ['date'] }],
      order: [['scannedAt', 'DESC']]
    });

    // Nombre de collectes YTD
    const collectionsYTD = await DailyRoutePoint.count({
      where: { collectionPointId: point.id, status: 'collecte' },
      include: [{
        model: DailyRoute, as: 'dailyRoute',
        where: { date: { [Op.gte]: ytdStart } },
        attributes: []
      }]
    });

    // Nombre de collectes sur la période filtrée
    let collectionsPeriod = 0;
    if (startDate && endDate) {
      collectionsPeriod = await DailyRoutePoint.count({
        where: { collectionPointId: point.id, status: 'collecte' },
        include: [{
          model: DailyRoute, as: 'dailyRoute',
          where: { date: { [Op.between]: [startDate, endDate] } },
          attributes: []
        }]
      });
    }

    // Poids cumulé YTD via les tournées de ce point
    const dailyRouteIds = await DailyRoutePoint.findAll({
      where: { collectionPointId: point.id, status: 'collecte' },
      include: [{
        model: DailyRoute, as: 'dailyRoute',
        where: { date: { [Op.gte]: ytdStart } },
        attributes: ['id']
      }],
      attributes: ['dailyRouteId'],
      raw: true
    });

    const routeIds = [...new Set(dailyRouteIds.map(d => d.dailyRouteId))];
    let weightYTD = 0;
    let weightPeriod = 0;
    if (routeIds.length > 0) {
      const weights = await WeightRecord.findAll({
        where: { dailyRouteId: { [Op.in]: routeIds } },
        include: [{ model: DailyRoute, as: 'dailyRoute', attributes: ['date'] }]
      });
      weights.forEach(w => {
        const wj = w.toJSON();
        weightYTD += wj.poidsNet || 0;
        if (startDate && endDate && wj.dailyRoute?.date >= startDate && wj.dailyRoute?.date <= endDate) {
          weightPeriod += wj.poidsNet || 0;
        }
      });
    }

    // Moyenne par collecte sur la période
    const avgPeriod = collectionsPeriod > 0 ? Math.round(weightPeriod / collectionsPeriod) : 0;

    res.json({
      point: {
        id: point.id,
        name: point.name,
        address: point.address,
        city: point.city,
        nbCav: point.nbCav,
        avgFillRate: point.avgFillRate,
        latitude: point.latitude,
        longitude: point.longitude
      },
      derniereCollecte: lastCollection?.dailyRoute?.date || point.lastCollectionDate || null,
      cumulAnnee: Math.round(weightYTD),
      cumulPeriode: Math.round(weightPeriod),
      moyennePeriode: avgPeriod,
      nbCollectesAnnee: collectionsYTD || point.totalCollections2025 || 0,
      nbCollectesPeriode: collectionsPeriod
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /monthly — Données mensuelles pour graphique tendance
// ============================================================
router.get('/monthly', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const records = await WeightRecord.findAll({
      where: { annee: currentYear },
      attributes: ['mois', [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']],
      group: ['mois'],
      raw: true
    });

    // Année précédente
    const prevRecords = await WeightRecord.findAll({
      where: { annee: currentYear - 1 },
      attributes: ['mois', [sequelize.fn('SUM', sequelize.col('poidsNet')), 'total']],
      group: ['mois'],
      raw: true
    });

    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthly = MOIS.map((label, i) => {
      const m = i + 1;
      const current = records.find(r => r.mois === m);
      const prev = prevRecords.find(r => r.mois === m);
      return {
        mois: label,
        anneeEnCours: Math.round((parseInt(current?.total) || 0) / 1000), // en tonnes
        anneePrecedente: Math.round((parseInt(prev?.total) || 0) / 1000)
      };
    });

    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
