const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RefashionDeclaration = sequelize.define('RefashionDeclaration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reportId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  semester: {
    type: DataTypes.ENUM('S1', 'S2'),
    allowNull: false
  },
  totalTonnage: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  reuseTonnage: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  recycleTonnage: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  energyRecoveryTonnage: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  wasteTonnage: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  numberOfCollectionPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  numberOfEmployees: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  numberOfInsertionHours: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Heures insertion CDDI'
  },
  status: {
    type: DataTypes.ENUM('brouillon', 'valide', 'transmis'),
    defaultValue: 'brouillon'
  },
  exportedAt: {
    type: DataTypes.DATE
  },
  exportFormat: {
    type: DataTypes.STRING,
    comment: 'csv ou xlsx'
  }
}, {
  tableName: 'refashion_declarations',
  timestamps: true
});

module.exports = RefashionDeclaration;
