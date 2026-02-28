const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobPosition = sequelize.define('JobPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.ENUM('collecte', 'tri', 'logistique', 'boutique', 'administration'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  requiredSkills: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  openPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  filledPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  month: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'Format YYYY-MM'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'job_positions',
  timestamps: true
});

module.exports = JobPosition;
