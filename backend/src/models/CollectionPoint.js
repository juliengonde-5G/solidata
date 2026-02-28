const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollectionPoint = sequelize.define('CollectionPoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom du point (mairie, déchetterie, CAV...)'
  },
  type: {
    type: DataTypes.ENUM('cav', 'decheterie', 'partenaire', 'evenement', 'boite_a_dons'),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  postalCode: {
    type: DataTypes.STRING(5)
  },
  latitude: {
    type: DataTypes.FLOAT
  },
  longitude: {
    type: DataTypes.FLOAT
  },
  qrCode: {
    type: DataTypes.STRING,
    unique: true,
    comment: 'Identifiant QR code unique pour scan'
  },
  contactName: {
    type: DataTypes.STRING
  },
  contactPhone: {
    type: DataTypes.STRING
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Ordre de passage dans la tournée'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'collection_points',
  timestamps: true
});

module.exports = CollectionPoint;
