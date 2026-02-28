const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollectionReport = sequelize.define('CollectionReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  period: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Période au format YYYY-MM ou YYYY-T1, YYYY-S1'
  },
  periodType: {
    type: DataTypes.ENUM('mensuel', 'trimestriel', 'semestriel', 'annuel'),
    allowNull: false
  },
  totalWeightKg: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  totalCollections: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre de points de collecte visités'
  },
  weightByType: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{"cav": 1200, "decheterie": 800, ...}'
  },
  weightByCategory: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: '{"textile": 1500, "chaussures": 300, "maroquinerie": 200}'
  },
  reusablePercent: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Taux de réemploi en %'
  },
  recyclablePercent: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Taux de recyclage en %'
  },
  wastePercent: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Taux de déchets en %'
  },
  status: {
    type: DataTypes.ENUM('brouillon', 'valide', 'exporte'),
    defaultValue: 'brouillon'
  },
  generatedBy: {
    type: DataTypes.UUID
  },
  validatedBy: {
    type: DataTypes.UUID
  },
  validatedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'collection_reports',
  timestamps: true
});

module.exports = CollectionReport;
