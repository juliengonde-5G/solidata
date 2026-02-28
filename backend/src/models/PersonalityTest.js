const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PersonalityTest = sequelize.define('PersonalityTest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
    defaultValue: 'not_started'
  },
  responses: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Réponses au questionnaire [{questionId, answer, score}]'
  },
  // Résultats PCM - les 6 types de personnalité selon Kahler
  baseType: {
    type: DataTypes.ENUM('empathique', 'travaillomane', 'perseverant', 'reveur', 'promoteur', 'rebelle'),
    allowNull: true
  },
  phaseType: {
    type: DataTypes.ENUM('empathique', 'travaillomane', 'perseverant', 'reveur', 'promoteur', 'rebelle'),
    allowNull: true
  },
  // Scores pour chaque type (0-100)
  scores: {
    type: DataTypes.JSONB,
    defaultValue: {
      empathique: 0,
      travaillomane: 0,
      perseverant: 0,
      reveur: 0,
      promoteur: 0,
      rebelle: 0
    },
    comment: 'Scores détaillés par type de personnalité'
  },
  // Analyse des comportements
  stressBehaviors: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Comportements sous stress identifiés'
  },
  riskFactors: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Facteurs exposition RPS'
  },
  incompatibilities: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Incompatibilités potentielles avec autres profils'
  },
  // Nouvelles analyses enrichies
  collectiveBehavior: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Comportement en milieu collectif'
  },
  strengthsWeaknesses: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Forces et faiblesses détaillées'
  },
  summary: {
    type: DataTypes.TEXT,
    comment: 'Synthèse complète du profil de personnalité'
  },
  completedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'personality_tests',
  timestamps: true
});

module.exports = PersonalityTest;
