const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, toInt } = require('../utils');

const router = express.Router();

router.get(
  '/kalender',
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM kalender ORDER BY tanggal ASC, id ASC').all();
    res.json({ success: true, data: rows });
  })
);

router.get(
  '/admin/kalender',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM kalender ORDER BY tanggal ASC, id ASC').all();
    res.json({ success: true, data: rows });
  })
);

function normalize(body) {
  const tanggal = String(body.tanggal || '').trim();
  const kegiatan = String(body.kegiatan || '').trim();
  let tanggalSelesai = String(body.tanggal_selesai || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal tidak valid (format YYYY-MM-DD)' };
  if (tanggalSelesai && !/^\d{4}-\d{2}-\d{2}$/.test(tanggalSelesai)) {
    return { error: 'Tanggal selesai tidak valid (format YYYY-MM-DD)' };
  }
  if (tanggalSelesai && tanggalSelesai < tanggal) {
    return { error: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai' };
  }
  if (tanggalSelesai === tanggal) tanggalSelesai = '';
  if (!kegiatan) return { error: 'Nama kegiatan wajib diisi' };
  return {
    values: {
      tanggal,
      tanggal_selesai: tanggalSelesai,
      kegiatan,
      keterangan: String(body.keterangan || '').trim(),
      urutan: toInt(body.urutan, 0),
    },
  };
}

router.post(
  '/admin/kalender',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const info = db
      .prepare('INSERT INTO kalender (tanggal, tanggal_selesai, kegiatan, keterangan, urutan) VALUES (@tanggal, @tanggal_selesai, @kegiatan, @keterangan, @urutan)')
      .run(values);
    res.json({ success: true, data: db.prepare('SELECT * FROM kalender WHERE id = ?').get(info.lastInsertRowid) });
  })
);

router.put(
  '/admin/kalender/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM kalender WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Agenda tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    db.prepare(
      "UPDATE kalender SET tanggal=@tanggal, tanggal_selesai=@tanggal_selesai, kegiatan=@kegiatan, keterangan=@keterangan, urutan=@urutan WHERE id=@id"
    ).run({ ...values, id });
    res.json({ success: true, data: db.prepare('SELECT * FROM kalender WHERE id = ?').get(id) });
  })
);

router.delete(
  '/admin/kalender/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM kalender WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Agenda tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
