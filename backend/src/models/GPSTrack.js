const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GPSTrack = sequelize.define('GPSTrack', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  dailyRouteId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  employeeId: {
    type: DataTypes.UUID
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  accuracy: {
    type: DataTypes.FLOAT,
    comment: 'Précision GPS en mètres'
  },
  speed: {
    type: DataTypes.FLOAT,
    comment: 'Vitesse en km/h'
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'gps_tracks',
  timestamps: false,
  indexes: [
    { fields: ['dailyRouteId', 'recordedAt'] }
  ]
});

module.exports = GPSTrack;
