const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', 'data');
const SEED_DIR = process.env.SEED_DIR || path.resolve(__dirname, '..', '..', 'data');

for (const dir of [DATA_DIR, path.join(DATA_DIR, 'uploads')]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'dwisma.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nama TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT DEFAULT '',
      mime TEXT DEFAULT '',
      size INTEGER DEFAULT 0,
      uploaded_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      judul TEXT NOT NULL DEFAULT '',
      subjudul TEXT DEFAULT '',
      gaya TEXT NOT NULL DEFAULT 'grid' CHECK (gaya IN ('grid', 'list', 'pill', 'pillSmall')),
      ikon TEXT DEFAULT '',
      warna TEXT DEFAULT 'blue',
      urutan INTEGER NOT NULL DEFAULT 0,
      tampil_judul INTEGER NOT NULL DEFAULT 1,
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS buttons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      nama TEXT NOT NULL,
      deskripsi TEXT DEFAULT '',
      url TEXT NOT NULL,
      icon TEXT DEFAULT 'bi-link-45deg',
      image TEXT DEFAULT '',
      warna TEXT DEFAULT 'blue',
      urutan INTEGER NOT NULL DEFAULT 0,
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT DEFAULT 'bi-link-45deg',
      warna TEXT DEFAULT 'slate',
      urutan INTEGER NOT NULL DEFAULT 0,
      aktif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kalender (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      tanggal_selesai TEXT DEFAULT '',
      kegiatan TEXT NOT NULL,
      keterangan TEXT DEFAULT '',
      urutan INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS guru (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      mapel TEXT DEFAULT '',
      jabatan TEXT DEFAULT '',
      urutan INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      tipe TEXT NOT NULL DEFAULT 'list',
      url TEXT NOT NULL DEFAULT '',
      config TEXT NOT NULL DEFAULT '{}',
      aktif INTEGER NOT NULL DEFAULT 1,
      cache_ttl INTEGER NOT NULL DEFAULT 21600,
      last_fetch INTEGER NOT NULL DEFAULT 0,
      cache_json TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT DEFAULT '',
      mac TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      method TEXT DEFAULT '',
      path TEXT DEFAULT '',
      referer TEXT DEFAULT '',
      user_id INTEGER,
      tipe TEXT DEFAULT 'page',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_buttons_section ON buttons (section_id, urutan, id);
    CREATE INDEX IF NOT EXISTS idx_sections_urutan ON sections (urutan, id);
    CREATE INDEX IF NOT EXISTS idx_socials_urutan ON social_links (urutan, id);
    CREATE INDEX IF NOT EXISTS idx_kalender_tanggal ON kalender (tanggal);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);

    UPDATE access_logs SET tipe = 'admin' WHERE tipe = 'page';
  `);

  addColumnIfMissing('kalender', 'tanggal_selesai', "TEXT DEFAULT ''");
  addColumnIfMissing('sections', 'tipe', "TEXT NOT NULL DEFAULT 'apps'");
  addColumnIfMissing('sections', 'config', "TEXT NOT NULL DEFAULT '{}'");
}

const DEFAULT_AI_PROMPT =
  'Kamu adalah asisten AI untuk website SMA Negeri 2 Mengwi (Dwisma). SELALU prioritaskan data referensi sekolah yang diberikan di bawah untuk menjawab pertanyaan tentang identitas sekolah, visi misi, akreditasi, kontak, prestasi, kalender akademik, berita, pengumuman, guru, wakasek, dan aplikasi sekolah. Jawab dengan ramah, informatif, dan struktur yang rapi: gunakan bullet point sederhana (-) untuk daftar dan **teks tebal** untuk penekanan; jangan gunakan heading markdown, blockquote, atau garis pemisah. Jika pertanyaan di luar konteks sekolah dan tidak ada di data referensi, jawab SINGKAT (maksimal 2 kalimat) sebagai informasi umum bila kamu mengetahuinya, lalu arahkan kembali ke topik sekolah/Dwisma. Jangan mengarang data sekolah; bila informasi sekolah tidak ada di referensi, katakan belum tersedia. Gunakan bahasa Indonesia.';

// Daftar system prompt default versi lama; bila masih sama persis, di-upgrade ke versi baru.
const OLD_AI_PROMPTS = [
  'Kamu adalah asisten AI untuk website SMA Negeri 2 Mengwi (Dwisma). Jawab pertanyaan dengan ramah, informatif, dan struktur yang rapi. Gunakan bullet point sederhana (-) untuk daftar dan **teks tebal** untuk penekanan. Jangan gunakan heading markdown, blockquote, atau garis pemisah. Gunakan data referensi yang diberikan untuk menjawab pertanyaan tentang identitas sekolah, visi misi, akreditasi, kontak, prestasi, kalender akademik, berita terbaru, guru, dan aplikasi sekolah. Jika ditanya di luar konteks sekolah, jawab secara umum. Gunakan bahasa Indonesia.',
  'Kamu adalah asisten AI untuk website SMA Negeri 2 Mengwi (Dwisma). SELALU prioritaskan data referensi sekolah yang diberikan di bawah untuk menjawab pertanyaan tentang identitas sekolah, visi misi, akreditasi, kontak, prestasi, kalender akademik, berita, pengumuman, guru, wakasek, dan aplikasi sekolah. Jawab dengan ramah, informatif, dan struktur yang rapi: gunakan bullet point sederhana (-) untuk daftar dan **teks tebal** untuk penekanan; jangan gunakan heading markdown, blockquote, atau garis pemisah. Jika pertanyaan di luar konteks sekolah dan tidak ada di data referensi, jawab secara SINGKAT dan umum saja, lalu arahkan kembali ke topik sekolah/Dwisma. Jangan mengarang data sekolah; bila informasi tidak ada di referensi, katakan belum tersedia. Gunakan bahasa Indonesia.',
];

const DEFAULT_SETTINGS = {
  site_name: 'Portal Aplikasi SMAN 2 Mengwi',
  site_short_name: 'Dwisma Portal',
  site_school: 'SMAN 2 Mengwi',
  site_description: 'Portal aplikasi resmi SMAN 2 Mengwi - akses semua layanan sekolah dalam satu tempat',

  ai_provider: 'deepseek',
  ai_enabled: '1',
  deepseek_api_key: '',
  deepseek_model: 'deepseek-chat',
  deepseek_base_url: 'https://api.deepseek.com',
  ai_system_prompt: DEFAULT_AI_PROMPT,

  uptime_enabled: '1',
  uptime_kuma_url: 'https://uptime.dwisma.id',
  uptime_status_slug: 'status',
};

const DEFAULT_SECTIONS = [
  { slug: 'sekolah', judul: 'Aplikasi Sekolah', gaya: 'grid', ikon: 'bi-grid-1x2-fill', warna: 'blue', urutan: 1 },
  { slug: 'pembelajaran', judul: 'Pembelajaran', gaya: 'list', ikon: 'bi-book-half', warna: 'amber', urutan: 2 },
  { slug: 'ekstrakurikuler', judul: 'Ekstrakurikuler', gaya: 'list', ikon: 'bi-stars', warna: 'green', urutan: 3 },
  { slug: 'pemprov', judul: 'Aplikasi Pemprov Bali', gaya: 'pill', ikon: '', warna: 'red', urutan: 4 },
  { slug: 'pusat', judul: 'Aplikasi Pemerintah Pusat', gaya: 'pillSmall', ikon: '', warna: 'teal', urutan: 5 },
];

// Jenis blok halaman. `structural` = posisi tetap (hanya bisa diaktifkan/nonaktifkan).
// `singleton` = hanya boleh ada satu blok untuk tipe tersebut.
const BLOCK_TYPES = {
  nav: { label: 'Navbar', structural: true, singleton: true },
  hero: { label: 'Hero', singleton: true },
  search: { label: 'Pencarian', singleton: true },
  kalender: { label: 'Kalender Akademik', singleton: true },
  berita: { label: 'Berita', singleton: true },
  banner: { label: 'Banner', singleton: true },
  location: { label: 'Lokasi Sekolah', singleton: true },
  footer: { label: 'Footer', structural: true, singleton: true },
  chat: { label: 'Chat AI', structural: true, singleton: true },
  html: { label: 'Teks / HTML' },
  apps: { label: 'Aplikasi (Tombol)' },
};

const DEFAULT_BLOCK_CONFIG = {
  nav: {
    brand_prefix: 'dwisma.',
    brand_suffix: 'id',
    login_label: 'Login Admin',
    logos: ['/img/logo-pemprov-bali.png', '/img/Logo Dwisma.png', '/img/Logo_Kemendikdasmen.png'],
  },
  hero: {
    badges: ['/img/logo-pemprov-bali.png', '/img/Logo_Kemendikdasmen.png'],
    logo: '/img/Logo Dwisma.png',
    logo_url: 'https://sman2mengwi.sch.id',
    school: 'SMAN 2 Mengwi',
    official_prefix: 'Kunjungi situs resmi:',
    official_label: 'sman2mengwi.sch.id',
    official_url: 'https://sman2mengwi.sch.id',
    typing_title_1: 'Selamat Datang di \n',
    typing_title_2: 'Portal Dwisma',
    typing_subtitle: 'Wadah Digital Bagi Seluruh Civitas Akademika SMA Negeri 2 Mengwi',
  },
  search: { placeholder: 'Cari di portal...' },
  kalender: { limit: 3 },
  berita: {
    source: 'berita',
    limit: 12,
    link_url: 'https://sman2mengwi.sch.id',
    link_label: 'Lihat Semua Berita',
  },
  banner: {
    url: 'https://guru.kemendikdasmen.go.id/',
    logo: '/img/logoruanggtk.png',
    label: 'Akses Langsung',
    pre: 'Platform',
    hi1: 'Merdeka',
    hi2: 'Mengajar',
  },
  location: {
    title: 'SMA Negeri 2 Mengwi',
    address: 'Jl. Raya Munggu - Tanah Lot, Munggu, Kec. Mengwi, Kab. Badung, Bali',
    map_embed:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3944.605342939339!2d115.11822807499912!3d-8.624244291417036!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd23f99e31b3433%3A0x633190829377464a!2sSMA%20Negeri%202%20Mengwi!5e0!3m2!1sid!2sid!4v1721234567890!5m2!1sid!2sid',
    directions_url: 'https://www.google.com/maps/search/?api=1&query=SMA+Negeri+2+Mengwi',
  },
  footer: {
    logos: ['/img/logo-pemprov-bali.png', '/img/Logo Dwisma.png', '/img/Logo_Kemendikdasmen.png'],
    brand_title: 'DWISMA',
    brand_sub: 'SMAN 2 Mengwi',
    copyright: '© 2026 Tim Teknologi Informasi | SMAN 2 Mengwi.',
    status_text: 'Sistem Berjalan Normal',
  },
  chat: {
    label: 'Tanya AI Dwisma',
    header: 'AI Assistant Dwisma',
    welcome: 'Halo! Ada yang bisa saya bantu tentang SMA Negeri 2 Mengwi?',
    placeholder: 'Ketik pesan...',
    quick_questions: [
      { label: 'Kepala Sekolah', message: 'Siapa kepala sekolah?' },
      { label: 'Aplikasi', message: 'Apa saja aplikasi sekolah?' },
      { label: 'Wakasek', message: 'Siapa wakasek kurikulum?' },
      { label: 'Kalender', message: 'Kapan hari pertama masuk?' },
      { label: 'NPSN', message: 'Apa NPSN sekolah?' },
    ],
  },
  html: { konten: '' },
  apps: {},
};

// Pemetaan setting lama (sebelum blok) ke config blok: [configKey, settingKey, tipe?]
const LEGACY_CONFIG_MAP = {
  nav: [
    ['brand_prefix', 'site_brand_prefix'],
    ['brand_suffix', 'site_brand_suffix'],
    ['login_label', 'admin_login_label'],
    ['logos', 'nav_logos', 'json'],
  ],
  hero: [
    ['badges', 'hero_badges', 'json'],
    ['logo', 'hero_logo'],
    ['logo_url', 'hero_logo_url'],
    ['school', 'hero_school'],
    ['official_prefix', 'hero_official_prefix'],
    ['official_label', 'hero_official_label'],
    ['official_url', 'hero_official_url'],
    ['typing_title_1', 'typing_title_1'],
    ['typing_title_2', 'typing_title_2'],
    ['typing_subtitle', 'typing_subtitle'],
  ],
  banner: [
    ['url', 'banner_url'],
    ['logo', 'banner_logo'],
    ['label', 'banner_label'],
    ['pre', 'banner_pre'],
    ['hi1', 'banner_hi1'],
    ['hi2', 'banner_hi2'],
  ],
  location: [
    ['title', 'location_title'],
    ['address', 'location_address'],
    ['map_embed', 'location_map_embed'],
    ['directions_url', 'location_directions_url'],
  ],
  footer: [
    ['logos', 'footer_logos', 'json'],
    ['brand_title', 'footer_brand_title'],
    ['brand_sub', 'footer_brand_sub'],
    ['copyright', 'footer_copyright'],
    ['status_text', 'footer_status_text'],
  ],
  chat: [
    ['label', 'chat_label'],
    ['header', 'chat_header'],
    ['welcome', 'chat_welcome'],
    ['placeholder', 'chat_placeholder'],
    ['quick_questions', 'chat_quick_questions', 'json'],
  ],
};

const LEGACY_SETTINGS = (() => {
  const keys = new Set(['banner_enabled', 'location_enabled']);
  Object.values(LEGACY_CONFIG_MAP).forEach((rows) => rows.forEach((r) => keys.add(r[1])));
  return Array.from(keys);
})();

const PAGE_BLOCKS = [
  { slug: 'nav', tipe: 'nav', judul: 'Navbar', urutan: 0, tampil_judul: 0 },
  { slug: 'hero', tipe: 'hero', judul: 'Hero', urutan: 10, tampil_judul: 0 },
  { slug: 'pencarian', tipe: 'search', judul: 'Pencarian', urutan: 20, tampil_judul: 0 },
  { slug: 'kalender', tipe: 'kalender', judul: 'Kalender Akademik', urutan: 30, tampil_judul: 1 },
  { slug: 'berita', tipe: 'berita', judul: 'Berita Terkini', urutan: 50, tampil_judul: 1 },
  { slug: 'banner', tipe: 'banner', judul: 'Banner', urutan: 60, tampil_judul: 0 },
  { slug: 'lokasi', tipe: 'location', judul: 'Lokasi Sekolah', urutan: 70, tampil_judul: 1 },
  { slug: 'footer', tipe: 'footer', judul: 'Footer', urutan: 900, tampil_judul: 0 },
  { slug: 'chat', tipe: 'chat', judul: 'Chat AI', urutan: 910, tampil_judul: 0 },
];

const CATEGORY_TO_SLUG = {
  Sekolah: 'sekolah',
  Pembelajaran: 'pembelajaran',
  Ekstrakurikuler: 'ekstrakurikuler',
  'Pemprov Bali': 'pemprov',
  Eksternal: 'pusat',
};

const EXTRA_BUTTONS = [
  { slug: 'sekolah', nama: 'Alumni', deskripsi: 'Tracer Study', url: 'https://tracer.dwisma.id', icon: 'bi-people-fill', warna: 'teal' },
  { slug: 'pemprov', nama: 'Simpeg', deskripsi: '', url: 'https://simpeg.baliprov.go.id', image: 'https://kanal.baliprov.go.id/system/simpeg-logo.png', warna: 'amber' },
  { slug: 'pusat', nama: 'Datadik', deskripsi: '', url: 'https://ptk.datadik.kemendikdasmen.go.id/', image: 'https://cdn-dapodik.kemdikbud.go.id/sp/favicon.ico', warna: 'teal' },
  { slug: 'pusat', nama: 'Info-Gtk', deskripsi: '', url: 'https://info.gtk.kemendikdasmen.go.id/', image: 'https://info.gtk.dikdasmen.go.id/assets/img/favicon.png', warna: 'amber' },
  { slug: 'pusat', nama: 'My ASN', deskripsi: '', url: 'https://myasn.bkn.go.id', image: '/img/Logo Dapodik.png', warna: 'indigo' },
  { slug: 'pusat', nama: 'Simpkb', deskripsi: '', url: 'https://paspor-gtk.simpkb.id/', image: 'https://paspor-gtk.simpkb.id/casgpo/asset/img/logo-kemdikbud.png', warna: 'cyan' },
];

const DEFAULT_SOCIALS = [
  { nama: 'Youtube', url: 'https://www.youtube.com/channel/UCz6SfxL3mwHP1Xjz_JvBqvg', icon: 'bi-youtube', warna: 'red', urutan: 1 },
  { nama: 'Instagram', url: 'https://www.instagram.com/osisdwisma', icon: 'bi-instagram', warna: 'pink', urutan: 2 },
  { nama: 'Facebook', url: 'https://web.facebook.com/SMAN2MENGWI', icon: 'bi-facebook', warna: 'blue', urutan: 3 },
];

const DEFAULT_SOURCES = [
  {
    key: 'berita',
    nama: 'Berita Sekolah',
    tipe: 'list',
    url: 'https://sman2mengwi.sch.id/berita',
    config: { item: '.list-berita', title: 'h3', date: '.date-upload', excerpt: 'p', link: '> a', img: '> a img', limit: 12 },
  },
  {
    key: 'prestasi',
    nama: 'Prestasi Sekolah',
    tipe: 'list',
    url: 'https://sman2mengwi.sch.id/prestasi',
    config: { item: '.list-berita', title: 'h3', date: '.date-upload', excerpt: 'p', limit: 10 },
  },
  {
    key: 'pengumuman',
    nama: 'Pengumuman Sekolah',
    tipe: 'list',
    url: 'https://sman2mengwi.sch.id/pengumuman',
    config: { item: '.list-berita', title: 'h3', date: '.date-upload', limit: 10 },
  },
  {
    key: 'wakasek',
    nama: 'Wakasek',
    tipe: 'pairs',
    url: 'https://sman2mengwi.sch.id/wakasek',
    config: { item: '.fh5co-trainer section.img-ckeditor p', namePrefix: 'Nama :', valuePrefix: 'Tugas :' },
  },
  {
    key: 'profil_sekolah',
    nama: 'Profil Sekolah (Referensi Kemendikdasmen)',
    tipe: 'tables',
    url: 'https://referensi.data.kemendikdasmen.go.id/tabs.php?npsn=50101684',
    config: { row: 'table tr', keyIndex: 1, valueIndex: 3, tabContainer: '.tabby-tab', tabLabel: 'label' },
  },
  {
    key: 'profil_website',
    nama: 'Profil Website Sekolah',
    tipe: 'website',
    url: 'https://sman2mengwi.sch.id/',
    config: {
      tagline: '.tagline',
      contactBox: '.box_kontak_umum .alamat li',
      social: '.icon-sosmed a',
      tentangUrl: 'https://sman2mengwi.sch.id/index.php/tentang-sekolah',
      tentang: '.img-ckeditor',
      kepala: '.pricing-text',
      kepalaRegex: 'nama saya (.+?)Saya adalah',
    },
  },
];

function readSeed(filename) {
  const file = path.join(SEED_DIR, filename);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`[seed] Gagal membaca ${filename}:`, err.message);
    return [];
  }
}

function seedSettings() {
  const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, value);

  if (process.env.DEEPSEEK_API_KEY) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ? AND value = ?').run(
      process.env.DEEPSEEK_API_KEY,
      'deepseek_api_key',
      ''
    );
  }
}

function migrateSystemPrompt() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'ai_system_prompt'").get();
  if (row && OLD_AI_PROMPTS.includes(row.value)) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'ai_system_prompt'").run(DEFAULT_AI_PROMPT);
    console.log('[seed] System prompt AI diperbarui (prioritaskan data sekolah)');
  }
}

function seedSections() {
  const insert = db.prepare(
    `INSERT INTO sections (slug, judul, gaya, ikon, warna, urutan)
     VALUES (@slug, @judul, @gaya, @ikon, @warna, @urutan)
     ON CONFLICT(slug) DO NOTHING`
  );
  for (const s of DEFAULT_SECTIONS) insert.run({ ikon: '', ...s });
}

function sectionIdBySlug(slug) {
  const row = db.prepare('SELECT id FROM sections WHERE slug = ?').get(slug);
  return row ? row.id : null;
}

function insertButton(b, index) {
  const sectionId = sectionIdBySlug(b.slug);
  if (!sectionId) return;
  const exists = db
    .prepare('SELECT id FROM buttons WHERE section_id = ? AND nama = ? AND url = ?')
    .get(sectionId, b.nama, b.url);
  if (exists) return;
  db.prepare(
    `INSERT INTO buttons (section_id, nama, deskripsi, url, icon, image, warna, urutan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sectionId,
    b.nama,
    b.deskripsi || '',
    b.url,
    b.icon || 'bi-link-45deg',
    b.image || '',
    b.warna || 'blue',
    b.urutan != null ? b.urutan : index + 1
  );
}

function migrateAppsToButtons() {
  if (!tableExists('apps')) return;
  const count = db.prepare('SELECT COUNT(*) AS c FROM buttons').get().c;
  if (count > 0) return;
  const apps = db.prepare('SELECT * FROM apps ORDER BY urutan ASC, id ASC').all();
  if (!apps.length) return;
  apps.forEach((a, i) => {
    insertButton(
      {
        slug: CATEGORY_TO_SLUG[a.kategori] || 'sekolah',
        nama: a.nama,
        deskripsi: a.deskripsi,
        url: a.url,
        icon: a.icon,
        image: a.image,
        warna: a.theme || 'blue',
      },
      i
    );
  });
  console.log(`[seed] ${apps.length} aplikasi lama dimigrasi ke tombol`);
}

function seedButtons() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM buttons').get().c;
  if (count === 0) {
    const apps = readSeed('aplikasi.json');
    apps.forEach((a, i) => {
      insertButton(
        {
          slug: CATEGORY_TO_SLUG[a.kategori] || 'sekolah',
          nama: a.nama,
          deskripsi: a.deskripsi,
          url: a.url,
          icon: a.icon,
          image: a.image,
          warna: a.theme || 'blue',
        },
        i
      );
    });
    if (apps.length) console.log(`[seed] ${apps.length} tombol diimpor dari aplikasi.json`);
  }
  EXTRA_BUTTONS.forEach((b, i) => insertButton(b, 100 + i));
}

function seedSocials() {
  if (db.prepare('SELECT COUNT(*) AS c FROM social_links').get().c > 0) return;
  const insert = db.prepare(
    'INSERT INTO social_links (nama, url, icon, warna, urutan) VALUES (?, ?, ?, ?, ?)'
  );
  DEFAULT_SOCIALS.forEach((s) => insert.run(s.nama, s.url, s.icon, s.warna, s.urutan));
}

function seedKalenderFromJson() {
  if (db.prepare('SELECT COUNT(*) AS c FROM kalender').get().c > 0) return;
  const items = readSeed('kalender.json');
  if (!items.length) return;
  const insert = db.prepare('INSERT INTO kalender (tanggal, tanggal_selesai, kegiatan, keterangan, urutan) VALUES (?, ?, ?, ?, ?)');
  db.transaction((rows) => {
    rows.forEach((k, i) => insert.run(k.tanggal, k.tanggal_selesai || '', k.kegiatan || '', k.keterangan || '', i + 1));
  })(items);
  console.log(`[seed] ${items.length} agenda diimpor dari kalender.json`);
}

function seedGuruFromJson() {
  if (db.prepare('SELECT COUNT(*) AS c FROM guru').get().c > 0) return;
  const items = readSeed('guru.json');
  if (!items.length) return;
  const insert = db.prepare('INSERT INTO guru (nama, mapel, jabatan, urutan) VALUES (?, ?, ?, ?)');
  db.transaction((rows) => {
    rows.forEach((g, i) => insert.run(g.nama || '', g.mapel || '', g.jabatan || '', i + 1));
  })(items);
  console.log(`[seed] ${items.length} guru diimpor dari guru.json`);
}

function seedSources() {
  const insert = db.prepare(
    `INSERT INTO sources (key, nama, tipe, url, config, aktif, cache_ttl)
     VALUES (?, ?, ?, ?, ?, 1, 21600)
     ON CONFLICT(key) DO NOTHING`
  );
  for (const s of DEFAULT_SOURCES) insert.run(s.key, s.nama, s.tipe, s.url, JSON.stringify(s.config));
}

function buildBlockConfig(tipe, settings) {
  const base = Object.assign({}, DEFAULT_BLOCK_CONFIG[tipe] || {});
  const map = LEGACY_CONFIG_MAP[tipe] || [];
  for (const [key, settingKey, kind] of map) {
    const raw = settings[settingKey];
    if (raw === undefined || raw === null || raw === '') continue;
    base[key] = kind === 'json' ? parseJson(raw, base[key]) : raw;
  }
  return base;
}

function legacyBlockActive(tipe, settings) {
  if (tipe === 'banner' && settings.banner_enabled === '0') return 0;
  if (tipe === 'location' && settings.location_enabled === '0') return 0;
  return 1;
}

function seedPageBlocks() {
  const settings = getSettings();
  const insert = db.prepare(
    `INSERT INTO sections (slug, judul, subjudul, gaya, tipe, ikon, warna, urutan, tampil_judul, aktif, config)
     VALUES (@slug, @judul, '', 'grid', @tipe, '', 'blue', @urutan, @tampil_judul, @aktif, @config)
     ON CONFLICT(slug) DO NOTHING`
  );
  for (const b of PAGE_BLOCKS) {
    insert.run({
      slug: b.slug,
      judul: b.judul,
      tipe: b.tipe,
      urutan: b.urutan,
      tampil_judul: b.tampil_judul,
      aktif: legacyBlockActive(b.tipe, settings),
      config: JSON.stringify(buildBlockConfig(b.tipe, settings)),
    });
  }
}

function renumberLayout() {
  if (db.prepare("SELECT value FROM settings WHERE key = 'layout_migrated'").get()) return;
  const apps = db.prepare("SELECT id FROM sections WHERE tipe = 'apps' ORDER BY urutan ASC, id ASC").all();
  const update = db.prepare('UPDATE sections SET urutan = ? WHERE id = ?');
  db.transaction(() => {
    apps.forEach((row, i) => update.run(40 + i, row.id));
  })();
  setSetting('layout_migrated', '1');
}

function cleanupLegacySettings() {
  const remove = db.prepare('DELETE FROM settings WHERE key = ?');
  db.transaction(() => {
    for (const key of LEGACY_SETTINGS) remove.run(key);
  })();
}

function seedUsers() {
  if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c > 0) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'dwisma123';
  db.prepare(
    "INSERT INTO users (username, password_hash, nama, role) VALUES (?, ?, 'Administrator', 'admin')"
  ).run(username, bcrypt.hashSync(password, 10));
  console.log(`[seed] Akun admin dibuat: ${username}`);
}

function seed() {
  seedSettings();
  migrateSystemPrompt();
  seedSections();
  migrateAppsToButtons();
  seedButtons();
  seedSocials();
  seedKalenderFromJson();
  seedGuruFromJson();
  seedSources();
  seedPageBlocks();
  renumberLayout();
  cleanupLegacySettings();
  seedUsers();
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value == null ? '' : String(value));
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getBlocksWithButtons() {
  const blocks = db.prepare('SELECT * FROM sections WHERE aktif = 1 ORDER BY urutan ASC, id ASC').all();
  const stmt = db.prepare('SELECT * FROM buttons WHERE section_id = ? AND aktif = 1 ORDER BY urutan ASC, id ASC');
  return blocks.map((b) => ({ ...b, config: parseJson(b.config, {}), buttons: stmt.all(b.id) }));
}

function getSocials() {
  return db.prepare('SELECT * FROM social_links WHERE aktif = 1 ORDER BY urutan ASC, id ASC').all();
}

function getSourceByKey(key) {
  const row = db.prepare('SELECT * FROM sources WHERE key = ?').get(key);
  if (!row) return null;
  row.config = parseJson(row.config, {});
  row.parsed = row.cache_json ? parseJson(row.cache_json, null) : null;
  return row;
}

function saveSourceCache(id, data) {
  db.prepare('UPDATE sources SET cache_json = ?, last_fetch = ? WHERE id = ?').run(
    JSON.stringify(data),
    Date.now(),
    id
  );
}

migrate();
seed();

module.exports = {
  db,
  DATA_DIR,
  SEED_DIR,
  migrate,
  getSettings,
  setSetting,
  parseJson,
  getBlocksWithButtons,
  getSocials,
  getSourceByKey,
  saveSourceCache,
  BLOCK_TYPES,
  DEFAULT_BLOCK_CONFIG,
};
