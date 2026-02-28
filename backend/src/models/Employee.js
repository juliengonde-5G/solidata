const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING
  },
  department: {
    type: DataTypes.ENUM('collecte', 'tri', 'logistique', 'boutique', 'administration'),
    allowNull: false
  },
  contractType: {
    type: DataTypes.ENUM('cddi', 'cdd', 'cdi', 'stage', 'service_civique'),
    allowNull: false
  },
  hireDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  contractEndDate: {
    type: DataTypes.DATEONLY
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  drivingLicense: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'employees',
  timestamps: true
});

module.exports = Employee;
