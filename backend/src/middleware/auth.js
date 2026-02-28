const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'solidata_jwt_secret_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, team: user.team },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou désactivé' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  };
}

// Vérifie que le manager gère bien cette équipe
function requireTeam(...teams) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (!req.user.team || !teams.includes(req.user.team)) {
      return res.status(403).json({ error: 'Accès non autorisé pour cette équipe' });
    }
    next();
  };
}

module.exports = { generateToken, authenticate, requireRole, requireTeam };
