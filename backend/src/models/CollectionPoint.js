const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollectionPoint = sequelize.define('CollectionPoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Dénomination interne (ex: ROUEN - 27 rue Saint-Sever)'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'cav'
  },
  address: {
    type: DataTypes.STRING
  },
  addressComplement: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  postalCode: {
    type: DataTypes.STRING(5)
  },
  latitude: {
    type: DataTypes.DOUBLE
  },
  longitude: {
    type: DataTypes.DOUBLE
  },
  nbCav: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Nombre de conteneurs sur le point'
  },
  frequence: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Fréquence de passage hebdomadaire'
  },
  avgFillRate: {
    type: DataTypes.FLOAT,
    comment: 'Taux de remplissage moyen (%)'
  },
  lastCollectionDate: {
    type: DataTypes.DATEONLY,
    comment: 'Dernière date de collecte'
  },
  totalCollections2025: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre total de collectes en 2025'
  },
  qrCode: {
    type: DataTypes.STRING,
    comment: 'Identifiant QR code unique pour scan'
  },
  ecoTlcRef: {
    type: DataTypes.STRING,
    comment: 'Référence Eco TLC'
  },
  owner: {
    type: DataTypes.STRING,
    comment: 'Entité détentrice'
  },
  communaute: {
    type: DataTypes.STRING,
    comment: 'Communauté de communes'
  },
  surface: {
    type: DataTypes.STRING,
    comment: 'Type de surface (Publique, Parking CC, Privé...)'
  },
  suspensionMotif: {
    type: DataTypes.STRING,
    comment: 'Motif de suspension (Travaux, Dégradation...)'
  },
  contactName: {
    type: DataTypes.STRING
  },
  contactPhone: {
    type: DataTypes.STRING
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'collection_points',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['qrCode'], where: { qrCode: { [require('sequelize').Op.ne]: null } } }
  ]
});

module.exports = CollectionPoint;
