const axios = require('axios');
const cheerio = require('cheerio');
const { getSourceByKey, saveSourceCache } = require('../db');

const USER_AGENT = 'Mozilla/5.0 (compatible; DwismaBot/1.0)';

async function fetchHtml(url, timeout = 15000) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout,
  });
  return data;
}

function resolveUrl(href, base) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function text($, scope, selector) {
  if (!selector) return '';
  const el = selector.startsWith('>') ? scope.find(selector) : scope.find(selector);
  return el.first().text().replace(/\s+/g, ' ').trim();
}

function scrapeList($, source) {
  const cfg = source.config || {};
  const items = [];
  const limit = Number(cfg.limit) || 50;
  $(cfg.item || '').each((_, el) => {
    if (items.length >= limit) return false;
    const $el = $(el);
    const title = text($, $el, cfg.title) || $el.find('h3,h2,h4').first().text().trim();
    if (!title) return;
    const linkSel = cfg.link || '> a';
    const rawLink = $el.find(linkSel).attr('href') || $el.find('a').first().attr('href') || '';
    const imgSel = cfg.img || 'img';
    const rawImg = $el.find(imgSel).attr('src') || ($el.find('img').first().attr('src') || '');
    items.push({
      title,
      date: text($, $el, cfg.date),
      excerpt: text($, $el, cfg.excerpt),
      link: resolveUrl(rawLink, source.url),
      img: resolveUrl(rawImg, source.url),
    });
  });
  return items;
}

function scrapePairs($, source) {
  const cfg = source.config || {};
  const namePrefix = cfg.namePrefix || '';
  const valuePrefix = cfg.valuePrefix || '';
  const result = [];
  $(cfg.item || '').each((_, el) => {
    const $el = $(el);
    const raw = $el.text().trim();
    if (namePrefix && !raw.startsWith(namePrefix)) return;
    const nama = namePrefix ? raw.replace(namePrefix, '').trim() : raw;
    const next = $el.next('p');
    const tugas = next.length
      ? next.text().replace(valuePrefix, '').replace(/\s+/g, ' ').trim()
      : '';
    if (nama) result.push({ nama, tugas });
  });
  return result;
}

function scrapeTables($, source) {
  const cfg = source.config || {};
  const rowSel = cfg.row || 'table tr';
  const keyIndex = Number(cfg.keyIndex) || 1;
  const valueIndex = Number(cfg.valueIndex) || 3;

  const readRows = (scope) => {
    const data = {};
    scope.find(rowSel).each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length > Math.max(keyIndex, valueIndex)) {
        const key = $(cells[keyIndex]).text().trim();
        const val = $(cells[valueIndex]).text().trim();
        if (key && val) data[key] = val;
      }
    });
    return data;
  };

  const profile = readRows($('body'));
  const tabs = {};
  const tabSel = cfg.tabContainer || '.tabby-tab';
  const labelSel = cfg.tabLabel || 'label';
  $(tabSel).each((_, el) => {
    const $el = $(el);
    const label = $el.find(labelSel).text().trim();
    if (label) tabs[label] = readRows($el);
  });

  return { profile, tabs };
}

async function scrapeWebsite($, source) {
  const cfg = source.config || {};
  const contactEmails = [];
  const contactPhones = [];
  $(cfg.contactBox || '.box_kontak_umum .alamat li').each((_, el) => {
    const line = $(el).text().trim();
    if (line.includes('@')) contactEmails.push(line.replace(/.*?\s/, ''));
    else if (/^\d/.test(line)) contactPhones.push(line.replace(/.*?\s/, ''));
  });

  const socialMedia = {};
  $(cfg.social || '.icon-sosmed a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const icon = $(el).find('li i').attr('class') || '';
    if (href) socialMedia[icon.replace('fa fa-', '')] = href;
  });

  let tentang = '';
  if (cfg.tentangUrl) {
    try {
      const html2 = await fetchHtml(cfg.tentangUrl, 15000);
      tentang = cheerio.load(html2)(cfg.tentang || '.img-ckeditor').text().replace(/\s+/g, ' ').trim();
    } catch {
      /* abaikan */
    }
  }

  let kepalaSekolah = '';
  const kepalaText = $(cfg.kepala || '.pricing-text').text().trim();
  const regex = new RegExp(cfg.kepalaRegex || 'nama saya (.+?)Saya adalah', 'i');
  const match = kepalaText.match(regex);
  if (match) kepalaSekolah = match[1].replace(/\s+/g, ' ').trim();

  return {
    tagline: $(cfg.tagline || '.tagline').first().text().trim(),
    contact: { email: contactEmails, phone: contactPhones },
    socialMedia,
    tentang,
    kepalaSekolah,
    sumber: source.url,
  };
}

async function scrapeSource(source) {
  const html = await fetchHtml(source.url);
  const $ = cheerio.load(html);
  switch (source.tipe) {
    case 'list':
      return scrapeList($, source);
    case 'pairs':
      return scrapePairs($, source);
    case 'tables':
      return scrapeTables($, source);
    case 'website':
      return scrapeWebsite($, source);
    default:
      throw new Error(`Tipe sumber tidak dikenal: ${source.tipe}`);
  }
}

async function getSourceData(key, { force = false } = {}) {
  const source = getSourceByKey(key);
  if (!source || !source.aktif) return null;

  const fresh = source.parsed && Date.now() - source.last_fetch < source.cache_ttl * 1000;
  if (fresh && !force) return source.parsed;

  try {
    const data = await scrapeSource(source);
    saveSourceCache(source.id, data);
    return data;
  } catch (err) {
    if (source.parsed) return source.parsed; // fallback ke cache lama
    throw err;
  }
}

module.exports = { fetchHtml, scrapeSource, getSourceData };
