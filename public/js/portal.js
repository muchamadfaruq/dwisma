(function () {
  'use strict';

  var THEMES = {
    blue: ['#3b82f6', '#6366f1'],
    teal: ['#14b8a6', '#06b6d4'],
    violet: ['#8b5cf6', '#d946ef'],
    emerald: ['#10b981', '#14b8a6'],
    rose: ['#f43f5e', '#ec4899'],
    amber: ['#f59e0b', '#f97316'],
    cyan: ['#06b6d4', '#0ea5e9'],
    indigo: ['#6366f1', '#8b5cf6'],
    green: ['#22c55e', '#10b981'],
    red: ['#ef4444', '#f97316'],
    pink: ['#ec4899', '#f43f5e'],
    slate: ['#64748b', '#475569'],
  };

  var FALLBACK_IMG = '/img/Logo Dwisma.png';
  var CONTENT_CACHE = 'dwisma-content-v1';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeHref(url) {
    try {
      var u = new URL(url, window.location.origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    } catch (e) { }
    return '#';
  }

  function themePair(name) {
    return THEMES[name] || THEMES.blue;
  }

  function gradient(name, a1, a2) {
    var p = themePair(name);
    return 'linear-gradient(135deg,' + p[0] + (a1 || '') + ',' + p[1] + (a2 || '') + ')';
  }

  function initials(name) {
    var words = String(name || '').trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function mediaHtml(btn, color, opts) {
    opts = opts || {};
    if (btn.image) {
      return '<img src="' + esc(btn.image) + '" alt="' + esc(btn.nama) + '" loading="lazy" ' +
        'class="w-full h-full ' + (opts.fit || 'object-contain') + '" ' +
        'onerror="this.src=\'' + FALLBACK_IMG + '\'" />';
    }
    var icon = String(btn.icon || '').trim();
    if (icon && icon !== 'bi-link-45deg') {
      return '<i class="' + esc(icon) + ' ' + (opts.icon || 'text-3xl') + '" style="color:' + color + '"></i>';
    }
    return '<span class="font-black leading-none" style="color:' + color + ';font-size:' + (opts.ini || '1.4rem') + '">' +
      esc(initials(btn.nama)) + '</span>';
  }

  /* ================= NAV ================= */
  function navHtml(cfg) {
    var logos = Array.isArray(cfg.logos) ? cfg.logos : [];
    var logosHtml = logos.map(function (src, i) {
      var divider = i === 2 ? '<div class="h-6 w-[1px] bg-slate-300/80 self-center hidden sm:block"></div>' : '';
      var size = i >= 2 ? 'h-7 w-auto hidden sm:block' : 'h-10 w-10';
      return divider + '<img src="' + esc(src) + '" alt="Logo" class="' + size +
        ' object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />';
    }).join('');

    return '' +
      '<nav class="sticky top-0 z-50 glass-panel border-b border-white/60 shadow-sm transition-all duration-300">' +
      '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">' +
      '<div class="flex justify-between h-20 items-center">' +
      '<div class="flex-shrink-0 flex items-center gap-3 group">' +
      '<div class="flex items-center gap-2">' + logosHtml + '</div>' +
      '<span class="text-2xl font-black tracking-tighter ml-1">' +
      '<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">' + esc(cfg.brand_prefix || '') + '</span>' +
      '<span class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">' + esc(cfg.brand_suffix || '') + '</span>' +
      '</span></div>' +
      '<div class="flex items-center gap-2">' +
      '<a href="/admin" title="' + esc(cfg.login_label || 'Login Admin') + '" ' +
      'class="flex items-center gap-2 px-4 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">' +
      '<i class="bi bi-person-circle text-lg"></i><span class="hidden sm:inline">' + esc(cfg.login_label || 'Login Admin') + '</span></a>' +
      '<button id="dark-toggle" onclick="void 0" aria-label="Toggle Dark Mode" ' +
      'class="flex items-center justify-center w-10 h-10 rounded-full bg-white/60 border border-white hover:bg-white text-slate-600 hover:text-amber-500 shadow-sm transition-all duration-300">' +
      '<i id="dark-icon" class="bi bi-moon-fill text-lg"></i></button>' +
      '</div></div></div></nav>';
  }

  /* ================= HERO ================= */
  function heroHtml(cfg) {
    var badges = Array.isArray(cfg.badges) ? cfg.badges : [];
    var badgesHtml = badges.map(function (src, i) {
      var sep = i > 0 ? '<div class="h-5 w-[1px] bg-slate-300/80"></div>' : '';
      return sep + '<img src="' + esc(src) + '" alt="Logo" class="h-7 md:h-9 w-auto object-contain" />';
    }).join('');

    return '' +
      '<div class="text-center max-w-4xl mx-auto mb-20 relative">' +
      '<div class="flex justify-center mb-6 animate-fade-in-up"><div class="px-5 py-2.5 bg-white/70 backdrop-blur-md border border-white/80 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-3.5 hover:scale-105 transition-all duration-300">' + badgesHtml + '</div></div>' +
      '<div class="relative inline-block animate-float">' +
      '<div class="absolute inset-0 bg-blue-500/30 blur-[40px] rounded-full scale-150"></div>' +
      '<a href="' + safeHref(cfg.logo_url || cfg.official_url || '#') + '" target="_blank" rel="noopener" class="relative block hover:scale-110 transition-transform duration-500">' +
      '<img src="' + esc(cfg.logo || FALLBACK_IMG) + '" alt="' + esc(cfg.school || '') + '" class="w-36 md:w-44 mx-auto drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)] mb-8" /></a></div>' +
      '<p class="font-merriweather italic text-xl md:text-2xl text-slate-600 font-bold mb-2 animate-fade-in-up">' + esc(cfg.school || '') + '</p>' +
      '<h1 class="font-extrabold text-5xl md:text-7xl text-dwisma-dark mt-2 tracking-tight leading-[1.1] animate-fade-in-up delay-100 min-h-[110px] md:min-h-[150px]">' +
      '<span id="typed-text-1"></span><br class="hidden md:block" />' +
      '<span id="typed-text-2" class="text-gradient-animated bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-gradient pb-2 inline-block"></span><span id="cursor-main" class="animate-pulse font-light text-slate-800 ml-1">|</span></h1>' +
      '<p class="mt-4 text-base md:text-lg text-slate-600 font-bold h-[28px] animate-fade-in-up delay-200"><span id="typed-text-3"></span><span id="cursor-sub" class="hidden animate-pulse font-light text-slate-800 ml-1">|</span></p>' +
      '<p class="mt-8 text-lg md:text-xl text-slate-500 font-medium animate-fade-in-up delay-300">' +
      esc(cfg.official_prefix || '') + ' <a href="' + safeHref(cfg.official_url || '#') + '" target="_blank" rel="noopener" ' +
      'class="inline-flex items-center gap-1.5 px-4 py-1.5 ml-1 bg-white/60 border border-white rounded-full shadow-sm text-blue-600 hover:bg-blue-600 hover:text-white font-bold transition-all duration-300">' +
      esc(cfg.official_label || '') + ' <i class="bi bi-arrow-up-right text-sm"></i></a></p></div>';
  }

  /* ================= SECTION HEADERS ================= */
  function centeredHeader(judul, ikon, from, to) {
    var ic = ikon ? '<i class="' + esc(ikon) + ' text-transparent bg-clip-text bg-gradient-to-r ' + from + ' ' + to + ' mr-2"></i>' : '';
    return '<div class="flex items-center justify-center gap-4 mb-10">' +
      '<div class="h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent flex-grow max-w-xs"></div>' +
      '<h2 class="font-sans font-black text-slate-800 tracking-widest uppercase text-sm md:text-base px-8 py-2.5 bg-white/60 backdrop-blur border border-white shadow-sm rounded-full text-center">' + ic + esc(judul) + '</h2>' +
      '<div class="h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent flex-grow max-w-xs"></div></div>';
  }

  function barHeader(judul, warna) {
    return '<div class="flex items-center gap-4 mb-8">' +
      '<div class="w-2 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.15)]" style="background:' + gradient(warna) + '"></div>' +
      '<h2 class="font-black text-slate-800 text-2xl tracking-wide">' + esc(judul) + '</h2></div>';
  }

  /* ================= CARDS ================= */
  function gridCard(b) {
    var p = themePair(b.warna);
    return '<a href="' + safeHref(b.url) + '" target="_blank" rel="noopener" data-uptime="' + esc(b.uptime_url || '') + '" title="' + esc(b.deskripsi) + '" ' +
      'class="perf-card search-item group relative flex items-center gap-5 p-5 bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] shadow-glass hover:shadow-[0_20px_40px_-5px_rgba(59,130,246,0.35)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">' +
      '<div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style="background:linear-gradient(135deg,' + p[0] + '1a,' + p[1] + '0d)"></div>' +
      '<div class="relative rounded-2xl p-[2px] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-md" style="background:' + gradient(b.warna) + '">' +
      '<div class="w-14 h-14 bg-white rounded-[14px] flex items-center justify-center p-2.5 overflow-hidden">' + mediaHtml(b, p[0], { ini: '1.4rem', icon: 'text-3xl' }) + '</div></div>' +
      '<div class="relative flex-1 min-w-0">' +
      '<span class="block font-extrabold text-xl text-slate-800 truncate">' + esc(b.nama) + '</span>' +
      '<span class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate">' + esc(b.deskripsi || '') + '</span></div>' +
      '<div class="relative w-10 h-10 rounded-full bg-slate-100/80 border border-white shadow-sm flex items-center justify-center flex-shrink-0">' +
      '<i class="bi bi-arrow-right-short text-2xl text-slate-400 group-hover:translate-x-0.5 transition-all"></i></div></a>';
  }

  function listCard(b) {
    var p = themePair(b.warna);
    return '<a href="' + safeHref(b.url) + '" target="_blank" rel="noopener" data-uptime="' + esc(b.uptime_url || '') + '" style="--c:' + p[0] + '" ' +
      'class="perf-card search-item group flex items-center gap-5 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white shadow-sm hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300">' +
      '<div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-slate-100 overflow-hidden">' + mediaHtml(b, p[0], { ini: '1.2rem', icon: 'text-2xl' }) + '</div>' +
      '<span class="font-bold text-lg text-slate-700 flex-1 group-hover:text-[var(--c)] transition-colors">' + esc(b.nama) + '</span>' +
      '<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:' + p[0] + '1a"><i class="bi bi-chevron-right" style="color:' + p[0] + '"></i></div></a>';
  }

  function pillCard(b) {
    var p = themePair(b.warna);
    return '<a href="' + safeHref(b.url) + '" target="_blank" rel="noopener" data-uptime="' + esc(b.uptime_url || '') + '" title="' + esc(b.deskripsi || b.nama) + '" style="--c:' + p[0] + '" ' +
      'class="perf-card search-item group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm border border-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">' +
      '<div class="w-14 h-14 rounded-[14px] p-[2px] shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" style="background:' + gradient(b.warna) + '">' +
      '<div class="w-full h-full bg-white rounded-[12px] flex items-center justify-center p-1.5 overflow-hidden">' + mediaHtml(b, p[0], { ini: '1.4rem', icon: 'text-3xl' }) + '</div></div>' +
      '<span class="font-extrabold text-lg text-slate-700 group-hover:text-[var(--c)] transition-colors">' + esc(b.nama) + '</span></a>';
  }

  function pillSmallCard(b) {
    var p = themePair(b.warna);
    return '<a href="' + safeHref(b.url) + '" target="_blank" rel="noopener" data-uptime="' + esc(b.uptime_url || '') + '" title="' + esc(b.deskripsi || b.nama) + '" style="--c:' + p[0] + '" ' +
      'class="perf-card search-item group flex items-center justify-center gap-3 p-4 bg-white/60 backdrop-blur-sm border border-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">' +
      '<div class="w-10 h-10 rounded-full p-[2px] shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" style="background:' + gradient(b.warna) + '">' +
      '<div class="w-full h-full bg-white rounded-full flex items-center justify-center p-1.5 overflow-hidden">' + mediaHtml(b, p[0], { ini: '1rem', icon: 'text-xl' }) + '</div></div>' +
      '<span class="font-extrabold text-slate-700 group-hover:text-[var(--c)] transition-colors">' + esc(b.nama) + '</span></a>';
  }

  /* ================= APPS BLOCK ================= */
  function renderApps(block) {
    var buttons = (block.buttons || []).map(function (b) { return b; });
    if (block.gaya === 'grid') {
      return '<section class="perf-section search-section" data-apps-grid>' +
        (block.tampil_judul ? centeredHeader(block.judul, block.ikon || 'bi-grid-1x2-fill', 'from-blue-500', 'to-cyan-500') : '') +
        '<div class="status-summary text-center mb-8"></div>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">' +
        buttons.map(gridCard).join('') + '</div></section>';
    }
    if (block.gaya === 'list') {
      var p = themePair(block.warna);
      return '<section class="glass-panel p-8 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group search-section">' +
        '<div class="absolute -top-20 -right-20 w-64 h-64 blur-[60px] rounded-full" style="background:' + p[0] + '33"></div>' +
        '<h2 class="font-extrabold text-slate-800 text-2xl mb-8 flex items-center gap-4 relative z-10">' +
        '<div class="w-12 h-12 flex items-center justify-center text-white rounded-[1rem] shadow-lg" style="background:' + gradient(block.warna) + '"><i class="' + esc(block.ikon || 'bi-book-half') + ' text-xl"></i></div>' +
        esc(block.judul) + '</h2>' +
        '<div class="flex flex-col gap-4 relative z-10">' + buttons.map(listCard).join('') + '</div></section>';
    }
    if (block.gaya === 'pill') {
      return '<section class="search-section">' + (block.tampil_judul ? barHeader(block.judul, block.warna) : '') +
        '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">' + buttons.map(pillCard).join('') + '</div></section>';
    }
    return '<section class="search-section">' + (block.tampil_judul ? barHeader(block.judul, block.warna) : '') +
      '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">' + buttons.map(pillSmallCard).join('') + '</div></section>';
  }

  /* ================= STATIC BLOCKS ================= */
  function searchBarHtml(cfg) {
    return '<div class="relative max-w-lg mx-auto">' +
      '<i class="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"></i>' +
      '<input id="search-input" type="text" placeholder="' + esc(cfg.placeholder || 'Cari di portal...') + '" ' +
      'class="w-full pl-12 pr-12 py-3.5 rounded-full bg-white/60 backdrop-blur border border-white/80 text-slate-700 placeholder-slate-400 font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all shadow-sm" />' +
      '<button id="search-clear" class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-200/60 hover:bg-red-200 hover:text-red-500 text-slate-500 flex items-center justify-center transition-all text-sm"><i class="bi bi-x"></i></button></div>';
  }

  function emptyHtml() {
    return '<div id="search-empty" class="hidden flex-col items-center gap-3 py-12 text-slate-400 -mt-12">' +
      '<i class="bi bi-inbox text-5xl"></i><p class="font-bold text-lg">Tidak ditemukan</p><p class="text-sm">Coba kata kunci lain</p></div>';
  }

  function kalenderSectionHtml(block, cfg) {
    return '<section id="search-section-kalender" class="perf-section search-section">' +
      centeredHeader(block.judul || 'Kalender Akademik', block.ikon || 'bi-calendar-event', 'from-emerald-500', 'to-teal-500') +
      '<div id="kalender-list" data-limit="' + esc(cfg.limit || 3) + '" class="relative max-w-3xl mx-auto"><div class="text-center py-12 text-slate-400">' +
      '<i class="bi bi-calendar-week text-5xl block mb-4"></i><p class="font-semibold text-lg">Memuat kalender...</p></div></div></section>';
  }

  function beritaSectionHtml(block, cfg) {
    return '<section class="perf-section search-section" id="berita-section">' +
      centeredHeader(block.judul || 'Berita Terkini', block.ikon || 'bi-newspaper', 'from-blue-500', 'to-cyan-500') +
      '<div id="berita-grid" data-source="' + esc(cfg.source || 'berita') + '" data-limit="' + esc(cfg.limit || 12) + '" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>' +
      (cfg.link_url ? '<div class="text-center mt-8"><a href="' + safeHref(cfg.link_url) + '" target="_blank" rel="noopener" ' +
        'class="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300">' +
        '<i class="bi bi-arrow-up-right-circle-fill"></i> ' + esc(cfg.link_label || 'Lihat Semua') + '</a></div>' : '') + '</section>';
  }

  function bannerHtml(cfg) {
    return '<section class="perf-section text-center w-full"><a href="' + safeHref(cfg.url || '#') + '" target="_blank" rel="noopener" ' +
      'class="group relative block w-full bg-white/50 backdrop-blur-md border-2 border-white/80 rounded-[2.5rem] p-8 md:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_-10px_rgba(239,68,68,0.2)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">' +
      '<div class="absolute inset-0 opacity-20 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_200%] animate-gradient group-hover:opacity-40 transition-opacity duration-500"></div>' +
      '<div class="absolute inset-0 bg-white/40 backdrop-blur-md"></div>' +
      '<div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8">' +
      '<div class="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-5 border border-slate-100 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">' +
      '<img src="' + esc(cfg.logo || '') + '" loading="lazy" class="w-full h-full object-contain drop-shadow-md" alt="" /></div>' +
      '<div class="text-center md:text-left">' +
      '<p class="text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> ' + esc(cfg.label || '') + '</p>' +
      '<h2 class="font-black text-3xl md:text-5xl tracking-tight text-slate-800">' + esc(cfg.pre || '') + ' ' +
      '<span class="text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-500">' + esc(cfg.hi1 || '') + '</span> ' +
      '<span class="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-500">' + esc(cfg.hi2 || '') + '</span></h2></div>' +
      '<div class="hidden md:flex flex-1 justify-end"><div class="w-14 h-14 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-all"><i class="bi bi-arrow-right text-3xl text-slate-400 group-hover:text-white transition-colors"></i></div></div>' +
      '</div></a></section>';
  }

  function locationHtml(cfg) {
    return '<section id="search-section-lokasi" class="perf-section search-section">' +
      centeredHeader('Lokasi Sekolah', 'bi-geo-alt-fill', 'from-red-500', 'to-rose-500') +
      '<div class="max-w-4xl mx-auto glass-panel p-5 md:p-8 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden group">' +
      '<div class="relative z-10 flex flex-col gap-6">' +
      '<div class="w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden border border-slate-100 shadow-inner">' +
      '<iframe src="' + esc(cfg.map_embed || '') + '" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" class="w-full h-full"></iframe></div>' +
      '<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">' +
      '<div class="text-left"><h4 class="font-extrabold text-slate-800 text-lg">' + esc(cfg.title || '') + '</h4>' +
      '<p class="text-slate-500 font-bold text-sm mt-1"><i class="bi bi-map mr-1.5 text-red-500"></i> ' + esc(cfg.address || '') + '</p></div>' +
      '<a href="' + safeHref(cfg.directions_url || '#') + '" target="_blank" rel="noopener" ' +
      'class="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold rounded-full shadow-[0_10px_20px_-5px_rgba(239,68,68,0.3)] hover:scale-105 transition-all duration-300">' +
      '<i class="bi bi-box-arrow-up-right text-lg"></i> Petunjuk Arah</a></div></div></div></section>';
  }

  function htmlBlock(block, cfg) {
    return '<section class="perf-section search-section">' +
      (block.tampil_judul && block.judul ? centeredHeader(block.judul, block.ikon || 'bi-journal-text', 'from-slate-500', 'to-slate-700') : '') +
      '<div class="max-w-4xl mx-auto glass-panel p-6 md:p-10 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-slate-700 leading-relaxed">' +
      (cfg.konten || '') + '</div></section>';
  }

  function footerHtml(cfg, socials) {
    var logos = Array.isArray(cfg.logos) ? cfg.logos : [];
    var logosHtml = logos.map(function (src) {
      return '<div class="p-3 bg-white rounded-2xl shadow-md border border-slate-100"><img src="' + esc(src) +
        '" alt="Logo" class="h-14 w-auto object-contain" /></div>';
    }).join('');
    var sosialHtml = (socials || []).map(function (soc) {
      var p = themePair(soc.warna);
      return '<a href="' + safeHref(soc.url) + '" target="_blank" rel="noopener" style="--c:' + p[0] + '" ' +
        'class="group flex items-center gap-2.5 px-6 py-3 bg-white/70 backdrop-blur hover:bg-white rounded-full text-slate-600 hover:text-[var(--c)] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 border border-white">' +
        '<i class="' + esc(soc.icon || 'bi-link-45deg') + ' text-xl group-hover:scale-110 transition-transform"></i>' +
        '<span class="font-extrabold text-sm">' + esc(soc.nama) + '</span></a>';
    }).join('');

    return '<footer class="mt-auto relative bg-white/30 backdrop-blur-2xl border-t border-white/60">' +
      '<div class="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent pointer-events-none"></div>' +
      '<div class="max-w-7xl mx-auto px-6 py-12 relative z-10">' +
      '<div class="flex flex-col lg:flex-row justify-between items-center gap-10">' +
      '<div class="flex flex-col sm:flex-row items-center gap-5">' +
      '<div class="flex items-center gap-4">' + logosHtml + '</div>' +
      '<div class="text-center sm:text-left"><h3 class="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600">' + esc(cfg.brand_title || '') + '</h3>' +
      '<p class="text-slate-500 font-bold text-sm mt-0.5">' + esc(cfg.brand_sub || '') + '</p></div></div>' +
      '<div class="flex flex-wrap justify-center gap-4">' + sosialHtml + '</div></div>' +
      '<div class="mt-12 pt-8 border-t border-white/80 flex flex-col md:flex-row justify-between items-center gap-4">' +
      '<p class="text-slate-500 text-sm font-bold">' + esc(cfg.copyright || '') + ' <a href="/admin" class="ml-2 text-blue-500 hover:underline">Masuk Admin</a></p>' +
      '<div class="flex items-center gap-2.5 px-4 py-2 bg-white/50 border border-white rounded-full text-slate-600 text-sm font-bold shadow-sm">' +
      '<span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>' +
      esc(cfg.status_text || '') + '</div></div></div></footer>';
  }

  function chatHtml(cfg) {
    var qs = Array.isArray(cfg.quick_questions) ? cfg.quick_questions : [];
    var qHtml = qs.map(function (q) {
      return '<button type="button" class="quick-q" data-quick="' + esc(q.message) + '">' + esc(q.label) + '</button>';
    }).join('');
    return '<div id="ai-chat-label">' + esc(cfg.label || '') + '</div>' +
      '<button id="ai-chat-btn" onclick="void 0" aria-label="Chat AI"><i class="bi bi-stars"></i></button>' +
      '<div id="ai-chat-panel"><div id="ai-chat-header"><i class="bi bi-robot"></i><span>' + esc(cfg.header || '') + '</span>' +
      '<button id="ai-chat-close">&times;</button></div>' +
      '<div id="ai-chat-messages"><div class="chat-msg bot"><i class="bi bi-robot"></i> ' + esc(cfg.welcome || '') + '</div>' +
      '<div id="chat-quick-qs" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px">' + qHtml + '</div></div>' +
      '<div id="ai-chat-input-area"><input id="ai-chat-input" type="text" placeholder="' + esc(cfg.placeholder || 'Ketik pesan...') + '" autocomplete="off" />' +
      '<button id="ai-chat-send"><i class="bi bi-send-fill"></i></button></div></div>';
  }

  function blobsHtml() {
    return '<div class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">' +
      '<div id="blob1" class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-400/40 rounded-full filter blur-[100px] animate-blob" style="will-change:transform;transform:translateZ(0)"></div>' +
      '<div id="blob2" class="absolute top-[20%] right-[-10%] w-96 h-96 bg-cyan-400/40 rounded-full filter blur-[100px] animate-blob animation-delay-2000" style="will-change:transform;transform:translateZ(0)"></div>' +
      '<div id="blob3" class="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-pink-400/30 rounded-full filter blur-[120px] animate-blob animation-delay-4000" style="will-change:transform;transform:translateZ(0)"></div></div>';
  }

  /* ================= BLOCK DISPATCH ================= */
  function renderBlock(block, socials) {
    var cfg = block.config || {};
    switch (block.tipe) {
      case 'hero': return heroHtml(cfg);
      case 'search': return searchBarHtml(cfg) + emptyHtml();
      case 'kalender': return kalenderSectionHtml(block, cfg);
      case 'apps': return renderApps(block);
      case 'berita': return beritaSectionHtml(block, cfg);
      case 'banner': return bannerHtml(cfg);
      case 'location': return locationHtml(cfg);
      case 'html': return htmlBlock(block, cfg);
      default: return '';
    }
  }

  /* ================= RENDER APP ================= */
  function renderApp(data) {
    var settings = (data && data.settings) || {};
    var blocks = (data && data.blocks) || [];
    var socials = (data && data.socials) || [];
    if (!blocks.length) return renderEmptyState();

    var navBlock = blocks.filter(function (b) { return b.tipe === 'nav'; })[0];
    var footerBlock = blocks.filter(function (b) { return b.tipe === 'footer'; })[0];
    var chatBlock = blocks.filter(function (b) { return b.tipe === 'chat'; })[0];
    var contentBlocks = blocks.filter(function (b) {
      return ['nav', 'footer', 'chat'].indexOf(b.tipe) === -1;
    });

    var html = blobsHtml();
    if (navBlock) html += navHtml(navBlock.config || {});
    html += '<main class="flex-grow container mx-auto px-4 py-16">' +
      '<div class="max-w-6xl mx-auto space-y-20 pb-20 animate-fade-in-up delay-400">' +
      contentBlocks.map(function (b) { return renderBlock(b, socials); }).join('') +
      '</div></main>';
    if (footerBlock) html += footerHtml(footerBlock.config || {}, socials);
    if (chatBlock) html += chatHtml(chatBlock.config || {});

    document.getElementById('app').innerHTML = html;
    document.title = settings.site_name || document.title;
  }

  function renderEmptyState() {
    document.getElementById('app').innerHTML = blobsHtml() +
      '<div class="min-h-screen flex items-center justify-center p-8 text-center">' +
      '<div><i class="bi bi-cloud-slash text-5xl text-slate-400"></i>' +
      '<p class="mt-4 font-bold text-slate-600">Konten belum dapat dimuat</p>' +
      '<p class="text-sm text-slate-400">Periksa koneksi lalu muat ulang halaman.</p></div></div>';
  }

  /* ================= FEATURES ================= */
  function initDark() {
    var btn = document.getElementById('dark-toggle');
    if (btn) btn.addEventListener('click', toggleDark);
    syncDarkIcon();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (localStorage.getItem('dwisma-dark') !== null) return;
      document.documentElement.classList.toggle('dark', e.matches);
      syncDarkIcon();
    });
  }

  function syncDarkIcon() {
    var dark = document.documentElement.classList.contains('dark');
    var icon = document.getElementById('dark-icon');
    if (icon) icon.className = dark ? 'bi bi-sun-fill text-lg' : 'bi bi-moon-fill text-lg';
  }

  function toggleDark() {
    var isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('dwisma-dark', isDark ? '1' : '0');
    syncDarkIcon();
  }

  function initTyping(cfg) {
    cfg = cfg || {};
    var text1 = cfg.typing_title_1 || '';
    var text2 = cfg.typing_title_2 || '';
    var text3 = cfg.typing_subtitle || '';
    var el1 = document.getElementById('typed-text-1');
    var el2 = document.getElementById('typed-text-2');
    var el3 = document.getElementById('typed-text-3');
    if (!el1 || !el2 || !el3) return;
    var i = 0, j = 0, k = 0, isDeleting = false, isPaused = false;
    var typeSpeed = 75, deleteSpeed = 30, pauseTime = 3000;

    function step() {
      if (isPaused) return;
      if (!isDeleting) {
        var typing = false;
        if (i < text1.length) { el1.innerHTML = esc(text1.slice(0, i + 1)); i++; typing = true; }
        else if (j < text2.length) { el2.innerHTML = esc(text2.slice(0, j + 1)); j++; typing = true; }
        if (k < text3.length) { k += 2; if (k > text3.length) k = text3.length; el3.innerHTML = esc(text3.slice(0, k)); typing = true; }
        if (typing) setTimeout(step, typeSpeed);
        else { isPaused = true; isDeleting = true; setTimeout(function () { isPaused = false; step(); }, pauseTime); }
      } else {
        var deleting = false;
        if (k > 0) { k -= 2; if (k < 0) k = 0; el3.innerHTML = esc(text3.slice(0, k)); deleting = true; }
        if (j > 0) { el2.innerHTML = esc(text2.slice(0, j - 1)); j--; deleting = true; }
        else if (i > 0) { el1.innerHTML = esc(text1.slice(0, i - 1)); i--; deleting = true; }
        if (deleting) setTimeout(step, deleteSpeed);
        else { isDeleting = false; setTimeout(step, typeSpeed); }
      }
    }
    setTimeout(step, 800);
  }

  function initBlobs() {
    var b1 = document.getElementById('blob1');
    var b2 = document.getElementById('blob2');
    var b3 = document.getElementById('blob3');
    if (!b1) return;
    var pending = false, lx = 0, ly = 0;
    document.addEventListener('mousemove', function (e) {
      if (e.pointerType === 'touch') return;
      lx = e.clientX; ly = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        var w = window.innerWidth || 1, h = window.innerHeight || 1;
        var mx = (lx / w - 0.5) * 50, my = (ly / h - 0.5) * 50;
        b1.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
        if (b2) b2.style.transform = 'translate3d(' + (-mx * 1.5) + 'px,' + (-my * 1.5) + 'px,0)';
        if (b3) b3.style.transform = 'translate3d(' + (mx * 0.8) + 'px,' + (-my * 0.8) + 'px,0)';
        pending = false;
      });
    });
  }

  function searchApps(q) {
    q = (q || '').toLowerCase().trim();
    var sections = Array.prototype.slice.call(document.querySelectorAll('.search-section'));
    var any = false;
    sections.forEach(function (sec) {
      var items = Array.prototype.slice.call(sec.querySelectorAll('.search-item'));
      if (!items.length) {
        if (!q) { sec.style.display = ''; any = true; }
        else {
          var m0 = sec.textContent.toLowerCase().indexOf(q) > -1;
          sec.style.display = m0 ? '' : 'none';
          if (m0) any = true;
        }
        return;
      }
      if (!q) {
        sec.style.display = '';
        items.forEach(function (it) { it.style.display = ''; });
        if (sec.id === 'search-section-kalender') markKalenderLimit(sec);
        any = true;
        return;
      }
      var has = false;
      items.forEach(function (it) {
        var m = it.textContent.toLowerCase().indexOf(q) > -1;
        it.style.display = m ? '' : 'none';
        if (m) has = true;
      });
      sec.style.display = has ? '' : 'none';
      if (has) any = true;
    });
    var empty = document.getElementById('search-empty');
    if (empty) empty.style.display = any ? 'none' : 'flex';
  }

  function markKalenderLimit(sec) {
    var items = Array.prototype.slice.call(sec.querySelectorAll('.timeline-item'));
    items.forEach(function (el, i) { if (i >= 3) el.style.display = 'none'; });
    var btn = sec.querySelector('.toggle-all-btn');
    if (btn) { btn.dataset.open = '0'; btn.innerHTML = 'Lihat Semua <i class="bi bi-chevron-down"></i>'; }
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    if (input) input.addEventListener('input', function () { searchApps(input.value); });
    if (clear) clear.addEventListener('click', function () { if (input) input.value = ''; searchApps(''); });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.toggle-all-btn');
      if (!btn) return;
      var items = Array.prototype.slice.call(document.querySelectorAll('#kalender-list .timeline-item'));
      var open = btn.dataset.open === '1';
      items.forEach(function (el, i) { if (i >= 3) el.style.display = open ? 'none' : ''; });
      btn.dataset.open = open ? '0' : '1';
      btn.innerHTML = open ? 'Lihat Semua <i class="bi bi-chevron-down"></i>' : 'Tampilkan Sedikit <i class="bi bi-chevron-up"></i>';
    });
  }

  function renderKalender() {
    var container = document.getElementById('kalender-list');
    if (!container) return;
    var limit = Number(container.dataset.limit) || 3;
    fetch('/api/kalender').then(function (r) { return r.json(); }).then(function (res) {
      if (!res.success || !res.data || !res.data.length) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="bi bi-calendar-x text-5xl block mb-4"></i><p class="font-semibold text-lg">Belum ada agenda</p></div>';
        return;
      }
      var now = new Date(); now.setHours(0, 0, 0, 0);
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      function fmt(iso) { var d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear(); }
      function daysUntil(iso) {
        var t = new Date(iso + 'T00:00:00');
        var diff = Math.ceil((t - now) / 86400000);
        if (diff < 0) return null;
        if (diff === 0) return 'Hari ini';
        if (diff === 1) return 'Besok';
        return diff + ' hari lagi';
      }
      function endIso(item) {
        return item.tanggal_selesai && item.tanggal_selesai > item.tanggal ? item.tanggal_selesai : item.tanggal;
      }
      function rangeText(item) {
        var end = endIso(item);
        return end !== item.tanggal ? fmt(item.tanggal) + ' &ndash; ' + fmt(end) : fmt(item.tanggal);
      }
      var sorted = res.data.filter(function (it) { return new Date(endIso(it) + 'T00:00:00') >= now; })
        .sort(function (a, b) { return a.tanggal.localeCompare(b.tanggal); });
      if (!sorted.length) {
        container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="bi bi-calendar-check text-5xl block mb-4"></i><p class="font-semibold text-lg">Belum ada agenda mendatang</p></div>';
        return;
      }
      var html = '<div class="timeline-track">';
      sorted.forEach(function (item, i) {
        var end = endIso(item);
        var endDate = new Date(end + 'T00:00:00');
        var startDate = new Date(item.tanggal + 'T00:00:00');
        var past = endDate < now;
        var ongoing = !past && end !== item.tanggal && startDate <= now;
        var label = daysUntil(item.tanggal);
        var active = i === 0 && !past ? ' active' : '';
        var badge = ongoing ? '<span class="timeline-badge ml-2">Sedang berlangsung</span>'
          : (label ? '<span class="timeline-badge ml-2">' + esc(label) + '</span>' : '');
        var hidden = i >= limit ? ' style="display:none"' : '';
        html += '<div class="timeline-item search-item' + active + (past ? ' past' : '') + '"' + hidden + '>' +
          '<div class="timeline-dot"></div>' +
          '<div class="timeline-date"><i class="bi bi-calendar-range"></i> ' + rangeText(item) + badge + '</div>' +
          '<div class="timeline-title">' + esc(item.kegiatan) + '</div>' +
          '<div class="timeline-desc">' + esc(item.keterangan) + '</div></div>';
      });
      html += '</div>';
      if (sorted.length > limit) {
        html += '<div class="text-center mt-4"><button class="toggle-all-btn">Lihat Semua <i class="bi bi-chevron-down"></i></button></div>';
      }
      container.innerHTML = html;
    }).catch(function () {
      container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="bi bi-exclamation-triangle text-5xl block mb-4"></i><p class="font-semibold text-lg">Gagal memuat kalender</p></div>';
    });
  }

  function truncate(t, n) { t = t || ''; return t.length > n ? t.slice(0, n) + '...' : t; }

  function renderBerita() {
    var grid = document.getElementById('berita-grid');
    if (!grid) return;
    var source = grid.dataset.source || 'berita';
    var limit = Number(grid.dataset.limit) || 12;
    fetch('/api/' + source).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (res) {
      if (!res.success || !res.data || !res.data.length) throw new Error('empty');
      grid.innerHTML = res.data.slice(0, limit).map(function (item) {
        return '<a href="' + safeHref(item.link) + '" target="_blank" rel="noopener" ' +
          'class="perf-card search-item group relative flex flex-col bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] shadow-glass hover:shadow-[0_20px_40px_-5px_rgba(59,130,246,0.3)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">' +
          '<div class="relative w-full h-44 overflow-hidden rounded-t-[2rem] bg-slate-100">' +
          '<img src="' + esc(item.img || FALLBACK_IMG) + '" alt="' + esc(item.title) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.src=\'' + FALLBACK_IMG + '\'" />' +
          '<div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div></div>' +
          '<div class="flex flex-col flex-1 p-5 gap-2">' +
          '<span class="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1"><i class="bi bi-calendar3"></i> ' + esc(item.date) + '</span>' +
          '<h3 class="font-extrabold text-slate-800 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">' + esc(item.title) + '</h3>' +
          '<p class="text-slate-500 text-sm leading-relaxed flex-1">' + esc(truncate(item.excerpt, 120)) + '</p>' +
          '<span class="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 mt-1">Baca Selengkapnya <i class="bi bi-arrow-right"></i></span>' +
          '</div></a>';
      }).join('');
    }).catch(function () {
      grid.innerHTML = '<div class="col-span-full flex flex-col items-center gap-4 py-12 text-slate-400"><i class="bi bi-wifi-off text-5xl"></i><p class="font-semibold text-lg">Berita tidak tersedia saat ini</p></div>';
    });
  }

  function normalizeUrl(u) { return (u || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(); }

  function loadStatus() {
    var summaries = Array.prototype.slice.call(document.querySelectorAll('.status-summary'));
    if (!summaries.length) return;
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (res) {
      if (!res.success || res.enabled === false) return;
      var monitors = res.monitors || [];
      var byUrl = {};
      monitors.forEach(function (m) { if (m.url) byUrl[normalizeUrl(m.url)] = m; });
      var up = 0, down = 0;
      document.querySelectorAll('.perf-card[data-uptime]').forEach(function (card) {
        var target = card.dataset.uptime || card.getAttribute('href');
        if (!target) return;
        var mon = byUrl[normalizeUrl(target)];
        if (!mon) return;
        if (mon.status === 1) up++; else if (mon.status === 0) down++;
        var cls = mon.status === 1 ? 'up' : (mon.status === 3 ? 'maintenance' : 'down');
        var label = mon.status === 1 ? 'Online' : (mon.status === 3 ? 'Pemeliharaan' : 'Offline');
        var dot = document.createElement('span');
        dot.className = 'status-dot ' + cls;
        dot.title = label;
        card.appendChild(dot);
      });
      var total = up + down;
      if (total === 0) return;
      var allUp = down === 0;
      var html = '<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur border border-white shadow-sm text-sm font-semibold text-slate-600">' +
        '<span class="w-2.5 h-2.5 rounded-full ' + (allUp ? 'bg-green-500' : 'bg-red-500') + '"></span>' +
        (allUp ? up + ' layanan aktif · semua berjalan normal' : up + ' aktif · ' + down + ' gangguan') +
        (res.detailUrl ? ' <a href="' + esc(res.detailUrl) + '" target="_blank" rel="noopener" class="ml-1 text-blue-600 hover:underline">Detail</a>' : '') +
        '</div>';
      summaries.forEach(function (el) { el.innerHTML = html; });
    }).catch(function () { summaries.forEach(function (el) { el.innerHTML = ''; }); });
  }

  function addMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    var html = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/\n/g, '<br>');
    div.innerHTML = role === 'bot' ? '<i class="bi bi-robot"></i> ' + html : html;
    document.getElementById('ai-chat-messages').appendChild(div);
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'chat-typing';
    for (var i = 0; i < 3; i++) div.appendChild(document.createElement('span'));
    document.getElementById('ai-chat-messages').appendChild(div);
    var m = document.getElementById('ai-chat-messages'); m.scrollTop = m.scrollHeight;
  }
  function hideTyping() { var el = document.getElementById('chat-typing'); if (el) el.remove(); }

  function toggleChat() {
    var panel = document.getElementById('ai-chat-panel');
    var btn = document.getElementById('ai-chat-btn');
    var label = document.getElementById('ai-chat-label');
    var open = panel.classList.toggle('open');
    if (btn) btn.style.display = open ? 'none' : 'flex';
    if (label) label.style.display = open ? 'none' : 'block';
    if (open) {
      var m = document.getElementById('ai-chat-messages'); m.scrollTop = m.scrollHeight;
      var inp = document.getElementById('ai-chat-input'); if (inp) inp.focus();
    }
  }

  function sendChat(textOverride) {
    var input = document.getElementById('ai-chat-input');
    var msg = (textOverride != null ? textOverride : input.value).trim();
    if (!msg) return;
    input.value = '';
    addMsg(msg, 'user');
    var btn = document.getElementById('ai-chat-send');
    if (btn) btn.disabled = true;
    showTyping();
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        addMsg(data.success ? data.response : (data.message || 'Maaf, terjadi kesalahan. Coba lagi.'), 'bot');
      })
      .catch(function () { hideTyping(); addMsg('Maaf, terjadi kesalahan. Coba lagi.', 'bot'); })
      .then(function () {
        if (btn) btn.disabled = false;
        var m = document.getElementById('ai-chat-messages'); m.scrollTop = m.scrollHeight;
        input.focus();
      });
  }

  function initChat() {
    var btn = document.getElementById('ai-chat-btn');
    var close = document.getElementById('ai-chat-close');
    var send = document.getElementById('ai-chat-send');
    var input = document.getElementById('ai-chat-input');
    if (btn) btn.addEventListener('click', toggleChat);
    if (close) close.addEventListener('click', toggleChat);
    if (send) send.addEventListener('click', function () { sendChat(); });
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChat(); });
    document.addEventListener('click', function (e) {
      var q = e.target.closest && e.target.closest('.quick-q');
      if (q) sendChat(q.getAttribute('data-quick'));
    });
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () { });
      });
    }
  }

  /* ================= BOOT ================= */
  function readCache() {
    try {
      var raw = localStorage.getItem(CONTENT_CACHE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CONTENT_CACHE, JSON.stringify(data)); } catch (e) { /* noop */ }
  }

  function boot() {
    fetch('/api/content')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!(j && j.success && j.data)) throw new Error('invalid');
        writeCache(j.data);
        return j.data;
      })
      .catch(function () { return readCache() || { settings: {}, blocks: [], socials: [] }; })
      .then(function (data) {
        renderApp(data);
        var hero = (data.blocks || []).filter(function (b) { return b.tipe === 'hero'; })[0];
        initTyping(hero ? hero.config : {});
        initDark(); initBlobs(); initSearch(); initChat();
        renderKalender(); renderBerita(); loadStatus(); registerSW();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
