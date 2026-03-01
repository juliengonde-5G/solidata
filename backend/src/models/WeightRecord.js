const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WeightRecord = sequelize.define('WeightRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  externalId: {
    type: DataTypes.STRING,
    comment: 'ID externe (du fichier Excel: 10000, 10001, etc.)'
  },
  origine: {
    type: DataTypes.STRING,
    comment: 'Collecte de CAV, Apport Volontaire, Tournée, Recyclage, etc.'
  },
  categorie: {
    type: DataTypes.STRING,
    comment: 'Nom tournée ou type (Lions Club 3, Rive Droite 1, etc.)'
  },
  dailyRouteId: {
    type: DataTypes.UUID,
    comment: 'Lien vers la tournée journalière (si applicable)'
  },
  poidsNet: {
    type: DataTypes.INTEGER,
    comment: 'Poids net en kg'
  },
  tare: {
    type: DataTypes.INTEGER,
    comment: 'Tare du véhicule en kg'
  },
  poidsBrut: {
    type: DataTypes.INTEGER,
    comment: 'Poids brut en kg'
  },
  weighedAt: {
    type: DataTypes.DATE,
    comment: 'Date et heure de pesée'
  },
  mois: {
    type: DataTypes.INTEGER
  },
  trimestre: {
    type: DataTypes.STRING
  },
  annee: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'weight_records',
  timestamps: true
});

module.exports = WeightRecord;
