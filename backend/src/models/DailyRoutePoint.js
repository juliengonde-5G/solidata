const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyRoutePoint = sequelize.define('DailyRoutePoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  dailyRouteId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  collectionPointId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'a_collecter',
    comment: 'a_collecter / collecte / passe / probleme'
  },
  fillLevel: {
    type: DataTypes.STRING,
    comment: 'Vide / Faible / Mi-Hauteur / Presque-Plein / Plein / Deborde'
  },
  scannedAt: {
    type: DataTypes.DATE
  },
  latitude: {
    type: DataTypes.DOUBLE,
    comment: 'GPS au moment du scan'
  },
  longitude: {
    type: DataTypes.DOUBLE
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'daily_route_points',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['dailyRouteId', 'collectionPointId'] }
  ]
});

module.exports = DailyRoutePoint;
