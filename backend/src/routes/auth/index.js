const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../../models');
const { generateToken, authenticate } = require('../../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isValid = await user.checkPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(user);
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// PUT /api/auth/password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('Minimum 6 caractères')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const isValid = await req.user.checkPassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    req.user.password = newPassword;
    await req.user.save();
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
