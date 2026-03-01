const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireRole } = require('../../middleware/auth');
const { CollectionPoint, Route, RouteTemplatePoint, WeightRecord, sequelize } = require('../../models');

const upload = multer({ dest: '/tmp/solidata-imports/' });

router.use(authenticate);
router.use(requireRole('admin'));

// ============================================================
// POST /kml — Import CAV depuis fichier KML
// ============================================================
router.post('/kml', upload.single('file'), async (req, res) => {
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const placemarks = content.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];

    let imported = 0;
    let skipped = 0;

    for (const pm of placemarks) {
      // Extraire la description
      const descMatch = pm.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/);
      if (!descMatch) { skipped++; continue; }
      const desc = descMatch[1];

      // Extraire les coordonnées
      const coordMatch = pm.match(/<coordinates>([\d.,-]+)/);
      if (!coordMatch) { skipped++; continue; }
      const [lng, lat] = coordMatch[1].split(',').map(Number);

      // Parser la description : VILLE - Adresse (Complément)
      // Format: "ROUEN - 27 rue Saint-Sever (Cours Clémenceau)<br><br>1 CAV<br>"
      const nameMatch = desc.match(/^([^<]+)/);
      if (!nameMatch) { skipped++; continue; }
      const fullName = nameMatch[1].trim().replace(/\ufffd/g, 'é'); // Fix encoding

      // Extraire ville et adresse
      const dashIdx = fullName.indexOf(' - ');
      let city = '', address = '', complement = '';
      if (dashIdx > -1) {
        city = fullName.substring(0, dashIdx).trim();
        const rest = fullName.substring(dashIdx + 3).trim();
        const parenMatch = rest.match(/^(.*?)\s*\(([^)]+)\)/);
        if (parenMatch) {
          address = parenMatch[1].trim();
          complement = parenMatch[2].trim();
        } else {
          address = rest;
        }
      } else {
        city = fullName;
      }

      // Nombre de CAV
      const cavMatch = desc.match(/(\d+)\s*CAV/);
      const nbCav = cavMatch ? parseInt(cavMatch[1]) : 1;

      // Nombre de tournées
      const tourMatch = desc.match(/(\d+)\s*tourn/);
      const freq = tourMatch ? parseInt(tourMatch[1]) : 1;

      // Taux de remplissage
      const fillMatch = desc.match(/remplissage\s*(?:moyen\s*)?(\d+)%/);
      const fillRate = fillMatch ? parseInt(fillMatch[1]) : null;

      // Nombre de collectes 2025
      const collMatch = desc.match(/Collect[ée]\s*(\d+)\s*fois/i);
      const collCount = collMatch ? parseInt(collMatch[1]) : 0;

      // Upsert par nom
      const [point, created] = await CollectionPoint.findOrCreate({
        where: { name: fullName },
        defaults: {
          type: 'cav',
          address,
          addressComplement: complement,
          city: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
            .replace(/(^|\s|-)\S/g, c => c.toUpperCase()), // Capitalize words
          latitude: lat,
          longitude: lng,
          nbCav,
          frequence: freq,
          avgFillRate: fillRate,
          totalCollections2025: collCount,
          active: true
        }
      });

      if (!created) {
        await point.update({
          latitude: lat, longitude: lng, nbCav,
          frequence: freq, avgFillRate: fillRate,
          totalCollections2025: collCount
        });
      }
      imported++;
    }

    // Cleanup
    fs.unlinkSync(req.file.path);
    res.json({ imported, skipped, total: placemarks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /tournees — Import tournées et affectations CAV depuis Excel
// ============================================================
router.post('/tournees', upload.single('file'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Les noms des tournées sont en row 2, colonnes 22-40
    const routeNames = [];
    const routeDays = [];
    const row2 = data[2] || [];
    const row4 = data[4] || [];
    for (let c = 22; c < 42; c++) {
      const name = row2[c];
      const day = row4[c];
      if (name && name.trim() && name.trim() !== ' ') {
        routeNames.push({ col: c, name: name.trim(), day: day ? day.trim().toLowerCase() : null });
      }
    }

    // Créer/mettre à jour les tournées
    const routeMap = {};
    for (const rn of routeNames) {
      const [route] = await Route.findOrCreate({
        where: { name: rn.name },
        defaults: { dayOfWeek: rn.day, active: true }
      });
      if (rn.day && !route.dayOfWeek) {
        await route.update({ dayOfWeek: rn.day });
      }
      routeMap[rn.col] = route;
    }

    // Parser les CAV (rows 5+) et leurs affectations aux tournées
    let cavUpdated = 0;
    let linksCreated = 0;

    for (let r = 5; r < data.length; r++) {
      const row = data[r];
      if (!row || !row[1]) continue; // Pas de nom = fin

      const name = row[1].trim();
      const address = row[12] ? String(row[12]).trim() : '';
      const complement = row[13] ? String(row[13]).trim() : '';
      const postalCode = row[14] ? String(row[14]).trim() : '';
      const city = row[15] ? String(row[15]).trim() : '';
      const lat = row[16] ? parseFloat(row[16]) : null;
      const lng = row[17] ? parseFloat(row[17]) : null;
      const communaute = row[18] ? String(row[18]).trim() : null;
      const surface = row[19] ? String(row[19]).trim() : null;
      const ecoTlcRef = row[20] ? String(row[20]).trim() : null;
      const owner = row[21] ? String(row[21]).trim() : null;
      const nbCav = row[10] ? parseInt(row[10]) : 1;
      const freq = row[11] ? parseInt(row[11]) : 1;

      // Find or create CAV
      const [point, created] = await CollectionPoint.findOrCreate({
        where: { name },
        defaults: {
          type: 'cav', address, addressComplement: complement,
          postalCode: postalCode.slice(0, 5), city, latitude: lat, longitude: lng,
          nbCav, frequence: freq, communaute, surface, ecoTlcRef, owner, active: true
        }
      });

      if (!created) {
        // Update with Excel data (more complete than KML)
        const updates = {};
        if (address) updates.address = address;
        if (complement) updates.addressComplement = complement;
        if (postalCode) updates.postalCode = postalCode.slice(0, 5);
        if (city) updates.city = city;
        if (lat) updates.latitude = lat;
        if (lng) updates.longitude = lng;
        if (communaute) updates.communaute = communaute;
        if (surface) updates.surface = surface;
        if (ecoTlcRef) updates.ecoTlcRef = ecoTlcRef;
        if (owner) updates.owner = owner;
        updates.nbCav = nbCav;
        updates.frequence = freq;
        await point.update(updates);
      }
      cavUpdated++;

      // Affecter aux tournées (check columns 22-40 for route membership)
      for (const rn of routeNames) {
        const val = row[rn.col];
        if (val && val !== '' && val !== '?') {
          const route = routeMap[rn.col];
          const sortOrder = typeof val === 'number' ? val : 0;
          await RouteTemplatePoint.findOrCreate({
            where: { routeId: route.id, collectionPointId: point.id },
            defaults: { sortOrder }
          });
          linksCreated++;
        }
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({
      routesCreated: routeNames.length,
      cavUpdated,
      linksCreated,
      routes: routeNames.map(r => r.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /tonnages — Import pesées depuis Excel
// ============================================================
router.post('/tonnages', upload.single('file'), async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Headers at row 8: ID, Origine, Catégorie, Poids net, Type Tare, Tare, Poids brut, Date fabrication
    let imported = 0;
    let skipped = 0;

    for (let r = 9; r < data.length; r++) {
      const row = data[r];
      if (!row || !row[1]) continue;

      const externalId = String(row[1]);
      const origine = row[2] ? String(row[2]).trim() : null;
      const categorie = row[3] ? String(row[3]).trim() : null;
      const poidsNet = row[4] ? parseInt(row[4]) : null;
      const tare = row[6] ? parseInt(row[6]) : null;
      const poidsBrut = row[7] ? parseInt(row[7]) : null;
      const dateVal = row[8]; // Excel serial date
      const mois = row[10] ? parseInt(row[10]) : null;
      const trimestre = row[11] ? String(row[11]).trim() : null;
      const annee = row[12] ? parseInt(row[12]) : null;

      // Convertir date Excel en JS
      let weighedAt = null;
      if (dateVal && typeof dateVal === 'number') {
        // Excel date serial: jours depuis 1900-01-01 (avec bug leap year 1900)
        weighedAt = new Date((dateVal - 25569) * 86400 * 1000);
      }

      if (!poidsNet) { skipped++; continue; }

      await WeightRecord.findOrCreate({
        where: { externalId },
        defaults: {
          origine, categorie, poidsNet, tare, poidsBrut,
          weighedAt, mois, trimestre, annee
        }
      });
      imported++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ imported, skipped, total: data.length - 9 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /seed-from-repo — Import depuis les fichiers du repo GitHub
// ============================================================
router.post('/seed-from-repo', async (req, res) => {
  try {
    const results = {};
    // Dossier data : /app/data en Docker, ou ./data depuis le repo
    const dataDir = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, '../../../..', 'data');

    // 1. Import KML
    const kmlPath = path.join(dataDir, 'Carte des PAV au 28-02-2026.kml');
    if (fs.existsSync(kmlPath)) {
      const content = fs.readFileSync(kmlPath, 'utf-8');
      const placemarks = content.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
      let kmlImported = 0;

      for (const pm of placemarks) {
        const descMatch = pm.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/);
        if (!descMatch) continue;
        const desc = descMatch[1];
        const coordMatch = pm.match(/<coordinates>([\d.,-]+)/);
        if (!coordMatch) continue;
        const [lng, lat] = coordMatch[1].split(',').map(Number);
        const nameMatch = desc.match(/^([^<]+)/);
        if (!nameMatch) continue;

        const fullName = nameMatch[1].trim();
        const dashIdx = fullName.indexOf(' - ');
        let city = '', address = '', complement = '';
        if (dashIdx > -1) {
          city = fullName.substring(0, dashIdx).trim();
          const rest = fullName.substring(dashIdx + 3).trim();
          const parenMatch = rest.match(/^(.*?)\s*\(([^)]+)\)/);
          if (parenMatch) { address = parenMatch[1].trim(); complement = parenMatch[2].trim(); }
          else { address = rest; }
        } else { city = fullName; }

        const cavMatch = desc.match(/(\d+)\s*CAV/);
        const nbCav = cavMatch ? parseInt(cavMatch[1]) : 1;
        const fillMatch = desc.match(/remplissage\s*(?:moyen\s*)?(\d+)%/);
        const fillRate = fillMatch ? parseInt(fillMatch[1]) : null;

        await CollectionPoint.findOrCreate({
          where: { name: fullName },
          defaults: {
            type: 'cav', address, addressComplement: complement, city,
            latitude: lat, longitude: lng, nbCav, avgFillRate: fillRate, active: true
          }
        });
        kmlImported++;
      }
      results.kml = { imported: kmlImported };
    }

    // 2. Import tournées Excel
    const tourneePath = path.join(dataDir, 'tournee.xlsx');
    if (fs.existsSync(tourneePath)) {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(tourneePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const row2 = data[2] || [];
      const row4 = data[4] || [];
      const routeNames = [];
      for (let c = 22; c < 42; c++) {
        const name = row2[c];
        const day = row4[c];
        if (name && name.trim() && name.trim() !== ' ') {
          routeNames.push({ col: c, name: name.trim(), day: day ? String(day).trim().toLowerCase() : null });
        }
      }

      const routeMap = {};
      for (const rn of routeNames) {
        const dayMap = { 'lun': 'lundi', 'mar': 'mardi', 'mer': 'mercredi', 'jeu': 'jeudi', 'ven': 'vendredi', 'sam': 'samedi' };
        const [route] = await Route.findOrCreate({
          where: { name: rn.name },
          defaults: { dayOfWeek: dayMap[rn.day] || rn.day, active: true }
        });
        routeMap[rn.col] = route;
      }

      let linksCreated = 0;
      for (let r = 5; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[1]) continue;
        const name = String(row[1]).trim();
        const point = await CollectionPoint.findOne({ where: { name } });
        if (!point) continue;

        // Update with Excel enrichment
        const updates = {};
        if (row[12]) updates.address = String(row[12]).trim();
        if (row[13]) updates.addressComplement = String(row[13]).trim();
        if (row[14]) updates.postalCode = String(row[14]).trim().slice(0, 5);
        if (row[15]) updates.city = String(row[15]).trim();
        if (row[16]) updates.latitude = parseFloat(row[16]);
        if (row[17]) updates.longitude = parseFloat(row[17]);
        if (row[18]) updates.communaute = String(row[18]).trim();
        if (row[19]) updates.surface = String(row[19]).trim();
        if (row[20]) updates.ecoTlcRef = String(row[20]).trim();
        if (row[21]) updates.owner = String(row[21]).trim();
        if (row[10]) updates.nbCav = parseInt(row[10]);
        if (row[11]) updates.frequence = parseInt(row[11]);
        if (Object.keys(updates).length > 0) await point.update(updates);

        for (const rn of routeNames) {
          const val = row[rn.col];
          if (val && val !== '' && val !== '?' && val !== ' ') {
            const route = routeMap[rn.col];
            const sortOrder = typeof val === 'number' ? val : 0;
            const [_, created] = await RouteTemplatePoint.findOrCreate({
              where: { routeId: route.id, collectionPointId: point.id },
              defaults: { sortOrder }
            });
            if (created) linksCreated++;
          }
        }
      }
      results.tournees = { routes: routeNames.length, linksCreated };
    }

    // 3. Import tonnages
    const tonnagePath = path.join(dataDir, 'tonnages.xlsx');
    if (fs.existsSync(tonnagePath)) {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(tonnagePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let imported = 0;
      for (let r = 9; r < data.length; r++) {
        const row = data[r];
        if (!row || !row[1]) continue;
        const externalId = String(row[1]);
        const poidsNet = row[4] ? parseInt(row[4]) : null;
        if (!poidsNet) continue;

        let weighedAt = null;
        if (row[8] && typeof row[8] === 'number') {
          weighedAt = new Date((row[8] - 25569) * 86400 * 1000);
        }

        await WeightRecord.findOrCreate({
          where: { externalId },
          defaults: {
            origine: row[2] ? String(row[2]).trim() : null,
            categorie: row[3] ? String(row[3]).trim() : null,
            poidsNet,
            tare: row[6] ? parseInt(row[6]) : null,
            poidsBrut: row[7] ? parseInt(row[7]) : null,
            weighedAt,
            mois: row[10] ? parseInt(row[10]) : null,
            trimestre: row[11] ? String(row[11]).trim() : null,
            annee: row[12] ? parseInt(row[12]) : null
          }
        });
        imported++;
      }
      results.tonnages = { imported };
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
