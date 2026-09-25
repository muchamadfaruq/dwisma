const express = require('express');
const axios = require('axios');
const { getSettings, setSetting } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { asyncHandler } = require('../utils');
const { buildAIContext } = require('../services/aiContext');

const router = express.Router();

const EDITABLE_KEYS = [
  'site_name',
  'site_short_name',
  'site_school',
  'site_description',
  'site_brand_prefix',
  'site_brand_suffix',
  'admin_login_label',
  'hero_badges',
  'hero_logo',
  'hero_logo_url',
  'hero_school',
  'hero_official_label',
  'hero_official_url',
  'hero_official_prefix',
  'nav_logos',
  'typing_title_1',
  'typing_title_2',
  'typing_subtitle',
  'banner_enabled',
  'banner_url',
  'banner_logo',
  'banner_label',
  'banner_pre',
  'banner_hi1',
  'banner_hi2',
  'location_enabled',
  'location_title',
  'location_address',
  'location_map_embed',
  'location_directions_url',
  'footer_brand_title',
  'footer_brand_sub',
  'footer_logos',
  'footer_copyright',
  'footer_status_text',
  'chat_label',
  'chat_header',
  'chat_welcome',
  'chat_placeholder',
  'chat_quick_questions',
  'ai_provider',
  'ai_enabled',
  'deepseek_model',
  'deepseek_base_url',
  'ai_system_prompt',
  'uptime_enabled',
  'uptime_kuma_url',
  'uptime_status_slug',
];

const BOOLEAN_KEYS = new Set(['banner_enabled', 'location_enabled', 'ai_enabled', 'uptime_enabled']);
const JSON_KEYS = new Set(['nav_logos', 'hero_badges', 'footer_logos', 'chat_quick_questions']);

router.get(
  '/admin/settings',
  requireAuth,
  asyncHandler((req, res) => {
    const settings = getSettings();
    const masked = { ...settings };
    masked.deepseek_api_key_set = !!(settings.deepseek_api_key || '').trim();
    masked.deepseek_api_key = masked.deepseek_api_key_set ? '********' : '';
    res.json({ success: true, data: masked });
  })
);

router.put(
  '/admin/settings',
  requireAuth,
  requireRole('admin'),
  asyncHandler((req, res) => {
    const body = req.body || {};
    for (const key of EDITABLE_KEYS) {
      if (body[key] === undefined) continue;
      let value = body[key];
      if (BOOLEAN_KEYS.has(key)) value = value === true || value === '1' || value === 'true' || value === 'on' ? '1' : '0';
      else if (JSON_KEYS.has(key) && typeof value !== 'string') value = JSON.stringify(value);
      setSetting(key, value);
    }
    if (typeof body.deepseek_api_key === 'string' && body.deepseek_api_key !== '********') {
      setSetting('deepseek_api_key', body.deepseek_api_key.trim());
    }
    res.json({ success: true });
  })
);

router.get(
  '/admin/ai-context',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { systemPrompt, parts, context } = await buildAIContext();
    const totalItems = parts.reduce((n, p) => n + p.count, 0);
    res.json({
      success: true,
      data: {
        systemPrompt,
        parts,
        stats: {
          totalParts: parts.length,
          totalItems,
          contextChars: context.length,
          approxTokens: Math.round(context.length / 4),
        },
      },
    });
  })
);

router.post(
  '/admin/settings/test-ai',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const settings = getSettings();
    const apiKey = (req.body && req.body.deepseek_api_key && req.body.deepseek_api_key !== '********')
      ? req.body.deepseek_api_key.trim()
      : settings.deepseek_api_key;
    const baseUrl = (settings.deepseek_base_url || 'https://api.deepseek.com').replace(/\/$/, '');
    const model = settings.deepseek_model || 'deepseek-chat';
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key DeepSeek belum diisi' });
    try {
      const { data } = await axios.post(
        `${baseUrl}/chat/completions`,
        { model, messages: [{ role: 'user', content: 'Balas dengan kata: OK' }], max_tokens: 10 },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      const reply = data?.choices?.[0]?.message?.content || '(kosong)';
      res.json({ success: true, message: `Koneksi berhasil. Model ${model} menjawab: ${reply}` });
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.message;
      res.status(502).json({ success: false, message: `Koneksi gagal: ${detail}` });
    }
  })
);

module.exports = router;
