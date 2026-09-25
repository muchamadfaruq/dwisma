const { db, getSettings } = require('../db');
const { getSourceData } = require('./scraper');

async function collectParts() {
  const parts = [];
  const push = (label, items, error) => {
    parts.push({
      label,
      count: Array.isArray(items) ? items.length : 0,
      items: Array.isArray(items) ? items.slice(0, 200) : [],
      error: error || null,
    });
  };

  try {
    const apps = db
      .prepare(
        `SELECT b.nama, b.deskripsi, b.url, s.judul AS kategori
         FROM buttons b JOIN sections s ON s.id = b.section_id
         WHERE b.aktif = 1 AND s.aktif = 1
         ORDER BY s.urutan, b.urutan`
      )
      .all();
    push('Aplikasi Sekolah', apps.map((a) => `- ${a.nama}: ${a.deskripsi} (${a.url}) [${a.kategori}]`));
  } catch (e) {
    push('Aplikasi Sekolah', [], e.message);
  }

  try {
    const guru = db.prepare('SELECT nama, mapel, jabatan FROM guru ORDER BY urutan').all();
    push(
      'Guru & Mata Pelajaran',
      guru.map((g) => `- ${g.nama}: ${g.mapel || '(mapel belum diisi)'}${g.jabatan ? ` [${g.jabatan}]` : ''}`)
    );
  } catch (e) {
    push('Guru & Mata Pelajaran', [], e.message);
  }

  try {
    const kalender = db.prepare('SELECT tanggal, kegiatan, keterangan FROM kalender ORDER BY tanggal').all();
    push('Kalender Akademik', kalender.map((k) => `- ${k.tanggal}: ${k.kegiatan} (${k.keterangan})`));
  } catch (e) {
    push('Kalender Akademik', [], e.message);
  }

  const scraped = [
    ['berita', 'Berita Terbaru', (d) => d.slice(0, 5).map((b) => `- ${b.title} (${b.date})`)],
    ['pengumuman', 'Pengumuman', (d) => d.map((p) => `- ${p.title} (${p.date})`)],
    ['prestasi', 'Prestasi', (d) => d.slice(0, 5).map((p) => `- ${p.title} (${p.date})`)],
    ['wakasek', 'Wakasek', (d) => d.map((w) => `- ${w.nama}: ${w.tugas}`)],
  ];
  for (const [key, label, fmt] of scraped) {
    try {
      const data = await getSourceData(key);
      push(label, Array.isArray(data) ? fmt(data) : []);
    } catch (e) {
      push(label, [], e.message);
    }
  }

  try {
    const profil = await getSourceData('profil_sekolah');
    if (profil && profil.tabs) {
      const items = [];
      for (const [tab, data] of Object.entries(profil.tabs)) {
        items.push(`## ${tab}`);
        for (const [k, v] of Object.entries(data)) {
          if (v && v !== '-') items.push(`- ${k}: ${v}`);
        }
      }
      push('Profil Sekolah (Referensi Kemendikdasmen)', items);
    } else {
      push('Profil Sekolah (Referensi Kemendikdasmen)', []);
    }
  } catch (e) {
    push('Profil Sekolah (Referensi Kemendikdasmen)', [], e.message);
  }

  try {
    const website = await getSourceData('profil_website');
    const items = [];
    if (website) {
      if (website.tagline) items.push(`- Tagline: ${website.tagline}`);
      if (website.kepalaSekolah) items.push(`- Kepala Sekolah: ${website.kepalaSekolah}`);
      if (website.contact?.email?.length) items.push(`- Email: ${website.contact.email.join(', ')}`);
      if (website.contact?.phone?.length) items.push(`- Telepon: ${website.contact.phone.join(', ')}`);
      if (website.tentang) items.push(`- Tentang: ${website.tentang.substring(0, 800)}`);
    }
    push('Profil Website Sekolah', items);
  } catch (e) {
    push('Profil Website Sekolah', [], e.message);
  }

  return parts;
}

async function buildAIContext() {
  const settings = getSettings();
  const systemPrompt = settings.ai_system_prompt || '';
  const parts = await collectParts();

  let context = systemPrompt;
  for (const part of parts) {
    if (part.items && part.items.length) {
      context += `\n--- ${part.label.toUpperCase()} ---\n${part.items.join('\n')}\n`;
    }
  }

  return { systemPrompt, parts, context };
}

module.exports = { collectParts, buildAIContext };
