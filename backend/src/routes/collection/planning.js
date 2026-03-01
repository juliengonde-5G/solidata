const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { authenticate, requireRole } = require('../../middleware/auth');
const {
  DailyRoute, DailyRoutePoint, Route, RouteTemplatePoint,
  CollectionPoint, Vehicle, Employee, WeightRecord, sequelize
} = require('../../models');

router.use(authenticate);

const MAX_HOURS_PER_VEHICLE = 6;
const AVG_MINUTES_PER_POINT = 12; // Temps moyen par point (arrêt + collecte + trajet)
const MAX_POINTS_PER_ROUTE = Math.floor((MAX_HOURS_PER_VEHICLE * 60) / AVG_MINUTES_PER_POINT);

// ============================================================
// GET /week/:date — Planning de la semaine (Lun-Ven)
// ============================================================
router.get('/week/:date', async (req, res) => {
  try {
    const d = new Date(req.params.date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);

    const dates = [];
    for (let i = 0; i < 5; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      dates.push(current.toISOString().split('T')[0]);
    }

    const routes = await DailyRoute.findAll({
      where: { date: { [Op.in]: dates } },
      include: [
        { model: Route, as: 'templateRoute', attributes: ['id', 'name', 'sector'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'name', 'licensePlate'] },
        { model: Employee, as: 'driver', attributes: ['id', 'firstName', 'lastName'] },
        { model: Employee, as: 'follower', attributes: ['id', 'firstName', 'lastName'] },
        { model: DailyRoutePoint, as: 'routePoints' }
      ],
      order: [['date', 'ASC'], ['period', 'ASC']]
    });

    // Stats par jour
    const statsByDay = {};
    dates.forEach(d => { statsByDay[d] = { planned: 0, en_cours: 0, terminee: 0, points: 0 }; });
    routes.forEach(r => {
      const s = statsByDay[r.date];
      s[r.status]++;
      if (r.status === 'planifiee') s.planned++;
      s.points += r.routePoints?.length || 0;
    });

    res.json({ dates, routes, statsByDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /generate/standard — Mode standard (tournées prédéfinies)
// ============================================================
router.post('/generate/standard', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, periods, templateIds } = req.body;
    if (!date) return res.status(400).json({ error: 'Date requise' });

    // Sélection par IDs fournis, sinon toutes les tournées actives
    const where = { active: true };
    if (templateIds && templateIds.length > 0) {
      where.id = { [Op.in]: templateIds };
    }

    const templates = await Route.findAll({
      where,
      include: [{
        model: RouteTemplatePoint, as: 'templatePoints',
        include: [{ model: CollectionPoint, as: 'collectionPoint' }],
        order: [['sortOrder', 'ASC']]
      }]
    });

    if (templates.length === 0) {
      return res.json({ created: 0, message: 'Aucune tournée standard sélectionnée' });
    }

    // Vérifier qu'aucune tournée n'existe déjà pour ce jour
    const existing = await DailyRoute.findAll({ where: { date } });

    const created = [];
    const activePeriods = periods || ['matin'];

    for (const template of templates) {
      for (const period of activePeriods) {
        // Ne pas recréer si déjà existante
        if (existing.some(e => e.templateRouteId === template.id && e.period === period)) continue;

        const dr = await DailyRoute.create({
          date, period,
          templateRouteId: template.id,
          source: 'standard',
          status: 'planifiee'
        });

        // Copier les points
        if (template.templatePoints?.length > 0) {
          await DailyRoutePoint.bulkCreate(
            template.templatePoints.map(tp => ({
              dailyRouteId: dr.id,
              collectionPointId: tp.collectionPointId,
              sortOrder: tp.sortOrder
            }))
          );
        }
        created.push(dr);
      }
    }

    res.json({ created: created.length, routes: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /generate/intelligent — Mode intelligent (prédictif)
// ============================================================
router.post('/generate/intelligent', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, vehicleIds } = req.body;
    if (!date) return res.status(400).json({ error: 'Date requise' });

    // Récupérer les véhicules disponibles
    let vehicles;
    if (vehicleIds && vehicleIds.length > 0) {
      vehicles = await Vehicle.findAll({ where: { id: { [Op.in]: vehicleIds } } });
    } else {
      vehicles = await Vehicle.findAll({
        where: { status: { [Op.in]: ['disponible', 'en_tournee'] } }
      });
    }

    if (vehicles.length === 0) {
      return res.json({ created: 0, message: 'Aucun véhicule disponible' });
    }

    // Récupérer tous les CAV actifs avec leurs stats
    const allPoints = await CollectionPoint.findAll({
      where: { active: true, latitude: { [Op.ne]: null } },
      order: [['name', 'ASC']]
    });

    // Calculer un score de priorité pour chaque CAV
    const today = new Date(date);
    const scoredPoints = allPoints.map(p => {
      let score = 0;
      // Taux de remplissage élevé = plus prioritaire
      score += (p.avgFillRate || 0) * 2;
      // Nombre de jours depuis la dernière collecte
      if (p.lastCollectionDate) {
        const daysSince = Math.floor((today - new Date(p.lastCollectionDate)) / 86400000);
        score += Math.min(daysSince * 10, 100);
      } else {
        score += 100; // Jamais collecté = priorité max
      }
      // Volume (nombre de CAV)
      score += (p.nbCav || 1) * 5;
      // Fréquence attendue vs réelle
      if (p.frequence > 0) {
        const expectedDaysBetween = 5 / p.frequence; // 5 jours ouvrés / fréquence hebdo
        if (p.lastCollectionDate) {
          const daysSince = Math.floor((today - new Date(p.lastCollectionDate)) / 86400000);
          if (daysSince > expectedDaysBetween) score += 30; // En retard
        }
      }
      return { ...p.toJSON(), score };
    });

    // Trier par score décroissant
    scoredPoints.sort((a, b) => b.score - a.score);

    // Répartir les points en tournées optimisées (clustering géographique)
    const routes = [];
    const assignedPointIds = new Set();
    const maxPointsPerRoute = MAX_POINTS_PER_ROUTE;

    for (let v = 0; v < vehicles.length; v++) {
      for (const period of ['matin', 'apres_midi']) {
        const routePoints = [];
        // Prendre le point non assigné avec le meilleur score comme seed
        let seed = scoredPoints.find(p => !assignedPointIds.has(p.id));
        if (!seed) break; // Plus de points à assigner

        routePoints.push(seed);
        assignedPointIds.add(seed.id);

        // Remplir avec les points les plus proches géographiquement
        while (routePoints.length < maxPointsPerRoute) {
          const last = routePoints[routePoints.length - 1];
          let bestDist = Infinity;
          let bestPoint = null;

          for (const p of scoredPoints) {
            if (assignedPointIds.has(p.id)) continue;
            // Distance Haversine simplifiée
            const dlat = (p.latitude - last.latitude) * 111;
            const dlon = (p.longitude - last.longitude) * 111 * Math.cos(last.latitude * Math.PI / 180);
            const dist = Math.sqrt(dlat * dlat + dlon * dlon);
            // Pondérer par le score (CAV prioritaires attirent)
            const weightedDist = dist / (1 + p.score / 100);
            if (weightedDist < bestDist) {
              bestDist = weightedDist;
              bestPoint = p;
            }
          }

          // Ne pas aller trop loin (max 15 km entre deux points)
          if (!bestPoint || bestDist > 15) break;
          routePoints.push(bestPoint);
          assignedPointIds.add(bestPoint.id);
        }

        if (routePoints.length > 0) {
          routes.push({
            vehicleId: vehicles[v].id,
            period,
            points: routePoints,
            estimatedWeight: routePoints.reduce((sum, p) => {
              return sum + (p.nbCav || 1) * (p.avgFillRate || 30) * 3; // ~3kg par % de remplissage par CAV
            }, 0)
          });
        }
      }
    }

    // Créer les DailyRoutes
    const created = [];
    for (const r of routes) {
      const dr = await DailyRoute.create({
        date,
        period: r.period,
        vehicleId: r.vehicleId,
        source: 'intelligent',
        status: 'planifiee',
        estimatedWeight: Math.round(r.estimatedWeight),
        notes: `${r.points.length} CAV - Score moyen: ${Math.round(r.points.reduce((s, p) => s + p.score, 0) / r.points.length)}`
      });

      await DailyRoutePoint.bulkCreate(
        r.points.map((p, i) => ({
          dailyRouteId: dr.id,
          collectionPointId: p.id,
          sortOrder: i
        }))
      );

      created.push({ id: dr.id, period: r.period, points: r.points.length, estimatedWeight: r.estimatedWeight });
    }

    res.json({
      created: created.length,
      totalPoints: assignedPointIds.size,
      remainingPoints: allPoints.length - assignedPointIds.size,
      routes: created
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /generate/manual — Mode manuel (sélection par critères)
// ============================================================
router.post('/generate/manual', requireRole('admin', 'manager', 'rh'), async (req, res) => {
  try {
    const { date, period, vehicleId, driverId, followerId, criteria, pointIds } = req.body;
    if (!date) return res.status(400).json({ error: 'Date requise' });

    let selectedPoints = [];

    if (pointIds && pointIds.length > 0) {
      // Points sélectionnés manuellement
      selectedPoints = await CollectionPoint.findAll({
        where: { id: { [Op.in]: pointIds } }
      });
    } else if (criteria) {
      // Sélection par critères
      const where = { active: true };

      // Par ville/commune
      if (criteria.cities && criteria.cities.length > 0) {
        where.city = { [Op.in]: criteria.cities };
      }

      // Par communauté de communes
      if (criteria.communautes && criteria.communautes.length > 0) {
        where.communaute = { [Op.in]: criteria.communautes };
      }

      // Non collectés depuis X jours
      if (criteria.daysSinceCollection) {
        const cutoff = new Date(date);
        cutoff.setDate(cutoff.getDate() - parseInt(criteria.daysSinceCollection));
        where[Op.or] = [
          { lastCollectionDate: { [Op.lt]: cutoff.toISOString().split('T')[0] } },
          { lastCollectionDate: null }
        ];
      }

      // Taux de remplissage minimum
      if (criteria.minFillRate) {
        where.avgFillRate = { [Op.gte]: parseFloat(criteria.minFillRate) };
      }

      selectedPoints = await CollectionPoint.findAll({
        where,
        order: [['city', 'ASC'], ['name', 'ASC']]
      });
    }

    if (selectedPoints.length === 0) {
      return res.json({ created: 0, message: 'Aucun point ne correspond aux critères' });
    }

    // Limiter au max par véhicule
    const limited = selectedPoints.slice(0, MAX_POINTS_PER_ROUTE);

    const dr = await DailyRoute.create({
      date,
      period: period || 'matin',
      vehicleId,
      driverId,
      followerId,
      source: 'manuel',
      status: 'planifiee',
      notes: `Manuel: ${limited.length} CAV sélectionnés`
    });

    // Ordonner géographiquement (nearest neighbor)
    const ordered = optimizeOrder(limited);

    await DailyRoutePoint.bulkCreate(
      ordered.map((p, i) => ({
        dailyRouteId: dr.id,
        collectionPointId: p.id,
        sortOrder: i
      }))
    );

    res.json({
      created: 1,
      pointsSelected: selectedPoints.length,
      pointsInRoute: limited.length,
      route: { id: dr.id, period: dr.period, points: limited.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper — tri géographique nearest neighbor
function optimizeOrder(points) {
  if (points.length <= 1) return points;
  // Centre de tri Le Houlme comme point de départ
  const depot = { latitude: 49.5008, longitude: 1.0506 };
  const ordered = [];
  const remaining = [...points];

  let current = depot;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      if (!p.latitude || !p.longitude) continue;
      const dlat = (p.latitude - current.latitude) * 111;
      const dlon = (p.longitude - current.longitude) * 111 * Math.cos(current.latitude * Math.PI / 180);
      const dist = Math.sqrt(dlat * dlat + dlon * dlon);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }
  return ordered;
}

// ============================================================
// GET /criteria-options — Options pour le mode manuel
// ============================================================
router.get('/criteria-options', async (req, res) => {
  try {
    const [cities] = await sequelize.query(`
      SELECT DISTINCT city, COUNT(*) as count
      FROM collection_points WHERE active = true AND city IS NOT NULL
      GROUP BY city ORDER BY city
    `);
    const [communautes] = await sequelize.query(`
      SELECT DISTINCT communaute, COUNT(*) as count
      FROM collection_points WHERE active = true AND communaute IS NOT NULL
      GROUP BY communaute ORDER BY communaute
    `);
    res.json({ cities, communautes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /stats/monthly — Stats tonnage mensuel
// ============================================================
router.get('/stats/monthly', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const records = await WeightRecord.findAll({
      where: { annee: parseInt(year), origine: 'Collecte de CAV' },
      attributes: [
        'mois',
        [fn('SUM', col('poidsNet')), 'totalKg'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['mois'],
      order: [['mois', 'ASC']]
    });

    // Coefficients saisonniers basés sur les données réelles
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const r = records.find(r => r.dataValues.mois === i + 1);
      return {
        month: i + 1,
        totalKg: r ? parseFloat(r.dataValues.totalKg) : 0,
        count: r ? parseInt(r.dataValues.count) : 0
      };
    });

    const avgMonthly = monthlyData.reduce((s, m) => s + m.totalKg, 0) / 12;
    const coefficients = monthlyData.map(m => ({
      ...m,
      coefficient: avgMonthly > 0 ? Math.round((m.totalKg / avgMonthly) * 100) / 100 : 1
    }));

    res.json({ year: parseInt(year), monthly: coefficients, avgMonthlyKg: Math.round(avgMonthly) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
