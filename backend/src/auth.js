const session = require('express-session');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

class SqliteStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.setStmt = db.prepare(
      `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires`
    );
    this.delStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.cleanStmt = db.prepare('DELETE FROM sessions WHERE expires < ?');
    this.cleanTimer = setInterval(() => {
      try {
        this.cleanStmt.run(Date.now());
      } catch {
        /* noop */
      }
    }, 1000 * 60 * 60);
    if (this.cleanTimer.unref) this.cleanTimer.unref();
  }

  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid);
      if (!row) return cb(null, null);
      if (row.expires && Date.now() > row.expires) {
        this.delStmt.run(sid);
        return cb(null, null);
      }
      return cb(null, JSON.parse(row.data));
    } catch (err) {
      return cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      const expires = sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + SESSION_TTL_MS;
      this.setStmt.run(sid, JSON.stringify(sess), expires);
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      const expires = sess.cookie && sess.cookie.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + SESSION_TTL_MS;
      this.touchStmt.run(expires, sid);
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.delStmt.run(sid);
      return cb && cb(null);
    } catch (err) {
      return cb && cb(err);
    }
  }
}

function buildSessionMiddleware() {
  return session({
    store: new SqliteStore(),
    secret: process.env.SESSION_SECRET || 'dwisma-dev-secret-change-me',
    name: 'dwisma.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Set COOKIE_SECURE=1 bila diakses lewat HTTPS (mis. di belakang reverse proxy TLS).
      secure: ['1', 'true'].includes(String(process.env.COOKIE_SECURE || '').toLowerCase()),
      maxAge: SESSION_TTL_MS,
    },
  });
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ success: false, message: 'Harus login terlebih dahulu' });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Harus login terlebih dahulu' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    return next();
  };
}

module.exports = {
  SqliteStore,
  buildSessionMiddleware,
  hashPassword,
  verifyPassword,
  requireAuth,
  requireRole,
};
