const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db, DATA_DIR } = require('../db');
const { requireAuth } = require('../auth');
const { asyncHandler, toInt } = require('../utils');

const router = express.Router();
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = EXT[file.mimetype] || path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error('Format gambar tidak didukung'));
    cb(null, true);
  },
});

router.get(
  '/admin/media',
  requireAuth,
  asyncHandler((req, res) => {
    const rows = db.prepare('SELECT * FROM media ORDER BY id DESC').all();
    res.json({
      success: true,
      data: rows.map((m) => ({ ...m, url: `/uploads/${m.filename}` })),
    });
  })
);

router.post(
  '/admin/media',
  requireAuth,
  (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah' });
      const info = db
        .prepare('INSERT INTO media (filename, original_name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?)')
        .run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.session.user.id);
      const row = db.prepare('SELECT * FROM media WHERE id = ?').get(info.lastInsertRowid);
      res.json({ success: true, data: { ...row, url: `/uploads/${row.filename}` } });
    });
  }
);

router.delete(
  '/admin/media/:id',
  requireAuth,
  asyncHandler((req, res) => {
    const id = toInt(req.params.id);
    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ success: false, message: 'Media tidak ditemukan' });
    const filePath = path.join(UPLOAD_DIR, row.filename);
    fs.promises.unlink(filePath).catch(() => {});
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
    res.json({ success: true });
  })
);

module.exports = router;
