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
    allowNull: false,
    comment: 'Nom de la tournée (ex: Rouen Rive Droite 1)'
  },
  sector: {
    type: DataTypes.STRING,
    comment: 'Secteur géographique'
  },
  dayOfWeek: {
    type: DataTypes.STRING,
    comment: 'Jour standard (lundi, mardi...) ou null si flexible'
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
    type: DataTypes.STRING,
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
