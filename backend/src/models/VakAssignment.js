const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VakAssignment = sequelize.define('VakAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vakEventId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  vakWorkStationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'vak_assignments',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['vakEventId', 'date', 'vakWorkStationId'] }
  ]
});

module.exports = VakAssignment;
