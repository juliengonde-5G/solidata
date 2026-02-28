const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Collection = sequelize.define('Collection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  collectionPointId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
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
    type: DataTypes.ENUM('planifiee', 'en_cours', 'terminee', 'annulee'),
    defaultValue: 'planifiee'
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
