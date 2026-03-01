const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'collaborateur', 'rh'),
    defaultValue: 'collaborateur'
  },
  team: {
    type: DataTypes.ENUM('tri', 'collecte', 'magasin_lhopital', 'magasin_st_sever', 'magasin_vernon', 'administration'),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING
  },
  avatarColor: {
    type: DataTypes.STRING,
    defaultValue: '#7AB51D'
  },
  lastLoginAt: {
    type: DataTypes.DATE
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['email'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

User.prototype.checkPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
