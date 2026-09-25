require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { DATA_DIR, getSettings } = require('./db');
const { buildSessionMiddleware } = require('./auth');
const { logAccess } = require('./services/accessLog');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const sectionsRoutes = require('./routes/sections');
const buttonsRoutes = require('./routes/buttons');
const socialsRoutes = require('./routes/socials');
const kalenderRoutes = require('./routes/kalender');
const guruRoutes = require('./routes/guru');
const usersRoutes = require('./routes/users');
const accessLogsRoutes = require('./routes/accessLogs');
const settingsRoutes = require('./routes/settings');
const mediaRoutes = require('./routes/media');
const sourcesRoutes = require('./routes/sources');
const chatRoutes = require('./routes/chat');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, '..', '..', 'public');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(buildSessionMiddleware());

// Catat kunjungan halaman: portal publik (dwisma.id) dan halaman admin.
const MONITOR_UA = /uptime[- ]?kuma|uptimerobot|pingdom|statuscake|better ?uptime|hetrix|site24x7|monitoring/i;
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const ua = String(req.headers['user-agent'] || '');
  if (MONITOR_UA.test(ua)) return next();

  const isAdminPage = req.path === '/admin' || req.path === '/admin.html';
  const isPortalPage =
    !path.extname(req.path) &&
    !req.path.startsWith('/api/') &&
    !req.path.startsWith('/uploads/') &&
    req.accepts('html');

  if (isAdminPage || isPortalPage) {
    logAccess(req, isAdminPage ? 'admin' : 'portal');
  }
  next();
});

app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: '7d' }));

app.get('/api/site', (req, res) => {
  const s = getSettings();
  res.json({
    success: true,
    data: {
      site_name: s.site_name,
      site_short_name: s.site_short_name,
      site_school: s.site_school,
      site_description: s.site_description,
      ai_enabled: s.ai_enabled === '1',
    },
  });
});

app.use('/api', authRoutes);
app.use('/api', contentRoutes);
app.use('/api', publicRoutes);
app.use('/api', sectionsRoutes);
app.use('/api', buttonsRoutes);
app.use('/api', socialsRoutes);
app.use('/api', kalenderRoutes);
app.use('/api', guruRoutes);
app.use('/api', usersRoutes);
app.use('/api', accessLogsRoutes);
app.use('/api', settingsRoutes);
app.use('/api', mediaRoutes);
app.use('/api', sourcesRoutes);
app.use('/api', chatRoutes);

app.use(express.static(PUBLIC_DIR, { maxAge: '1h', extensions: ['html'] }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  // Jangan kembalikan index.html untuk aset statis yang tidak ada (mis. /img/x.png).
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
});

app.listen(PORT, () => {
  console.log(`Dwisma backend berjalan di port ${PORT}`);
});
