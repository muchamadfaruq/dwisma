const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { getSettings } = require('../db');
const { asyncHandler } = require('../utils');
const { buildAIContext } = require('../services/aiContext');

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
});

router.post(
  '/chat',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const settings = getSettings();
    if (settings.ai_enabled === '0') {
      return res.status(503).json({ success: false, message: 'Fitur AI sedang dinonaktifkan' });
    }
    const message = (req.body && req.body.message ? String(req.body.message) : '').trim();
    if (!message) return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Pesan terlalu panjang (maksimal 2000 karakter)' });
    }
    const apiKey = (settings.deepseek_api_key || '').trim();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: 'API key DeepSeek belum dikonfigurasi oleh admin' });
    }

    const baseUrl = (settings.deepseek_base_url || 'https://api.deepseek.com').replace(/\/$/, '');
    const model = settings.deepseek_model || 'deepseek-chat';
    const { context } = await buildAIContext();

    try {
      const { data } = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: [
            { role: 'system', content: context },
            { role: 'user', content: message },
          ],
          temperature: 0.4,
          max_tokens: 1024,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      );
      const reply = data?.choices?.[0]?.message?.content || 'Maaf, tidak bisa merespon saat ini.';
      res.json({ success: true, response: reply });
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.message;
      console.error('DeepSeek error:', detail);
      res.status(502).json({ success: false, message: 'Gagal menghubungi AI DeepSeek' });
    }
  })
);

module.exports = router;
