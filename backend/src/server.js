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
      // Migrer l'enum role : ajouter les nouvelles valeurs
      await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'collaborateur'`).catch(() => {});
      await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'rh'`).catch(() => {});
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
