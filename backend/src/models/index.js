const sequelize = require('../config/database');
const User = require('./User');
const JobPosition = require('./JobPosition');
const Candidate = require('./Candidate');
const CandidateHistory = require('./CandidateHistory');
const PersonalityTest = require('./PersonalityTest');

// Associations
Candidate.belongsTo(JobPosition, { foreignKey: 'jobPositionId', as: 'jobPosition' });
JobPosition.hasMany(Candidate, { foreignKey: 'jobPositionId', as: 'candidates' });

Candidate.hasMany(CandidateHistory, { foreignKey: 'candidateId', as: 'history' });
CandidateHistory.belongsTo(Candidate, { foreignKey: 'candidateId' });

CandidateHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

Candidate.hasOne(PersonalityTest, { foreignKey: 'candidateId', as: 'personalityTest' });
PersonalityTest.belongsTo(Candidate, { foreignKey: 'candidateId' });

module.exports = {
  sequelize,
  User,
  JobPosition,
  Candidate,
  CandidateHistory,
  PersonalityTest
};
