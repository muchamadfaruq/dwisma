const express = require('express');
const { getSettings, getBlocksWithButtons, getSocials } = require('../db');
const { asyncHandler } = require('../utils');

const router = express.Router();

const PUBLIC_SETTINGS = ['site_name', 'site_short_name', 'site_school', 'site_description', 'ai_enabled', 'uptime_enabled'];

router.get(
  '/content',
  asyncHandler((req, res) => {
    const all = getSettings();
    const settings = {};
    for (const key of PUBLIC_SETTINGS) settings[key] = all[key] || '';
    res.json({
      success: true,
      data: {
        settings,
        blocks: getBlocksWithButtons(),
        socials: getSocials(),
        uptime_enabled: settings.uptime_enabled !== '0',
      },
    });
  })
);

module.exports = router;
