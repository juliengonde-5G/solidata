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
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'camion_20m3'
  },
  capacity: {
    type: DataTypes.FLOAT,
    comment: 'Capacité en m3'
  },
  chargeUtile: {
    type: DataTypes.INTEGER,
    comment: 'Charge utile en kg'
  },
  tpiWeight: {
    type: DataTypes.INTEGER,
    comment: 'Tare pour pesée en kg'
  },
  status: {
    type: DataTypes.STRING,
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
  timestamps: true,
  indexes: [
    { unique: true, fields: ['licensePlate'] }
  ]
});

module.exports = Vehicle;
