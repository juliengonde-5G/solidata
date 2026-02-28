/**
 * Script de seed pour initialiser les données de référence
 */
const { sequelize, User, JobPosition } = require('../models');

const DEFAULT_POSITIONS = [
  { title: 'Chauffeur collecte', department: 'collecte', requiredSkills: ['Permis B', 'CACES'], description: 'Conduite du camion de collecte des CAV' },
  { title: 'Suiveur collecte', department: 'collecte', requiredSkills: [], description: 'Accompagne le chauffeur, manipule les CAV' },
  { title: 'Agent de tri', department: 'tri', requiredSkills: [], description: 'Tri des textiles collectés au centre de tri' },
  { title: 'Agent logistique', department: 'logistique', requiredSkills: ['CACES'], description: 'Gestion des stocks et des flux de matière' },
  { title: 'Vendeur boutique', department: 'boutique', requiredSkills: [], description: 'Vente en boutique solidaire' },
  { title: 'Agent administratif', department: 'administration', requiredSkills: [], description: 'Support administratif' }
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    console.log('Création des postes standards...');
    const currentMonth = new Date().toISOString().slice(0, 7);

    for (const pos of DEFAULT_POSITIONS) {
      const existing = await JobPosition.findOne({
        where: { title: pos.title, month: currentMonth }
      });
      if (!existing) {
        await JobPosition.create({
          ...pos,
          month: currentMonth,
          openPositions: 2,
          active: true
        });
        console.log(`  Créé: ${pos.title}`);
      }
    }

    console.log('Seed terminé');
    process.exit(0);
  } catch (err) {
    console.error('Erreur seed:', err);
    process.exit(1);
  }
}

seed();
