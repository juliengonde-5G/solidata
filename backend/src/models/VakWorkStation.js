const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VakWorkStation = sequelize.define('VakWorkStation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'vak_work_stations',
  timestamps: true
});

module.exports = VakWorkStation;
