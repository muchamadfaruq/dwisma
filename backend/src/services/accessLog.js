const fs = require('fs');
const { db } = require('../db');

let arpCache = { time: 0, map: {} };

// MAC address tidak dikirim oleh klien lewat HTTP. Satu-satunya cara (best-effort)
// adalah membaca tabel ARP server, yang hanya berisi host pada segmen LAN yang sama.
const ARP_SOURCES = ['/host-arp', '/proc/net/arp'];

function readArp() {
  if (Date.now() - arpCache.time < 10000) return arpCache.map;
  const map = {};
  for (const file of ARP_SOURCES) {
    try {
      const txt = fs.readFileSync(file, 'utf-8');
      txt.split('\n').slice(1).forEach((line) => {
        const p = line.trim().split(/\s+/);
        if (p.length >= 4 && p[0] && p[3] && p[3] !== '00:00:00:00:00:00') {
          map[p[0]] = p[3].toUpperCase();
        }
      });
    } catch {
      /* sumber tidak tersedia */
    }
  }
  arpCache = { time: Date.now(), map };
  return map;
}

function getMac(ip) {
  if (!ip) return '';
  const clean = String(ip).replace(/^::ffff:/, '');
  return readArp()[clean] || '';
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.ip || (req.socket && req.socket.remoteAddress) || '';
  return String(ip).replace(/^::ffff:/, '');
}

function logAccess(req, tipe = 'page') {
  try {
    const ip = clientIp(req);
    db.prepare(
      `INSERT INTO access_logs (ip, mac, user_agent, method, path, referer, user_id, tipe)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ip,
      getMac(ip),
      String(req.headers['user-agent'] || '').slice(0, 500),
      req.method || '',
      req.originalUrl || req.path || '',
      String(req.headers.referer || '').slice(0, 500),
      req.session && req.session.user ? req.session.user.id : null,
      tipe
    );
  } catch (err) {
    console.error('Access log error:', err.message);
  }
}

module.exports = { logAccess, getMac, clientIp };
