const express = require('express');
const { db, getBlocksWithButtons, BLOCK_TYPES, DEFAULT_BLOCK_CONFIG } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { asyncHandler, toInt, toBool } = require('../utils');

const router = express.Router();

const GAYA = new Set(['grid', 'list', 'pill', 'pillSmall']);

function parseConfig(raw, fallback = {}) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalize(body) {
  const slug = String(body.slug || '').trim().toLowerCase();
  const judul = String(body.judul || '').trim();
  const tipe = String(body.tipe || 'apps').trim();
  let gaya = String(body.gaya || 'grid').trim();
  if (!BLOCK_TYPES[tipe]) return { error: 'Tipe blok tidak valid' };
  if (!slug) return { error: 'Slug blok wajib diisi' };
  if (!/^[a-z0-9_-]+$/.test(slug)) return { error: 'Slug hanya boleh huruf kecil, angka, - dan _' };
  if (!judul) return { error: 'Judul blok wajib diisi' };
  if (!GAYA.has(gaya)) gaya = 'grid';
  const config = parseConfig(body.config, {});
  if (typeof config !== 'object' || Array.isArray(config)) return { error: 'Config blok harus berupa objek' };
  const mergedConfig = { ...(DEFAULT_BLOCK_CONFIG[tipe] || {}), ...config };
  return {
    values: {
      slug,
      judul,
      tipe,
      gaya,
      subjudul: String(body.subjudul || '').trim(),
      ikon: String(body.ikon || '').trim(),
      warna: String(body.warna || 'blue').trim() || 'blue',
      urutan: toInt(body.urutan, 0),
      tampil_judul: toBool(body.tampil_judul, true) ? 1 : 0,
      aktif: toBool(body.aktif, true) ? 1 : 0,
      config: JSON.stringify(mergedConfig),
    },
  };
}

function withButtons(block) {
  const buttons = db
    .prepare('SELECT * FROM buttons WHERE section_id = ? ORDER BY urutan ASC, id ASC')
    .all(block.id);
  return { ...block, config: parseConfig(block.config, {}), buttons };
}

// Blok aplikasi boleh diubah editor; blok konten/struktural khusus admin.
function canEditBlock(req, res, tipe) {
  if (tipe === 'apps') return true;
  if (req.session && req.session.user && req.session.user.role === 'admin') return true;
  res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah blok ini' });
  return false;
}

router.get(
  '/admin/sections/types',
  requireAuth,
  asyncHandler((req, res) => {
    res.json({ success: true, data: BLOCK_TYPES });
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
    if (!canEditBlock(req, res, values.tipe)) return;
    if (BLOCK_TYPES[values.tipe].singleton) {
      const existing = db.prepare('SELECT id FROM sections WHERE tipe = ?').get(values.tipe);
      if (existing) return res.status(409).json({ success: false, message: 'Blok tipe ini sudah ada' });
    }
    if (db.prepare('SELECT id FROM sections WHERE slug = ?').get(values.slug)) {
      return res.status(409).json({ success: false, message: 'Slug blok sudah dipakai' });
    }
    const info = db
      .prepare(
        `INSERT INTO sections (slug, judul, subjudul, gaya, tipe, ikon, warna, urutan, tampil_judul, aktif, config)
         VALUES (@slug, @judul, @subjudul, @gaya, @tipe, @ikon, @warna, @urutan, @tampil_judul, @aktif, @config)`
      )
      .run(values);
    res.json({
      success: true,
      data: withButtons(db.prepare('SELECT * FROM sections WHERE id = ?').get(info.lastInsertRowid)),
    });
  })
);

router.put(
  '/admin/sections/reorder',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const order = Array.isArray(req.body && req.body.order) ? req.body.order : null;
    if (!order) return res.status(400).json({ success: false, message: 'Daftar urutan wajib diisi' });
    const update = db.prepare('UPDATE sections SET urutan = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const ids = order.map((v) => toInt(v, 0)).filter(Boolean);
    const allowed = ids.filter((id) => {
      const row = db.prepare('SELECT tipe FROM sections WHERE id = ?').get(id);
      return row && !BLOCK_TYPES[row.tipe]?.structural;
    });
    db.transaction(() => {
      allowed.forEach((id, i) => update.run(i + 1, id));
    })();
    res.json({ success: true });
  })
);

router.put(
  '/admin/sections/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Blok tidak ditemukan' });
    const { values, error } = normalize({ ...existing, ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    if (!canEditBlock(req, res, existing.tipe)) return;
    if (BLOCK_TYPES[values.tipe]?.singleton && values.tipe !== existing.tipe) {
      const dup = db.prepare('SELECT id FROM sections WHERE tipe = ? AND id != ?').get(values.tipe, id);
      if (dup) return res.status(409).json({ success: false, message: 'Blok tipe ini sudah ada' });
    }
    if (db.prepare('SELECT id FROM sections WHERE slug = ? AND id != ?').get(values.slug, id)) {
      return res.status(409).json({ success: false, message: 'Slug blok sudah dipakai' });
    }
    db.prepare(
      `UPDATE sections SET slug=@slug, judul=@judul, subjudul=@subjudul, gaya=@gaya, tipe=@tipe, ikon=@ikon,
       warna=@warna, urutan=@urutan, tampil_judul=@tampil_judul, aktif=@aktif, config=@config,
       updated_at=datetime('now') WHERE id=@id`
    ).run({ ...values, id });
    res.json({
      success: true,
      data: withButtons(db.prepare('SELECT * FROM sections WHERE id = ?').get(id)),
    });
  })
);

router.delete(
  '/admin/sections/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Blok tidak ditemukan' });
    if (BLOCK_TYPES[existing.tipe]?.structural) {
      return res.status(400).json({ success: false, message: 'Blok struktural tidak dapat dihapus' });
    }
    if (!canEditBlock(req, res, existing.tipe)) return;
    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
    res.json({ success: true });
  })
);

module.exports = router;
