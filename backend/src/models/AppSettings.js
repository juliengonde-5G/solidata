const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppSettings = sequelize.define('AppSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string'
  },
  category: {
    type: DataTypes.ENUM('general', 'equipes', 'collecte', 'reporting', 'email', 'securite'),
    defaultValue: 'general'
  },
  label: {
    type: DataTypes.STRING,
    comment: 'Libellé affiché dans l\'admin'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description du paramètre'
  }
}, {
  tableName: 'app_settings',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['key'] }
  ]
});

// Helpers pour lire/écrire facilement
AppSettings.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ where: { key } });
  if (!setting) return defaultValue;
  switch (setting.type) {
    case 'number': return Number(setting.value);
    case 'boolean': return setting.value === 'true';
    case 'json': try { return JSON.parse(setting.value); } catch { return defaultValue; }
    default: return setting.value;
  }
};

AppSettings.setValue = async function(key, value, meta = {}) {
  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const [setting] = await this.findOrCreate({ where: { key }, defaults: { value: strValue, ...meta } });
  if (setting.value !== strValue) {
    await setting.update({ value: strValue });
  }
  return setting;
};

module.exports = AppSettings;
