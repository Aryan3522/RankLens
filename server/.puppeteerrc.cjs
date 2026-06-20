const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so it's packaged with the build
  // instead of being placed in the ephemeral ~/.cache which Render discards.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
