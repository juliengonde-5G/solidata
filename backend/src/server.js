const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { scheduleEmailIngestion } = require('./services/emailIngestion');

// Empêcher les crashs sur erreurs non gérées
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message || err);
});

// Routes Recrutement
const authRoutes = require('./routes/auth');
const positionsRoutes = require('./routes/recruitment/positions');
const candidatesRoutes = require('./routes/recruitment/candidates');
const personalityRoutes = require('./routes/recruitment/personality');

// Routes Équipe
const employeesRoutes = require('./routes/team/employees');
const vehiclesRoutes = require('./routes/team/vehicles');
const planningRoutes = require('./routes/team/planning');
const workstationsRoutes = require('./routes/team/workstations');
const dailyAssignmentsRoutes = require('./routes/team/daily-assignments');
const vakRoutes = require('./routes/team/vak');

// Routes Collecte
const collectionRoutesRoutes = require('./routes/collection/routes');
const collectionPointsRoutes = require('./routes/collection/points');
const collectionsRoutes = require('./routes/collection/collections');
const dailyRoutesRoutes = require('./routes/collection/daily-routes');
const gpsRoutes = require('./routes/collection/gps');
const planningCollecteRoutes = require('./routes/collection/planning');
const importRoutes = require('./routes/collection/import');

// Routes Reporting
const reportsRoutes = require('./routes/reporting/reports');
const refashionRoutes = require('./routes/reporting/refashion');
const autoriteRoutes = require('./routes/reporting/autorite');

// Routes Administration
const adminUsersRoutes = require('./routes/admin/users');
const adminSettingsRoutes = require('./routes/admin/settings');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors({
  origin: ['http://82.65.155.79:8083', 'http://localhost:8083', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques (uploads CV)
app.use('/uploads', express.static('/app/uploads'));

// Routes API - Recrutement
app.use('/api/auth', authRoutes);
app.use('/api/recruitment/positions', positionsRoutes);
app.use('/api/recruitment/candidates', candidatesRoutes);
app.use('/api/recruitment/personality', personalityRoutes);

// Routes API - Équipe
app.use('/api/team/employees', employeesRoutes);
app.use('/api/team/vehicles', vehiclesRoutes);
app.use('/api/team/planning', planningRoutes);
app.use('/api/team/workstations', workstationsRoutes);
app.use('/api/team/assignments', dailyAssignmentsRoutes);
app.use('/api/team/vak', vakRoutes);

// Routes API - Collecte
app.use('/api/collection/routes', collectionRoutesRoutes);
app.use('/api/collection/points', collectionPointsRoutes);
app.use('/api/collection/collections', collectionsRoutes);
app.use('/api/collection/daily-routes', dailyRoutesRoutes);
app.use('/api/collection/gps', gpsRoutes);
app.use('/api/collection/planning', planningCollecteRoutes);
app.use('/api/collection/import', importRoutes);

// Routes API - Reporting
app.use('/api/reporting/reports', reportsRoutes);
app.use('/api/reporting/refashion', refashionRoutes);
app.use('/api/reporting/autorite', autoriteRoutes);

// Routes API - Administration
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Solidata ERP',
    version: '2.1.0',
    modules: ['recruitment', 'team', 'collection', 'reporting', 'admin']
  });
});

// Démarrage
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie');

    // === Migration des enums et statuts ===
    try {
      // === Migration User.role: ENUM → VARCHAR (pour supporter 'autorite' et futurs rôles) ===
      const [roleCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      `).catch(() => [[]]);
      if (roleCol && roleCol.length > 0 && roleCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration User.role: ENUM → VARCHAR...');
        await sequelize.query(`ALTER TABLE users ALTER COLUMN "role" TYPE VARCHAR(50) USING "role"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_users_role"`).catch(() => {});
      }
      // Migrer l'enum team si elle n'existe pas encore
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_users_team" AS ENUM('tri', 'collecte', 'magasin_lhopital', 'magasin_st_sever', 'magasin_vernon', 'administration');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `).catch(() => {});
      // Migrer les anciens rôles
      await sequelize.query(`UPDATE users SET role = 'collaborateur' WHERE role = 'user'`).catch(() => {});
      await sequelize.query(`UPDATE users SET role = 'collaborateur' WHERE role = 'external'`).catch(() => {});

      // === Migration statuts Kanban candidats ===
      // Convertir la colonne status d'ENUM en VARCHAR si nécessaire
      const [statusCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'candidates' AND column_name = 'status'
      `).catch(() => [[]]);
      if (statusCol && statusCol.length > 0 && statusCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration statuts candidats: ENUM → VARCHAR...');
        await sequelize.query(`ALTER TABLE candidates ALTER COLUMN status TYPE VARCHAR(50) USING status::text`);
        await sequelize.query(`DROP TYPE IF EXISTS "enum_candidates_status"`);
      }
      // Mapper les anciens statuts vers les nouveaux
      await sequelize.query(`UPDATE candidates SET status = 'a_qualifier' WHERE status = 'candidature_qualifiee'`).catch(() => {});
      await sequelize.query(`UPDATE candidates SET status = 'non_retenu' WHERE status = 'candidature_rejetee'`).catch(() => {});
      await sequelize.query(`UPDATE candidates SET status = 'convoque' WHERE status = 'entretien_confirme'`).catch(() => {});
      await sequelize.query(`UPDATE candidates SET status = 'recrute' WHERE status = 'recrutement_valide'`).catch(() => {});

      // === Fix contraintes UNIQUE inline qui bloquent ALTER COLUMN TYPE ===
      const uniqueConstraints = [
        { table: 'collection_points', column: 'qrCode' },
        { table: 'vehicles', column: 'licensePlate' },
        { table: 'users', column: 'email' },
        { table: 'app_settings', column: 'key' },
      ];
      for (const { table, column } of uniqueConstraints) {
        await sequelize.query(`
          DO $$ BEGIN
            ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_${column}_key";
          EXCEPTION WHEN undefined_table THEN NULL;
          END $$;
        `).catch(() => {});
        await sequelize.query(`DROP INDEX IF EXISTS "${table}_${column}_key"`).catch(() => {});
        await sequelize.query(`DROP INDEX IF EXISTS "${table}_${column}"`).catch(() => {});
      }

      // === Migration CollectionPoint.type: ENUM → VARCHAR ===
      const [cpTypeCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'collection_points' AND column_name = 'type'
      `).catch(() => [[]]);
      if (cpTypeCol && cpTypeCol.length > 0 && cpTypeCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration CollectionPoint.type: ENUM → VARCHAR...');
        await sequelize.query(`ALTER TABLE collection_points ALTER COLUMN "type" TYPE VARCHAR(50) USING "type"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_collection_points_type"`).catch(() => {});
      }

      // === Migration Employee enums: ENUM → VARCHAR ===
      const [edCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'department'
      `).catch(() => [[]]);
      if (edCol && edCol.length > 0 && edCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration Employee enums → VARCHAR...');
        await sequelize.query(`ALTER TABLE employees ALTER COLUMN "department" TYPE VARCHAR(50) USING "department"::text`).catch(() => {});
        await sequelize.query(`ALTER TABLE employees ALTER COLUMN "contractType" TYPE VARCHAR(50) USING "contractType"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_employees_department"`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_employees_contractType"`).catch(() => {});
      }

      // === Migration CollectionPoint: routeId → nullable ===
      await sequelize.query(`
        DO $$ BEGIN
          ALTER TABLE collection_points ALTER COLUMN "routeId" DROP NOT NULL;
        EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
        END $$;
      `).catch(() => {});

      // === Migration Route.dayOfWeek: ENUM → VARCHAR ===
      const [dowCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'routes' AND column_name = 'dayOfWeek'
      `).catch(() => [[]]);
      if (dowCol && dowCol.length > 0 && dowCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration Route.dayOfWeek: ENUM → VARCHAR...');
        await sequelize.query(`ALTER TABLE routes ALTER COLUMN "dayOfWeek" TYPE VARCHAR(50) USING "dayOfWeek"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_routes_dayOfWeek"`).catch(() => {});
      }

      // === Migration Collection: ENUM → VARCHAR + nullable ===
      const [csCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'collections' AND column_name = 'status'
      `).catch(() => [[]]);
      if (csCol && csCol.length > 0 && csCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration Collection.status: ENUM → VARCHAR...');
        await sequelize.query(`ALTER TABLE collections ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_collections_status"`).catch(() => {});
      }
      await sequelize.query(`
        DO $$ BEGIN
          ALTER TABLE collections ALTER COLUMN "routeId" DROP NOT NULL;
        EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
        END $$;
      `).catch(() => {});
      await sequelize.query(`
        DO $$ BEGIN
          ALTER TABLE collections ALTER COLUMN "employeeId" DROP NOT NULL;
        EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
        END $$;
      `).catch(() => {});

      // === Migration Vehicle enums: ENUM → VARCHAR ===
      const [vtCol] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'type'
      `).catch(() => [[]]);
      if (vtCol && vtCol.length > 0 && vtCol[0].data_type === 'USER-DEFINED') {
        console.log('Migration Vehicle enums → VARCHAR...');
        await sequelize.query(`ALTER TABLE vehicles ALTER COLUMN "type" TYPE VARCHAR(50) USING "type"::text`).catch(() => {});
        await sequelize.query(`ALTER TABLE vehicles ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_vehicles_type"`).catch(() => {});
        await sequelize.query(`DROP TYPE IF EXISTS "enum_vehicles_status"`).catch(() => {});
      }

      console.log('Migration des enums terminée');
    } catch (err) {
      console.log('Migration enums (ignoré):', err.message);
    }

    // Synchroniser les modèles
    // D'abord créer les tables manquantes (safe)
    await sequelize.sync();
    console.log('Tables créées/vérifiées');

    // Puis tenter alter sur chaque modèle individuellement
    const models = sequelize.models;
    for (const modelName of Object.keys(models)) {
      try {
        await models[modelName].sync({ alter: true });
      } catch (syncErr) {
        console.warn(`sync alter ${modelName} ignoré:`, syncErr.message);
      }
    }
    console.log('Modèles synchronisés');

    // Créer le compte admin par défaut s'il n'existe pas
    const { User } = require('./models');
    const adminExists = await User.findOne({ where: { email: 'admin@solidarite-textiles.fr' } });
    if (!adminExists) {
      await User.create({
        email: 'admin@solidarite-textiles.fr',
        password: 'SolTex2026!',
        firstName: 'Admin',
        lastName: 'SolTex',
        role: 'admin',
        team: 'administration',
        mustChangePassword: false
      });
      console.log('Compte admin créé: admin@solidarite-textiles.fr / SolTex2026!');
    }

    // Initialiser les paramètres par défaut
    const { AppSettings } = require('./models');
    const settingsCount = await AppSettings.count();
    if (settingsCount === 0) {
      const defaults = [
        { key: 'app.name', value: 'Solidata', type: 'string', category: 'general', label: 'Nom de l\'application' },
        { key: 'app.company', value: 'Solidarité Textiles', type: 'string', category: 'general', label: 'Nom de la structure' },
        { key: 'teams.labels', value: JSON.stringify({"tri":"Tri","collecte":"Collecte","magasin_lhopital":"Magasin L'Hôpital","magasin_st_sever":"Magasin St Sever","magasin_vernon":"Magasin Vernon","administration":"Administration"}), type: 'json', category: 'equipes', label: 'Libellés des équipes' },
      ];
      await AppSettings.bulkCreate(defaults);
      console.log('Paramètres par défaut initialisés');
    }

    // Démarrer l'aspiration email
    scheduleEmailIngestion();

    // === Auto-import CAV depuis le fichier KML si la table est vide ===
    try {
      const { CollectionPoint } = require('./models');
      const cavCount = await CollectionPoint.count();
      if (cavCount === 0) {
        const fs = require('fs');
        const dataDir = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, '../..', 'data');
        const kmlPath = path.join(dataDir, 'Carte des PAV au 28-02-2026.kml');
        if (fs.existsSync(kmlPath)) {
          console.log('Import automatique des CAV depuis le fichier KML...');
          const content = fs.readFileSync(kmlPath, 'latin1');
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

            // Capitaliser la ville proprement
            city = city.split(/[\s-]+/).map(w => {
              if (['DE', 'DU', 'LE', 'LA', 'LES', 'EN', 'SUR', 'SOUS', 'ET', 'AU', 'AUX'].includes(w.toUpperCase()) && w.length <= 3) {
                return w.toLowerCase();
              }
              return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }).join(city.includes('-') ? '-' : ' ')
              .replace(/^(.)/, c => c.toUpperCase()); // Première lettre majuscule

            const cavMatch = desc.match(/(\d+)\s*CAV/);
            const nbCav = cavMatch ? parseInt(cavMatch[1]) : 1;
            const tourMatch = desc.match(/(\d+)\s*tourn/);
            const freq = tourMatch ? parseInt(tourMatch[1]) : 1;
            const fillMatch = desc.match(/remplissage\s*(?:moyen\s*)?(\d+)%/);
            const fillRate = fillMatch ? parseInt(fillMatch[1]) : null;
            const collMatch = desc.match(/Collect[ée]\s*(\d+)\s*fois/i);
            const collCount = collMatch ? parseInt(collMatch[1]) : 0;

            const qrCode = `ST-${require('uuid').v4().slice(0, 8).toUpperCase()}`;

            await CollectionPoint.findOrCreate({
              where: { name: fullName },
              defaults: {
                type: 'cav', address, addressComplement: complement, city,
                latitude: lat, longitude: lng, nbCav, frequence: freq,
                avgFillRate: fillRate, totalCollections2025: collCount,
                qrCode, active: true
              }
            });
            kmlImported++;
          }
          console.log(`${kmlImported} points de collecte importés depuis le KML`);
        }
      } else {
        console.log(`${cavCount} points de collecte déjà en base`);
      }
    } catch (seedErr) {
      console.warn('Auto-import CAV ignoré:', seedErr.message);
    }

    // === Auto-import historique tonnages depuis tonnages.xlsx ===
    try {
      const { WeightRecord } = require('./models');
      const wrCount = await WeightRecord.count();
      if (wrCount === 0) {
        const fs = require('fs');
        const XLSX = require('xlsx');
        const dataDir = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, '../..', 'data');
        let tonnagesPath = path.join(dataDir, 'tonnages.xlsx');
        if (!fs.existsSync(tonnagesPath)) tonnagesPath = path.join(__dirname, '../..', 'tonnages.xlsx');
        if (fs.existsSync(tonnagesPath)) {
          console.log('Import automatique des tonnages depuis le fichier Excel...');
          const wb = XLSX.readFile(tonnagesPath);
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const records = [];
          for (let i = 9; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[1]) continue;
            const externalId = String(row[1]);
            const origine = row[2] || null;
            const categorie = row[3] || null;
            const poidsNet = row[4] ? parseInt(row[4]) : null;
            const tare = row[6] ? parseInt(row[6]) : null;
            const poidsBrut = row[7] ? parseInt(row[7]) : null;
            // Date Excel → JS date
            let weighedAt = null;
            if (row[8] && typeof row[8] === 'number') {
              weighedAt = new Date((row[8] - 25569) * 86400 * 1000);
            }
            const mois = row[10] ? parseInt(row[10]) : null;
            const trimestre = row[11] || null;
            const annee = row[12] ? parseInt(row[12]) : null;

            records.push({
              externalId, origine, categorie, poidsNet, tare, poidsBrut,
              weighedAt, mois, trimestre, annee
            });
          }

          // Bulk insert par lots de 500
          for (let j = 0; j < records.length; j += 500) {
            await WeightRecord.bulkCreate(records.slice(j, j + 500));
          }
          console.log(`${records.length} enregistrements de tonnage importés depuis Excel`);
        }
      }
    } catch (tonErr) {
      console.warn('Auto-import tonnages ignoré:', tonErr.message);
    }

    // === Auto-import des tournées standard depuis tournee.xlsx ===
    try {
      const { Route: RouteModel, RouteTemplatePoint, CollectionPoint: CP } = require('./models');
      const routeCount = await RouteModel.count();
      if (routeCount === 0) {
        const fs = require('fs');
        const XLSX = require('xlsx');
        const dataDir = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, '../..', 'data');
        // Chercher tournee.xlsx dans data/ ou racine
        let xlsPath = path.join(dataDir, 'tournee.xlsx');
        if (!fs.existsSync(xlsPath)) xlsPath = path.join(__dirname, '../..', 'tournee.xlsx');
        if (fs.existsSync(xlsPath)) {
          console.log('Import automatique des tournées standard depuis le fichier Excel...');
          const wb = XLSX.readFile(xlsPath);
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // Row 2: route names in cols 22-40
          const routeNames = data[2] || [];
          // Row 4: default day of week per route
          const routeDayRow = data[4] || [];
          // Map short day names to full
          const dayMap = { 'Lun': 'lundi', 'Mar': 'mardi', 'Mer': 'mercredi', 'Jeu': 'jeudi', 'Ven': 'vendredi', 'Sam': 'samedi' };

          // Build route definitions
          const routeDefs = [];
          for (let col = 22; col <= 50; col++) {
            const name = routeNames[col];
            if (!name || !name.trim() || name.trim() === ' ') continue;
            const dayShort = routeDayRow[col];
            routeDefs.push({ col, name: name.trim(), dayOfWeek: dayMap[dayShort] || null });
          }

          // Get all collection points for matching by name
          const allCPs = await CP.findAll({ attributes: ['id', 'name'] });
          const cpByName = {};
          allCPs.forEach(cp => { cpByName[cp.name.toUpperCase().trim()] = cp.id; });

          let importedRoutes = 0;
          for (const rd of routeDefs) {
            // Find member CAVs: rows 5+ where column has a value
            const members = [];
            for (let row = 5; row < data.length; row++) {
              const val = data[row]?.[rd.col];
              if (val && val !== '' && val !== ' ') {
                const cavName = data[row]?.[1];
                if (cavName) {
                  // Match CAV name to collection point
                  const cpId = cpByName[cavName.toUpperCase().trim()];
                  if (cpId) members.push(cpId);
                }
              }
            }

            // Create the route template (no dayOfWeek assignment per user request)
            const route = await RouteModel.create({
              name: rd.name,
              sector: rd.name,
              dayOfWeek: null, // Not tied to a specific day
              vehicleType: 'camion_20m3',
              active: true,
              notes: `Importé depuis Excel - ${members.length} CAV`
            });

            // Create template points
            if (members.length > 0) {
              await RouteTemplatePoint.bulkCreate(
                members.map((cpId, idx) => ({
                  routeId: route.id,
                  collectionPointId: cpId,
                  sortOrder: idx
                }))
              );
            }
            importedRoutes++;
          }
          console.log(`${importedRoutes} tournées standard importées depuis Excel`);
        }
      }
    } catch (routeErr) {
      console.warn('Auto-import tournées ignoré:', routeErr.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Solidata API démarrée sur le port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log('Modules actifs: recrutement, équipe, collecte, reporting');
    });
  } catch (err) {
    console.error('Erreur de démarrage:', err);
    process.exit(1);
  }
}

start();
