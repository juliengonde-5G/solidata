const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Candidate = sequelize.define('Candidate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Extrait automatiquement du CV puis corrigeable'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Extrait automatiquement du CV puis corrigeable'
  },
  gender: {
    type: DataTypes.ENUM('M', 'F', 'autre', 'non_renseigne'),
    defaultValue: 'non_renseigne'
  },
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING
  },
  applicationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Status Kanban - géré comme STRING pour faciliter les migrations
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'candidature_recue',
    validate: {
      isIn: [['candidature_recue', 'a_qualifier', 'non_retenu', 'convoque', 'recrute']]
    }
  },
  // Informations candidature
  permisB: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Permis de conduire catégorie B'
  },
  caces: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Titulaire d\'un CACES (oui/non)'
  },
  jobPositionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Poste visé'
  },
  cvFilePath: {
    type: DataTypes.STRING,
    comment: 'Chemin vers le fichier CV stocké'
  },
  cvOriginalName: {
    type: DataTypes.STRING
  },
  cvText: {
    type: DataTypes.TEXT,
    comment: 'Texte extrait du CV'
  },
  comments: {
    type: DataTypes.TEXT
  },
  // === Mise en situation professionnelle (activé à partir de convoque) ===
  assessmentDone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Test de mise en situation réalisé'
  },
  assessmentResult: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Avis: conforme, faible, recalé'
  },
  assessmentComment: {
    type: DataTypes.TEXT,
    comment: 'Commentaire mise en situation'
  },
  // === Suivi d'entretien (activé à partir de convoque) ===
  interviewerId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID utilisateur ayant conduit l\'entretien'
  },
  interviewDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  interviewComment: {
    type: DataTypes.TEXT,
    comment: 'Commentaire libre sur l\'entretien'
  },
  // Champs legacy
  interviewReport: {
    type: DataTypes.TEXT
  },
  testReport: {
    type: DataTypes.TEXT
  },
  // === Test de personnalité ===
  personalityTestId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Référence vers le test PCM'
  },
  // === Recrutement (activé quand recrute) ===
  assignedTeam: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Équipe affectée lors du recrutement'
  },
  // Source email
  sourceEmailId: {
    type: DataTypes.STRING,
    comment: 'ID du mail source'
  },
  sourceEmailDate: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'candidates',
  timestamps: true
});

module.exports = Candidate;
