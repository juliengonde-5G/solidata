const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CandidateHistory = sequelize.define('CandidateHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  fromStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  toStatus: {
    type: DataTypes.STRING,
    allowNull: false
  },
  changedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID qui a fait le changement'
  },
  comment: {
    type: DataTypes.TEXT
  },
  changedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'candidate_history',
  timestamps: false
});

module.exports = CandidateHistory;
