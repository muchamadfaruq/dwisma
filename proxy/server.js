const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BERITA_URL = 'https://sman2mengwi.sch.id/berita';
const API_KEY = process.env.GOOGLE_API_KEY;
const DATA_DIR = process.env.DATA_DIR || '/data';
const PROFIL_URL = 'https://referensi.data.kemendikdasmen.go.id/tabs.php?npsn=50101684';

let cachedProfile = null;
let profileCacheTime = 0;
const PROFILE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 jam

let cachedWebsite = null;
let websiteCacheTime = 0;
const WEBSITE_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedWakasek = null;
let wakasekCacheTime = 0;
const WAKASEK_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedPrestasi = null;
let prestasiCacheTime = 0;
const PRESTASI_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedPengumuman = null;
let pengumumanCacheTime = 0;
const PENGUMUMAN_CACHE_TTL = 6 * 60 * 60 * 1000;

app.use(express.json());

app.get('/api/berita', async (req, res) => {
  try {
    const { data: html } = await axios.get(BERITA_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const berita = [];

    $('.list-berita').each((_, el) => {
      const $el = $(el);
      const link = $el.find('> a').attr('href') || '';
      const img = $el.find('> a img').attr('src') || '';
      const title = $el.find('h3').first().text().trim();
      const date = $el.find('.date-upload').text().replace(/\s+/g, ' ').trim();
      const excerpt = $el.find('> div > div p').last().text().trim();

      if (title) {
        berita.push({ title, date, excerpt, link, img });
      }
    });

    res.json({ success: true, data: berita });
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ success: false, message: 'Gagal mengambil berita' });
  }
});

async function fetchSchoolProfile() {
  const now = Date.now();
  if (cachedProfile && (now - profileCacheTime) < PROFILE_CACHE_TTL) {
    return cachedProfile;
  }

  try {
    const { data: html } = await axios.get(PROFIL_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const profile = {};

    $('table tr').each((_, el) => {
      const $el = $(el);
      const cells = $el.find('td');
      if (cells.length >= 4) {
        const label = $(cells[1]).text().trim();
        const value = $(cells[3]).text().trim();
        if (label && value) {
          profile[label] = value;
        }
      }
    });

    // Ambil dari tab titles juga untuk struktur yang lebih jelas
    const tabs = {};
    $('.tabby-tab').each((_, el) => {
      const $el = $(el);
      const label = $el.find('label').text().trim();
      if (label) {
        const data = {};
        $el.find('table tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          if (cells.length >= 4) {
            const key = $(cells[1]).text().trim();
            const val = $(cells[3]).text().trim();
            if (key && val) {
              data[key] = val;
            }
          }
        });
        tabs[label] = data;
      }
    });

    const result = { profile, tabs };
    cachedProfile = result;
    profileCacheTime = now;
    return result;
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    if (cachedProfile) return cachedProfile;
    return null;
  }
}

async function fetchSchoolWebsite() {
  const now = Date.now();
  if (cachedWebsite && (now - websiteCacheTime) < WEBSITE_CACHE_TTL) {
    return cachedWebsite;
  }

  try {
    const { data: html } = await axios.get('https://sman2mengwi.sch.id/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });
    const $ = cheerio.load(html);

    const tagline = $('.tagline').first().text().trim() || '';
    const contactEmails = [];
    const contactPhones = [];
    const socialMedia = {};
    $('.box_kontak_umum .alamat li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('@')) contactEmails.push(text.replace(/.*?\s/, ''));
      else if (text.match(/^\d/)) contactPhones.push(text.replace(/.*?\s/, ''));
    });
    $('.icon-sosmed a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const icon = $(el).find('li i').attr('class') || '';
      if (href) socialMedia[icon.replace('fa fa-', '')] = href;
    });

    // Tentang sekolah page
    let tentang = '';
    try {
      const { data: html2 } = await axios.get('https://sman2mengwi.sch.id/index.php/tentang-sekolah', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
        timeout: 15000,
      });
      const $$ = cheerio.load(html2);
      tentang = $$('.img-ckeditor').text().replace(/\s+/g, ' ').trim();
    } catch (e) {
      // abaikan
    }

    let kepalaSekolah = '';
    const kepalaText = $('.pricing-text').text().trim();
    const match = kepalaText.match(/nama saya (.+?)Saya adalah/i);
    if (match) kepalaSekolah = match[1].replace(/\s+/g, ' ').trim();

    const result = {
      tagline,
      contact: { email: contactEmails, phone: contactPhones },
      socialMedia,
      tentang,
      kepalaSekolah,
      sumber: 'https://sman2mengwi.sch.id/',
    };
    cachedWebsite = result;
    websiteCacheTime = now;
    return result;
  } catch (err) {
    console.error('Website fetch error:', err.message);
    if (cachedWebsite) return cachedWebsite;
    return null;
  }
}

app.get('/api/profil-website', async (req, res) => {
  try {
    const data = await fetchSchoolWebsite();
    if (!data) {
      return res.status(502).json({ success: false, message: 'Gagal mengambil data website sekolah' });
    }
    res.json({ success: true, data, sumber: 'https://sman2mengwi.sch.id/' });
  } catch (err) {
    console.error('Website endpoint error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal memuat data website' });
  }
});

async function fetchWakasek() {
  const now = Date.now();
  if (cachedWakasek && (now - wakasekCacheTime) < WAKASEK_CACHE_TTL) {
    return cachedWakasek;
  }
  try {
    const { data: html } = await axios.get('https://sman2mengwi.sch.id/wakasek', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    const wakasek = [];
    $('.fh5co-trainer section.img-ckeditor p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.startsWith('Nama :')) {
        const nama = text.replace('Nama :', '').trim();
        const tugasEl = $(el).next('p');
        const tugas = tugasEl.length ? tugasEl.text().replace('Tugas :', '').trim() : '';
        if (nama) wakasek.push({ nama, tugas });
      }
    });
    cachedWakasek = wakasek;
    wakasekCacheTime = now;
    return wakasek;
  } catch (err) {
    console.error('Wakasek fetch error:', err.message);
    if (cachedWakasek) return cachedWakasek;
    return [];
  }
}

async function fetchSchoolPrestasi() {
  const now = Date.now();
  if (cachedPrestasi && (now - prestasiCacheTime) < PRESTASI_CACHE_TTL) {
    return cachedPrestasi;
  }
  try {
    const { data: html } = await axios.get('https://sman2mengwi.sch.id/prestasi', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    const prestasi = [];
    $('.list-berita').each((_, el) => {
      const $el = $(el);
      const title = $el.find('h3').first().text().trim();
      const date = $el.find('.date-upload').text().replace(/\s+/g, ' ').trim();
      const excerpt = $el.find('p').first().text().trim();
      if (title) prestasi.push({ title, date, excerpt });
    });
    const result = prestasi.slice(0, 10);
    cachedPrestasi = result;
    prestasiCacheTime = now;
    return result;
  } catch (err) {
    console.error('Prestasi fetch error:', err.message);
    if (cachedPrestasi) return cachedPrestasi;
    return [];
  }
}

async function fetchSchoolPengumuman() {
  const now = Date.now();
  if (cachedPengumuman && (now - pengumumanCacheTime) < PENGUMUMAN_CACHE_TTL) {
    return cachedPengumuman;
  }
  try {
    const { data: html } = await axios.get('https://sman2mengwi.sch.id/pengumuman', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    const pengumuman = [];
    $('.list-berita').each((_, el) => {
      const $el = $(el);
      const title = $el.find('h3').first().text().trim();
      const date = $el.find('.date-upload').text().replace(/\s+/g, ' ').trim();
      if (title) pengumuman.push({ title, date });
    });
    cachedPengumuman = pengumuman;
    pengumumanCacheTime = now;
    return pengumuman;
  } catch (err) {
    console.error('Pengumuman fetch error:', err.message);
    if (cachedPengumuman) return cachedPengumuman;
    return [];
  }
}

app.get('/api/wakasek', async (req, res) => {
  try {
    const data = await fetchWakasek();
    res.json({ success: true, data, sumber: 'https://sman2mengwi.sch.id/wakasek' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat data wakasek' });
  }
});

app.get('/api/prestasi', async (req, res) => {
  try {
    const data = await fetchSchoolPrestasi();
    res.json({ success: true, data, sumber: 'https://sman2mengwi.sch.id/prestasi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat prestasi' });
  }
});

app.get('/api/pengumuman', async (req, res) => {
  try {
    const data = await fetchSchoolPengumuman();
    res.json({ success: true, data, sumber: 'https://sman2mengwi.sch.id/pengumuman' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat pengumuman' });
  }
});

app.get('/api/profil-sekolah', async (req, res) => {
  try {
    const data = await fetchSchoolProfile();
    if (!data) {
      return res.status(502).json({ success: false, message: 'Gagal mengambil data profil sekolah' });
    }
    res.json({ success: true, data, sumber: 'https://sekolah.data.kemendikdasmen.go.id/profil-sekolah/0BEE04E0-B032-4760-B41D-DB5A5C9E72E7' });
  } catch (err) {
    console.error('Profil endpoint error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal memuat profil sekolah' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
    }

    let schoolData = '';

    try {
      const profil = await fetchSchoolProfile();
      if (profil?.tabs) {
        schoolData += '\n--- DATA DARI referensi.data.kemendikdasmen.go.id ---\n';
        for (const [tab, data] of Object.entries(profil.tabs)) {
          schoolData += `\n${tab}:\n`;
          for (const [key, val] of Object.entries(data)) {
            if (val && val !== '-') schoolData += `- ${key}: ${val}\n`;
          }
        }
      }
    } catch (e) {}

    try {
      const website = await fetchSchoolWebsite();
      if (website) {
        schoolData += '\n--- DATA DARI sman2mengwi.sch.id ---\n';
        if (website.tagline) schoolData += `- Tagline: ${website.tagline}\n`;
        if (website.kepalaSekolah) schoolData += `- Kepala Sekolah: ${website.kepalaSekolah}\n`;
        if (website.contact?.email?.length) schoolData += `- Email: ${website.contact.email.join(', ')}\n`;
        if (website.contact?.phone?.length) schoolData += `- Telepon: ${website.contact.phone.join(', ')}\n`;
        if (website.socialMedia && Object.keys(website.socialMedia).length) {
          schoolData += '- Media Sosial:\n';
          for (const [platform, url] of Object.entries(website.socialMedia)) {
            schoolData += `  - ${platform}: ${url}\n`;
          }
        }
        if (website.tentang) {
          const clean = website.tentang.replace(/\s+/g, ' ').trim();
          schoolData += `- Tentang Sekolah: ${clean.substring(0, 800)}...\n`;
        }
      }
    } catch (e) {}

    try {
      const prestasi = await fetchSchoolPrestasi();
      if (prestasi?.length) {
        schoolData += '\n--- PRESTASI SEKOLAH (dari sman2mengwi.sch.id/prestasi) ---\n';
        prestasi.slice(0, 5).forEach((p, i) => {
          schoolData += `${i + 1}. ${p.title} (${p.date}) - ${p.excerpt?.substring(0, 100)}\n`;
        });
      }
    } catch (e) {}

    try {
      const pengumuman = await fetchSchoolPengumuman();
      if (pengumuman?.length) {
        schoolData += '\n--- PENGUMUMAN (dari sman2mengwi.sch.id/pengumuman) ---\n';
        pengumuman.forEach((p, i) => {
          schoolData += `${i + 1}. ${p.title} (${p.date})\n`;
        });
      }
    } catch (e) {}

    try {
      const kalenderPath = path.join(DATA_DIR, 'kalender.json');
      if (fs.existsSync(kalenderPath)) {
        const kalender = JSON.parse(fs.readFileSync(kalenderPath, 'utf-8'));
        if (kalender?.length) {
          schoolData += '\n--- KALENDER AKADEMIK (TA 2026/2027) ---\n';
          kalender.slice(0, 15).forEach((k) => {
            schoolData += `- ${k.tanggal}: ${k.kegiatan} (${k.keterangan})\n`;
          });
        }
      }
    } catch (e) {}

    try {
      const wakasek = await fetchWakasek();
      if (wakasek?.length) {
        schoolData += '\n--- WAKASEK (dari sman2mengwi.sch.id/wakasek) ---\n';
        wakasek.forEach((w) => {
          schoolData += `- ${w.nama}: ${w.tugas}\n`;
        });
      }
    } catch (e) {}

    try {
      const appPath = path.join(DATA_DIR, 'aplikasi.json');
      if (fs.existsSync(appPath)) {
        const apps = JSON.parse(fs.readFileSync(appPath, 'utf-8'));
        if (apps?.length) {
          schoolData += '\n--- APLIKASI SEKOLAH (dari dwisma.id) ---\n';
          apps.forEach((a) => {
            schoolData += `- ${a.nama}: ${a.deskripsi} (${a.url}) [${a.kategori}]\n`;
          });
        }
      }
    } catch (e) {}

    try {
      const guruPath = path.join(DATA_DIR, 'guru.json');
      if (fs.existsSync(guruPath)) {
        const guru = JSON.parse(fs.readFileSync(guruPath, 'utf-8'));
        if (guru?.length) {
          schoolData += '\n--- GURU & MATA PELAJARAN ---\n';
          guru.forEach((g) => {
            const mapel = g.mapel || '(mapel belum diisi)';
            const jabatan = g.jabatan ? ` [${g.jabatan}]` : '';
            schoolData += `- ${g.nama}: ${mapel}${jabatan}\n`;
          });
        }
      }
    } catch (e) {}

    try {
      const { data: html } = await axios.get(BERITA_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DwismaBot/1.0)' },
        timeout: 8000,
      });
      const $ = cheerio.load(html);
      const berita = [];
      $('.list-berita').each((_, el) => {
        const $el = $(el);
        const title = $el.find('h3').first().text().trim();
        const date = $el.find('.date-upload').text().replace(/\s+/g, ' ').trim();
        if (title) berita.push({ title, date });
      });
      if (berita.length) {
        schoolData += '\n--- BERITA TERBARU (dari sman2mengwi.sch.id/berita) ---\n';
        berita.slice(0, 5).forEach((b) => {
          schoolData += `- ${b.title} (${b.date})\n`;
        });
      }
    } catch (e) {}

    const systemPrompt = 'Kamu adalah asisten AI untuk website SMA Negeri 2 Mengwi (Dwisma). Jawab pertanyaan dengan ramah, informatif, dan STRUKTUR YANG RAPIH. Gunakan format: untuk daftar gunakan bullet point sederhana (-), untuk penekanan gunakan **teks tebal**, antar bagian beri jarak 1 baris kosong. JANGAN gunakan heading markdown (###, ##). JANGAN gunakan blockquote atau garis pemisah. Cukup jawab langsung dengan paragraf singkat dan bullet point jika perlu. Gunakan data referensi berikut untuk menjawab pertanyaan tentang identitas sekolah, visi misi, akreditasi, kontak, prestasi, kalender akademik, berita terbaru, dan informasi resmi lainnya. Jika ditanya di luar konteks sekolah, kamu tetap bisa menjawab secara umum. Gunakan bahasa Indonesia.' + schoolData;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nPertanyaan: ${message}` }],
          },
        ],
      },
      { timeout: 30000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, tidak bisa merespon saat ini.';
    res.json({ success: true, response: text });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(502).json({ success: false, message: 'Gagal menghubungi AI' });
  }
});

app.get('/api/kalender', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'kalender.json');
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: [] });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Kalender error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal membaca kalender' });
  }
});

app.get('/api/guru', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'guru.json');
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: [] });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Guru error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal membaca data guru' });
  }
});

app.get('/api/aplikasi', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'aplikasi.json');
    if (!fs.existsSync(filePath)) {
      return res.json({ success: true, data: [] });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Aplikasi error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal membaca data aplikasi' });
  }
});

app.listen(PORT, () => {
  console.log(`Dwisma proxy running on port ${PORT}`);
});
