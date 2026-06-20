#!/usr/bin/env bash
# ============================================================
# Render Build Script
#
# This script runs during Render's build phase.
# It installs Chromium + dependencies required for Lighthouse
# audits, then builds the server.
#
# Render setup:
#   Build Command:  bash scripts/render-build.sh
#   Start Command:  npm start
#   Env Variables:
#     NODE_ENV=production
#     CHROME_PATH=/usr/bin/chromium-browser  (or /usr/bin/google-chrome-stable)
#     CHROME_POOL_SIZE=1  (1 for free tier, 2 for starter+)
# ============================================================

set -e

echo "=== Installing Chromium dependencies ==="

# Install Chromium and required libs for headless operation
apt-get update -qq && apt-get install -y -qq --no-install-recommends \
  chromium-browser \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  2>/dev/null || echo "Some packages may not be available, continuing..."

# Detect the installed Chromium path
if command -v chromium-browser &> /dev/null; then
  echo "Chromium found at: $(which chromium-browser)"
  export CHROME_PATH=$(which chromium-browser)
elif command -v chromium &> /dev/null; then
  echo "Chromium found at: $(which chromium)"
  export CHROME_PATH=$(which chromium)
elif command -v google-chrome-stable &> /dev/null; then
  echo "Chrome found at: $(which google-chrome-stable)"
  export CHROME_PATH=$(which google-chrome-stable)
else
  echo "WARNING: No Chromium/Chrome binary found. Lighthouse may fail at runtime."
fi

echo "=== Building server ==="

npm ci
npm run build

echo "=== Build complete ==="
