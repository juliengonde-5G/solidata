const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmployeeDayStatus = sequelize.define('EmployeeDayStatus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'travaille',
    validate: {
      isIn: [['travaille', 'formation', 'repos', 'vacances', 'absence', 'conge']]
    }
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'employee_day_statuses',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['employeeId', 'date'] }
  ]
});

module.exports = EmployeeDayStatus;
