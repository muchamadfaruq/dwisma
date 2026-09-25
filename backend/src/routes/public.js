const express = require('express');
const axios = require('axios');
const { getSettings } = require('../db');
const { asyncHandler } = require('../utils');
const { getSourceData } = require('../services/scraper');

const router = express.Router();

function sourceRoute(path, key, label) {
  router.get(
    path,
    asyncHandler(async (req, res) => {
      try {
        const data = await getSourceData(key);
        res.json({ success: true, data: data || [] });
      } catch (err) {
        console.error(`${label} error:`, err.message);
        res.status(502).json({ success: false, message: `Gagal mengambil ${label}` });
      }
    })
  );
}

sourceRoute('/berita', 'berita', 'berita');
sourceRoute('/prestasi', 'prestasi', 'prestasi');
sourceRoute('/pengumuman', 'pengumuman', 'pengumuman');
sourceRoute('/wakasek', 'wakasek', 'wakasek');

router.get(
  '/profil-sekolah',
  asyncHandler(async (req, res) => {
    try {
      const data = await getSourceData('profil_sekolah');
      if (!data) return res.status(502).json({ success: false, message: 'Gagal mengambil profil sekolah' });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Profil sekolah error:', err.message);
      res.status(502).json({ success: false, message: 'Gagal mengambil profil sekolah' });
    }
  })
);

router.get(
  '/profil-website',
  asyncHandler(async (req, res) => {
    try {
      const data = await getSourceData('profil_website');
      if (!data) return res.status(502).json({ success: false, message: 'Gagal mengambil profil website' });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Profil website error:', err.message);
      res.status(502).json({ success: false, message: 'Gagal mengambil profil website' });
    }
  })
);

let statusCache = null;
let statusCacheTime = 0;

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const settings = getSettings();
    if (settings.uptime_enabled === '0') {
      return res.json({ success: true, enabled: false, monitors: [] });
    }
    if (statusCache && Date.now() - statusCacheTime < 60 * 1000) {
      return res.json(statusCache);
    }
    const base = (settings.uptime_kuma_url || '').replace(/\/$/, '');
    const slug = settings.uptime_status_slug || 'status';
    if (!base) return res.json({ success: true, enabled: false, monitors: [] });
    try {
      const [listRes, heartbeatRes] = await Promise.all([
        axios.get(`${base}/api/status-page/${slug}`, { timeout: 15000 }),
        axios.get(`${base}/api/status-page/heartbeat/${slug}`, { timeout: 15000 }),
      ]);
      const beats = heartbeatRes.data.heartbeatList || {};
      const uptime = heartbeatRes.data.uptimeList || {};
      const monitors = [];
      for (const group of listRes.data.publicGroupList || []) {
        for (const mon of group.monitorList || []) {
          const arr = beats[mon.id] || [];
          const latest = arr.length ? arr[arr.length - 1] : null;
          monitors.push({
            id: mon.id,
            name: mon.name,
            url: mon.url || null,
            status: latest ? latest.status : null,
            uptime: uptime[`${mon.id}_24`] ?? null,
            ping: latest ? latest.ping : null,
            lastCheck: latest ? latest.time : null,
          });
        }
      }
      statusCache = { success: true, enabled: true, updated: new Date().toISOString(), monitors, detailUrl: `${base}/status/${slug}` };
      statusCacheTime = Date.now();
      res.json(statusCache);
    } catch (err) {
      console.error('Status error:', err.message);
      res.status(502).json({ success: false, message: 'Gagal mengambil status layanan' });
    }
  })
);

module.exports = router;
