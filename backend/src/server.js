const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { scheduleEmailIngestion } = require('./services/emailIngestion');

// Routes Recrutement
const authRoutes = require('./routes/auth');
const positionsRoutes = require('./routes/recruitment/positions');
const candidatesRoutes = require('./routes/recruitment/candidates');
const personalityRoutes = require('./routes/recruitment/personality');

// Routes Équipe
const employeesRoutes = require('./routes/team/employees');
const vehiclesRoutes = require('./routes/team/vehicles');
const planningRoutes = require('./routes/team/planning');

// Routes Collecte
const collectionRoutesRoutes = require('./routes/collection/routes');
const collectionPointsRoutes = require('./routes/collection/points');
const collectionsRoutes = require('./routes/collection/collections');

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

// Routes API - Collecte
app.use('/api/collection/routes', collectionRoutesRoutes);
app.use('/api/collection/points', collectionPointsRoutes);
app.use('/api/collection/collections', collectionsRoutes);

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

      console.log('Migration des enums terminée');
    } catch (err) {
      console.log('Migration enums (ignoré):', err.message);
    }

    // Synchroniser les modèles
    await sequelize.sync({ alter: true });
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
