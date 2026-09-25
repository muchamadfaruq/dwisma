const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole, hashPassword, verifyPassword } = require('../auth');
const { asyncHandler, toInt, toBool } = require('../utils');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, username: u.username, nama: u.nama, role: u.role, aktif: u.aktif, created_at: u.created_at };
}

router.get(
  '/admin/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all();
    res.json({ success: true, data: rows.map(publicUser) });
  })
);

router.post(
  '/admin/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const { username, password, nama, role } = req.body || {};
    const uname = String(username || '').trim();
    if (!uname) return res.status(400).json({ success: false, message: 'Username wajib diisi' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
    if (exists) return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
    const info = db
      .prepare('INSERT INTO users (username, password_hash, nama, role, aktif) VALUES (?, ?, ?, ?, ?)')
      .run(
        uname,
        hashPassword(String(password)),
        String(nama || '').trim(),
        role === 'admin' ? 'admin' : 'editor',
        toBool(req.body.aktif, true) ? 1 : 0
      );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.json({ success: true, data: publicUser(user) });
  })
);

router.put(
  '/admin/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    const role = req.body.role === 'admin' ? 'admin' : req.body.role === 'editor' ? 'editor' : user.role;
    const aktif = req.body.aktif === undefined ? user.aktif : toBool(req.body.aktif, true) ? 1 : 0;
    if (user.role === 'admin' && role !== 'admin') {
      const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND aktif=1").get().c;
      if (admins <= 1) return res.status(400).json({ success: false, message: 'Harus ada minimal satu admin aktif' });
    }
    db.prepare('UPDATE users SET nama=?, role=?, aktif=?, updated_at=datetime(\'now\') WHERE id=?').run(
      String(req.body.nama ?? user.nama).trim(),
      role,
      aktif,
      id
    );
    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
      }
      db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(
        hashPassword(String(req.body.password)),
        id
      );
    }
    res.json({ success: true, data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  })
);

router.delete(
  '/admin/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    if (req.session.user.id === id) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    if (user.role === 'admin') {
      const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c;
      if (admins <= 1) return res.status(400).json({ success: false, message: 'Harus ada minimal satu admin' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  })
);

router.put(
  '/admin/profile/password',
  requireAuth,
  asyncHandler((req, res) => {
    const { current_password, new_password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user || !verifyPassword(String(current_password || ''), user.password_hash)) {
      return res.status(400).json({ success: false, message: 'Password lama salah' });
    }
    if (!new_password || String(new_password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });
    }
    db.prepare("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?").run(
      hashPassword(String(new_password)),
      user.id
    );
    res.json({ success: true });
  })
);

module.exports = router;
