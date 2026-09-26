const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, isValidHttpUrl, toInt, toBool } = require('../utils');

const router = express.Router();

function normalize(body) {
  const section_id = toInt(body.section_id, 0);
  const nama = String(body.nama || '').trim();
  const url = String(body.url || '').trim();
  if (!db.prepare('SELECT id FROM sections WHERE id = ?').get(section_id)) {
    return { error: 'Section tidak valid' };
  }
  if (!nama) return { error: 'Nama tombol wajib diisi' };
  if (!isValidHttpUrl(url)) return { error: 'URL harus diawali http:// atau https://' };
  const uptimeUrl = String(body.uptime_url || '').trim();
  if (uptimeUrl && !isValidHttpUrl(uptimeUrl)) {
    return { error: 'URL monitor Uptime Kuma harus diawali http:// atau https://' };
  }
  return {
    values: {
      section_id,
      nama,
      deskripsi: String(body.deskripsi || '').trim(),
      url,
      uptime_url: uptimeUrl,
      icon: String(body.icon || 'bi-link-45deg').trim() || 'bi-link-45deg',
      image: String(body.image || '').trim(),
      warna: String(body.warna || 'blue').trim() || 'blue',
      urutan: toInt(body.urutan, 0),
      aktif: toBool(body.aktif, true) ? 1 : 0,
    },
  };
}

router.post(
  '/admin/buttons',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const info = db
      .prepare(
        `INSERT INTO buttons (section_id, nama, deskripsi, url, uptime_url, icon, image, warna, urutan, aktif)
         VALUES (@section_id, @nama, @deskripsi, @url, @uptime_url, @icon, @image, @warna, @urutan, @aktif)`
      )
      .run(values);
    res.json({ success: true, data: db.prepare('SELECT * FROM buttons WHERE id = ?').get(info.lastInsertRowid) });
  })
);

router.put(
  '/admin/buttons/reorder',
  requireAuth,
  asyncHandler((req, res) => {
    const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ success: false, message: 'Daftar urutan wajib diisi' });
    const getButton = db.prepare('SELECT id FROM buttons WHERE id = ?');
    const getSection = db.prepare('SELECT id FROM sections WHERE id = ?');
    const update = db.prepare("UPDATE buttons SET section_id = ?, urutan = ?, updated_at = datetime('now') WHERE id = ?");
    const counters = {};
    db.transaction(() => {
      for (const item of items) {
        const id = toInt(item && item.id, 0);
        const sectionId = toInt(item && item.section_id, 0);
        if (!id || !sectionId) continue;
        if (!getButton.get(id) || !getSection.get(sectionId)) continue;
        counters[sectionId] = (counters[sectionId] || 0) + 1;
        update.run(sectionId, counters[sectionId], id);
      }
    })();
    res.json({ success: true });
  })
);

router.put(
  '/admin/buttons/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM buttons WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Tombol tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    db.prepare(
      `UPDATE buttons SET section_id=@section_id, nama=@nama, deskripsi=@deskripsi, url=@url,
       uptime_url=@uptime_url, icon=@icon, image=@image, warna=@warna, urutan=@urutan, aktif=@aktif,
       updated_at=datetime('now') WHERE id=@id`
    ).run({ ...values, id });
    res.json({ success: true, data: db.prepare('SELECT * FROM buttons WHERE id = ?').get(id) });
  })
);

router.delete(
  '/admin/buttons/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM buttons WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Tombol tidak ditemukan' });
    res.json({ success: true });
  })
);

module.exports = router;
