const express = require('express');
const { getContentSettings, getSectionsWithButtons, getSocials } = require('../db');
const { asyncHandler } = require('../utils');

const router = express.Router();

router.get(
  '/content',
  asyncHandler((req, res) => {
    const settings = getContentSettings();
    res.json({
      success: true,
      data: {
        settings,
        sections: getSectionsWithButtons(),
        socials: getSocials(),
        uptime_enabled: settings.uptime_enabled !== '0',
      },
    });
  })
);

module.exports = router;
