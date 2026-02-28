const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('camion_20m3', 'camion_12m3', 'utilitaire', 'voiture'),
    allowNull: false
  },
  capacity: {
    type: DataTypes.FLOAT,
    comment: 'Capacité en m3'
  },
  status: {
    type: DataTypes.ENUM('disponible', 'en_tournee', 'maintenance', 'hors_service'),
    defaultValue: 'disponible'
  },
  lastMaintenanceDate: {
    type: DataTypes.DATEONLY
  },
  nextMaintenanceDate: {
    type: DataTypes.DATEONLY
  },
  mileage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'vehicles',
  timestamps: true
});

module.exports = Vehicle;
