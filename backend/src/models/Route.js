const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sector: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Secteur géographique (ex: Bordeaux Nord, CUB Sud...)'
  },
  dayOfWeek: {
    type: DataTypes.ENUM('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'),
    allowNull: false
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    comment: 'Durée estimée en minutes'
  },
  estimatedDistance: {
    type: DataTypes.FLOAT,
    comment: 'Distance estimée en km'
  },
  vehicleType: {
    type: DataTypes.ENUM('camion_20m3', 'camion_12m3', 'utilitaire', 'voiture'),
    defaultValue: 'camion_20m3'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'routes',
  timestamps: true
});

module.exports = Route;
