const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { scheduleEmailIngestion } = require('./services/emailIngestion');

const authRoutes = require('./routes/auth');
const positionsRoutes = require('./routes/recruitment/positions');
const candidatesRoutes = require('./routes/recruitment/candidates');
const personalityRoutes = require('./routes/recruitment/personality');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors({
  origin: ['http://82.65.155.79:8082', 'http://localhost:8082', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques (uploads CV)
app.use('/uploads', express.static('/app/uploads'));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/recruitment/positions', positionsRoutes);
app.use('/api/recruitment/candidates', candidatesRoutes);
app.use('/api/recruitment/personality', personalityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Solidata ERP',
    version: '1.0.0',
    modules: ['recruitment']
  });
});

// Démarrage
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie');

    // Synchroniser les modèles (en dev: alter, en prod: rien ou migrations)
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
        role: 'admin'
      });
      console.log('Compte admin créé: admin@solidarite-textiles.fr / SolTex2026!');
    }

    // Démarrer l'aspiration email
    scheduleEmailIngestion();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Solidata API démarrée sur le port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Erreur de démarrage:', err);
    process.exit(1);
  }
}

start();
