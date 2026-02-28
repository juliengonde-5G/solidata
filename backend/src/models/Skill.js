const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Skill = sequelize.define('Skill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('conduite', 'tri', 'manutention', 'vente', 'administratif', 'encadrement'),
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('debutant', 'intermediaire', 'confirme', 'expert'),
    defaultValue: 'debutant'
  },
  certifiedAt: {
    type: DataTypes.DATEONLY
  },
  expiresAt: {
    type: DataTypes.DATEONLY
  }
}, {
  tableName: 'skills',
  timestamps: true
});

module.exports = Skill;
