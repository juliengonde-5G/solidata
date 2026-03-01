const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RouteTemplatePoint = sequelize.define('RouteTemplatePoint', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  collectionPointId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'route_template_points',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['routeId', 'collectionPointId'] }
  ]
});

module.exports = RouteTemplatePoint;
