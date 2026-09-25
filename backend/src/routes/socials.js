const express = require('express');
const { db, getSocials } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, isValidHttpUrl, toInt, toBool } = require('../utils');

const router = express.Router();

function normalize(body) {
  const nama = String(body.nama || '').trim();
  const url = String(body.url || '').trim();
  if (!nama) return { error: 'Nama sosial wajib diisi' };
  if (!isValidHttpUrl(url)) return { error: 'URL harus diawali http:// atau https://' };
  return {
    values: {
      nama,
      url,
      icon: String(body.icon || 'bi-link-45deg').trim() || 'bi-link-45deg',
      warna: String(body.warna || 'slate').trim() || 'slate',
      urutan: toInt(body.urutan, 0),
      aktif: toBool(body.aktif, true) ? 1 : 0,
    },
  };
}

router.get(
  '/socials',
  asyncHandler((req, res) => {
    res.json({ success: true, data: getSocials() });
  })
);

router.get(
  '/admin/socials',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM social_links ORDER BY urutan ASC, id ASC').all();
    res.json({ success: true, data: rows });
  })
);

router.post(
  '/admin/socials',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const info = db
      .prepare('INSERT INTO social_links (nama, url, icon, warna, urutan, aktif) VALUES (@nama, @url, @icon, @warna, @urutan, @aktif)')
      .run(values);
    res.json({ success: true, data: db.prepare('SELECT * FROM social_links WHERE id = ?').get(info.lastInsertRowid) });
  })
);

router.put(
  '/admin/socials/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM social_links WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Sosial tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    db.prepare(
      'UPDATE social_links SET nama=@nama, url=@url, icon=@icon, warna=@warna, urutan=@urutan, aktif=@aktif WHERE id=@id'
    ).run({ ...values, id });
    res.json({ success: true, data: db.prepare('SELECT * FROM social_links WHERE id = ?').get(id) });
  })
);

router.delete(
  '/admin/socials/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM social_links WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Sosial tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
