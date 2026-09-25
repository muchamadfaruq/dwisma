const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, toInt } = require('../utils');

const router = express.Router();

router.get(
  '/guru',
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM guru ORDER BY urutan ASC, id ASC').all();
    res.json({ success: true, data: rows });
  })
);

router.get(
  '/admin/guru',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM guru ORDER BY urutan ASC, id ASC').all();
    res.json({ success: true, data: rows });
  })
);

function normalize(body) {
  const nama = String(body.nama || '').trim();
  if (!nama) return { error: 'Nama guru wajib diisi' };
  return {
    values: {
      nama,
      mapel: String(body.mapel || '').trim(),
      jabatan: String(body.jabatan || '').trim(),
      urutan: toInt(body.urutan, 0),
    },
  };
}

router.post(
  '/admin/guru',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const info = db
      .prepare('INSERT INTO guru (nama, mapel, jabatan, urutan) VALUES (@nama, @mapel, @jabatan, @urutan)')
      .run(values);
    res.json({ success: true, data: db.prepare('SELECT * FROM guru WHERE id = ?').get(info.lastInsertRowid) });
  })
);

router.put(
  '/admin/guru/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM guru WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Data guru tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    db.prepare('UPDATE guru SET nama=@nama, mapel=@mapel, jabatan=@jabatan, urutan=@urutan WHERE id=@id').run({
      ...values,
      id,
    });
    res.json({ success: true, data: db.prepare('SELECT * FROM guru WHERE id = ?').get(id) });
  })
);

router.delete(
  '/admin/guru/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM guru WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Data guru tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
