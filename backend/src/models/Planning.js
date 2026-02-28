const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Planning = sequelize.define('Planning', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  shift: {
    type: DataTypes.ENUM('matin', 'apres_midi', 'journee'),
    defaultValue: 'journee'
  },
  assignment: {
    type: DataTypes.ENUM('collecte', 'tri', 'boutique', 'logistique', 'formation', 'repos', 'absence', 'conge'),
    allowNull: false
  },
  vehicleId: {
    type: DataTypes.UUID
  },
  routeId: {
    type: DataTypes.UUID
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'plannings',
  timestamps: true,
  indexes: [
    { fields: ['employeeId', 'date'], unique: true }
  ]
});

module.exports = Planning;
