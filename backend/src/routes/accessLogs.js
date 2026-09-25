const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { asyncHandler, toInt } = require('../utils');

const router = express.Router();

router.get(
  '/admin/access-logs',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const limit = Math.min(Math.max(toInt(req.query.limit, 300), 1), 1000);
    const tipe = String(req.query.tipe || '').trim();
    const where = tipe ? 'WHERE a.tipe = ?' : '';
    const params = tipe ? [tipe, limit] : [limit];
    const rows = db
      .prepare(
        `SELECT a.*, u.username, u.nama
         FROM access_logs a LEFT JOIN users u ON u.id = a.user_id
         ${where}
         ORDER BY a.id DESC LIMIT ?`
      )
      .all(...params);
    const total = tipe
      ? db.prepare('SELECT COUNT(*) AS c FROM access_logs WHERE tipe = ?').get(tipe).c
      : db.prepare('SELECT COUNT(*) AS c FROM access_logs').get().c;
    res.json({ success: true, data: rows, total });
  })
);

router.delete(
  '/admin/access-logs',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    db.prepare('DELETE FROM access_logs').run();
    res.json({ success: true });
  })
);

router.delete(
  '/admin/access-logs/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM access_logs WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Log tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
