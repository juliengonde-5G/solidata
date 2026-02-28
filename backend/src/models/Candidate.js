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
  status: {
    type: DataTypes.ENUM(
      'candidature_recue',
      'candidature_rejetee',
      'candidature_qualifiee',
      'entretien_confirme',
      'recrutement_valide'
    ),
    defaultValue: 'candidature_recue'
  },
  jobPositionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Activé à partir de entretien_confirme'
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
  interviewReport: {
    type: DataTypes.TEXT,
    comment: 'CR Entretien - activé à partir de entretien_confirme'
  },
  testReport: {
    type: DataTypes.TEXT,
    comment: 'CR Test mise en situation - activé à partir de entretien_confirme'
  },
  personalityTestId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Référence vers le test PCM - activé à partir de entretien_confirme'
  },
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
