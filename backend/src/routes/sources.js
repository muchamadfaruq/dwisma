const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, isValidHttpUrl, toInt, toBool } = require('../utils');
const { scrapeSource } = require('../services/scraper');

const router = express.Router();

const TYPES = new Set(['list', 'pairs', 'tables', 'website']);

function parseConfig(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Config harus berupa JSON yang valid');
  }
}

function normalize(body) {
  const key = String(body.key || '').trim();
  const nama = String(body.nama || '').trim();
  const tipe = String(body.tipe || 'list').trim();
  const url = String(body.url || '').trim();
  if (!key) return { error: 'Key sumber wajib diisi' };
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key hanya boleh huruf kecil, angka, dan underscore' };
  if (!nama) return { error: 'Nama sumber wajib diisi' };
  if (!TYPES.has(tipe)) return { error: 'Tipe sumber tidak valid' };
  if (!isValidHttpUrl(url)) return { error: 'URL harus diawali http:// atau https://' };
  let config;
  try {
    config = parseConfig(body.config);
  } catch (err) {
    return { error: err.message };
  }
  return {
    values: {
      key,
      nama,
      tipe,
      url,
      config: JSON.stringify(config),
      aktif: toBool(body.aktif, true) ? 1 : 0,
      cache_ttl: toInt(body.cache_ttl, 21600),
    },
  };
}

function serialize(row) {
  return {
    ...row,
    config: (() => {
      try {
        return JSON.parse(row.config || '{}');
      } catch {
        return {};
      }
    })(),
    preview: (() => {
      try {
        return row.cache_json ? JSON.parse(row.cache_json) : null;
      } catch {
        return null;
      }
    })(),
  };
}

router.get(
  '/admin/sources',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM sources ORDER BY id ASC').all();
    res.json({ success: true, data: rows.map(serialize) });
  })
);

router.post(
  '/admin/sources',
  requireAuth,
  asyncHandler((req, res) => {
    const { values, error } = normalize(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });
    const exists = db.prepare('SELECT id FROM sources WHERE key = ?').get(values.key);
    if (exists) return res.status(409).json({ success: false, message: 'Key sumber sudah dipakai' });
    const info = db
      .prepare(
        `INSERT INTO sources (key, nama, tipe, url, config, aktif, cache_ttl)
         VALUES (@key, @nama, @tipe, @url, @config, @aktif, @cache_ttl)`
      )
      .run(values);
    res.json({ success: true, data: serialize(db.prepare('SELECT * FROM sources WHERE id = ?').get(info.lastInsertRowid)) });
  })
);

router.put(
  '/admin/sources/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Sumber tidak ditemukan' });
    const merged = {
      ...existing,
      ...req.body,
      config: req.body.config !== undefined ? req.body.config : existing.config,
      aktif: req.body.aktif !== undefined ? req.body.aktif : existing.aktif,
    };
    const { values, error } = normalize(merged);
    if (error) return res.status(400).json({ success: false, message: error });
    const dup = db.prepare('SELECT id FROM sources WHERE key = ? AND id != ?').get(values.key, id);
    if (dup) return res.status(409).json({ success: false, message: 'Key sumber sudah dipakai' });
    db.prepare(
      `UPDATE sources SET key=@key, nama=@nama, tipe=@tipe, url=@url, config=@config,
       aktif=@aktif, cache_ttl=@cache_ttl, updated_at=datetime('now') WHERE id=@id`
    ).run({ ...values, id });
    res.json({ success: true, data: serialize(db.prepare('SELECT * FROM sources WHERE id = ?').get(id)) });
  })
);

router.delete(
  '/admin/sources/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const info = db.prepare('DELETE FROM sources WHERE id = ?').run(toInt(req.params.id));
    if (!info.changes) return res.status(404).json({ success: false, message: 'Sumber tidak ditemukan' });
    res.json({ success: true });
  })
);

router.post(
  '/admin/sources/:id/test',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ success: false, message: 'Sumber tidak ditemukan' });
    try {
      row.config = (() => {
        try {
          return JSON.parse(row.config || '{}');
        } catch {
          return {};
        }
      })();
      const data = await scrapeSource(row);
      db.prepare("UPDATE sources SET cache_json=?, last_fetch=?, updated_at=datetime('now') WHERE id=?").run(
        JSON.stringify(data),
        Date.now(),
        id
      );
      res.json({ success: true, data });
    } catch (err) {
      res.status(502).json({ success: false, message: `Gagal mengambil data: ${err.message}` });
    }
  })
);

module.exports = router;
