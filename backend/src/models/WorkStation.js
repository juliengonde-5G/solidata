const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkStation = sequelize.define('WorkStation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  group: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Tri'
  },
  mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reqCaces: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reqPermis: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'work_stations',
  timestamps: true
});

module.exports = WorkStation;
