const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyRoute = sequelize.define('DailyRoute', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  period: {
    type: DataTypes.STRING,
    defaultValue: 'matin',
    comment: 'matin / apres_midi'
  },
  templateRouteId: {
    type: DataTypes.UUID,
    comment: 'Référence tournée standard (null si mode manuel/intelligent)'
  },
  vehicleId: {
    type: DataTypes.UUID,
    comment: 'Véhicule affecté'
  },
  driverId: {
    type: DataTypes.UUID,
    comment: 'Chauffeur (Employee)'
  },
  followerId: {
    type: DataTypes.UUID,
    comment: 'Suiveur (Employee)'
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'standard',
    comment: 'standard / intelligent / manuel'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'planifiee',
    comment: 'planifiee / en_cours / terminee / annulee'
  },
  startedAt: {
    type: DataTypes.DATE
  },
  finishedAt: {
    type: DataTypes.DATE
  },
  estimatedWeight: {
    type: DataTypes.FLOAT,
    comment: 'Poids estimé (mode intelligent) en kg'
  },
  actualWeight: {
    type: DataTypes.FLOAT,
    comment: 'Poids réel pesé au retour en kg'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'daily_routes',
  timestamps: true,
  indexes: [
    { fields: ['date', 'period'] }
  ]
});

module.exports = DailyRoute;
