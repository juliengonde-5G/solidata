const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyAssignment = sequelize.define('DailyAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  workStationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'previsionnel',
    validate: {
      isIn: [['previsionnel', 'confirme']]
    }
  },
  confirmedBy: {
    type: DataTypes.UUID
  },
  confirmedAt: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'daily_assignments',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['date', 'workStationId'] }
  ]
});

module.exports = DailyAssignment;
