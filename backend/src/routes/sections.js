const express = require('express');
const { db, getSectionsWithButtons } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, toInt, toBool } = require('../utils');

const router = express.Router();

const GAYA = new Set(['grid', 'list', 'pill', 'pillSmall']);

function normalize(body) {
  const slug = String(body.slug || '').trim().toLowerCase();
  const judul = String(body.judul || '').trim();
  const gaya = String(body.gaya || 'grid').trim();
  if (!slug) return { error: 'Slug section wajib diisi' };
  if (!/^[a-z0-9_-]+$/.test(slug)) return { error: 'Slug hanya boleh huruf kecil, angka, - dan _' };
  if (!judul) return { error: 'Judul section wajib diisi' };
  if (!GAYA.has(gaya)) return { error: 'Gaya section tidak valid' };
  return {
    values: {
      slug,
      judul,
      subjudul: String(body.subjudul || '').trim(),
      gaya,
      ikon: String(body.ikon || '').trim(),
      warna: String(body.warna || 'blue').trim() || 'blue',
      urutan: toInt(body.urutan, 0),
      tampil_judul: toBool(body.tampil_judul, true) ? 1 : 0,
      aktif: toBool(body.aktif, true) ? 1 : 0,
    },
  };
}

function withButtons(section) {
  const buttons = db
    .prepare('SELECT * FROM buttons WHERE section_id = ? ORDER BY urutan ASC, id ASC')
    .all(section.id);
  return { ...section, buttons };
}

router.get(
  '/sections',
  asyncHandler((req, res) => {
    res.json({ success: true, data: getSectionsWithButtons() });
  })
);

router.get(
  '/admin/sections',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM sections ORDER BY urutan ASC, id ASC').all();
    res.json({ success: true, data: rows.map(withButtons) });
  })
);

router.post(
  '/admin/sections',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    if (db.prepare('SELECT id FROM sections WHERE slug = ?').get(values.slug)) {
      return res.status(409).json({ success: false, message: 'Slug section sudah dipakai' });
    }
    const info = db
      .prepare(
        `INSERT INTO sections (slug, judul, subjudul, gaya, ikon, warna, urutan, tampil_judul, aktif)
         VALUES (@slug, @judul, @subjudul, @gaya, @ikon, @warna, @urutan, @tampil_judul, @aktif)`
      )
      .run(values);
    res.json({ success: true, data: withButtons(db.prepare('SELECT * FROM sections WHERE id = ?').get(info.lastInsertRowid)) });
  })
);

router.put(
  '/admin/sections/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Section tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    if (db.prepare('SELECT id FROM sections WHERE slug = ? AND id != ?').get(values.slug, id)) {
      return res.status(409).json({ success: false, message: 'Slug section sudah dipakai' });
    }
    db.prepare(
      `UPDATE sections SET slug=@slug, judul=@judul, subjudul=@subjudul, gaya=@gaya, ikon=@ikon,
       warna=@warna, urutan=@urutan, tampil_judul=@tampil_judul, aktif=@aktif,
       updated_at=datetime('now') WHERE id=@id`
    ).run({ ...values, id });
    res.json({ success: true, data: withButtons(db.prepare('SELECT * FROM sections WHERE id = ?').get(id)) });
  })
);

router.delete(
  '/admin/sections/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM sections WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Section tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
