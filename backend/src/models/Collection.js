const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Collection = sequelize.define('Collection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID
  },
  collectionPointId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  dailyRouteId: {
    type: DataTypes.UUID,
    comment: 'Lien vers la tournée journalière'
  },
  employeeId: {
    type: DataTypes.UUID
  },
  vehicleId: {
    type: DataTypes.UUID
  },
  collectionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  weightKg: {
    type: DataTypes.FLOAT,
    comment: 'Poids collecté en kg'
  },
  bagsCount: {
    type: DataTypes.INTEGER,
    comment: 'Nombre de sacs/bacs collectés'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'terminee'
  },
  scannedAt: {
    type: DataTypes.DATE,
    comment: 'Heure du scan QR code'
  },
  latitude: {
    type: DataTypes.FLOAT,
    comment: 'Position GPS au moment du scan'
  },
  longitude: {
    type: DataTypes.FLOAT
  },
  photoUrl: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'collections',
  timestamps: true
});

module.exports = Collection;
