const express = require('express');
const { db } = require('../db');
const { verifyPassword } = require('../auth');
const { asyncHandler } = require('../utils');
const { logAccess } = require('../services/accessLog');

const router = express.Router();

router.post(
  '/auth/login',
  asyncHandler((req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }
    const user = db
      .prepare('SELECT * FROM users WHERE username = ? AND aktif = 1')
      .get(String(username).trim());
    if (!user || !verifyPassword(String(password), user.password_hash)) {
      logAccess(req, 'login_fail');
      return res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
    };
    logAccess(req, 'login_ok');
    return res.json({ success: true, user: req.session.user });
  })
);

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('dwisma.sid');
    res.json({ success: true });
  });
});

router.get('/auth/me', (req, res) => {
  if (req.session && req.session.user) return res.json({ success: true, user: req.session.user });
  return res.json({ success: true, user: null });
});

module.exports = router;
