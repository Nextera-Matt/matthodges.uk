#!/bin/bash
# =============================================================
# Portfolio v2 Deployment Script
# Run from webroot: cd /var/www/matthodges.uk && bash deploy.sh
# =============================================================
set -euo pipefail

SITE="$(pwd)"
PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP="/root/portfolio-backup-$(date +%Y%m%d-%H%M%S)"

echo "=== Portfolio v2 Deployment ==="
echo "Site root: ${SITE}"
echo ""

# Safety check
if [[ ! -f "${SITE}/index.html" ]] || [[ ! -d "${SITE}/projects" ]]; then
  echo "ERROR: Doesn't look like the webroot. Run from /var/www/matthodges.uk"
  exit 1
fi

# -----------------------------------------------
# 1. BACKUP
# -----------------------------------------------
echo "[1/6] Backing up to ${BACKUP}..."
cp -r "${SITE}" "${BACKUP}"
echo "  Done."

# -----------------------------------------------
# 2. DEPLOY NEW FILES
# -----------------------------------------------
echo "[2/6] Deploying new files..."

# Index page (new about section, stats, contact form, removed services nav)
cp "${PATCH_DIR}/index.html" "${SITE}/index.html"
echo "  Replaced: index.html"

# Projects index (consolidated, homelab card, problem-first descriptions)
cp "${PATCH_DIR}/projects/index.html" "${SITE}/projects/index.html"
echo "  Replaced: projects/index.html"

# Documentation (tightened, half the length)
cp "${PATCH_DIR}/projects/documentation.html" "${SITE}/projects/documentation.html"
echo "  Replaced: projects/documentation.html"

# Homelab page (replaces zabbix, uptime-kuma, wireguard, cpanel-hosting)
cp "${PATCH_DIR}/projects/homelab.html" "${SITE}/projects/homelab.html"
echo "  Deployed: projects/homelab.html"

# JavaScript (XSS fixes, reduced-motion, cleaned up)
cp "${PATCH_DIR}/js/main.js" "${SITE}/js/main.js"
echo "  Replaced: js/main.js"

# CSS additions (reduced-motion for background animations)
if ! grep -q "prefers-reduced-motion: reduce" "${SITE}/css/style.css" 2>/dev/null; then
  cat "${PATCH_DIR}/css/style-additions.css" >> "${SITE}/css/style.css"
  echo "  Appended: css/style.css (reduced-motion rules)"
else
  echo "  Skipped: css/style.css (reduced-motion already present)"
fi

# -----------------------------------------------
# 3. CLEAN UP OLD FILES
# -----------------------------------------------
echo "[3/6] Removing old files..."

# Self-hosted pages consolidated into homelab
for f in cpanel-hosting.html wireguard.html; do
  if [[ -f "${SITE}/projects/${f}" ]]; then
    rm "${SITE}/projects/${f}"
    echo "  Deleted: projects/${f}"
  fi
done

# Backup files (publicly accessible)
if [[ -d "${SITE}/backups" ]]; then
  rm -rf "${SITE}/backups"
  echo "  Deleted: backups/ directory"
fi

# .htaccess (nginx doesn't use it)
if [[ -f "${SITE}/.htaccess" ]]; then
  rm "${SITE}/.htaccess"
  echo "  Deleted: .htaccess"
fi

# contact.php (if it somehow came back)
if [[ -f "${SITE}/contact.php" ]]; then
  rm "${SITE}/contact.php"
  echo "  Deleted: contact.php"
fi

# -----------------------------------------------
# 4. NGINX CONFIG
# -----------------------------------------------
echo "[4/6] Nginx configuration..."
NGINX_CONF="/etc/nginx/conf.d/matthodges.uk.conf"

if [[ -f "${NGINX_CONF}" ]]; then
  # Check if our rules are already added
  if grep -q "cpanel-hosting" "${NGINX_CONF}" 2>/dev/null; then
    echo "  Redirects already present, skipping."
  else
    echo ""
    echo "  Add these rules inside your server {} block in:"
    echo "  ${NGINX_CONF}"
    echo ""
    cat "${PATCH_DIR}/nginx-additions.conf"
    echo ""
    echo "  Then run: nginx -t && systemctl reload nginx"
    echo ""
    read -p "  Press Enter after adding the nginx rules (or Ctrl+C to do it later)..."
  fi
else
  echo "  WARNING: ${NGINX_CONF} not found."
  echo "  You'll need to add the nginx rules manually."
  echo "  See: ${PATCH_DIR}/nginx-additions.conf"
fi

# -----------------------------------------------
# 5. VERIFY
# -----------------------------------------------
echo "[5/6] Verification..."

# Check files exist
for f in index.html projects/index.html projects/homelab.html projects/documentation.html js/main.js; do
  if [[ -f "${SITE}/${f}" ]]; then
    echo "  ✓ ${f}"
  else
    echo "  ✗ MISSING: ${f}"
  fi
done

# Check old files are gone
for f in projects/cpanel-hosting.html projects/wireguard.html backups .htaccess contact.php; do
  if [[ -e "${SITE}/${f}" ]]; then
    echo "  ⚠ Still exists: ${f}"
  else
    echo "  ✓ Removed: ${f}"
  fi
done

# -----------------------------------------------
# 6. SUMMARY
# -----------------------------------------------
echo ""
echo "[6/6] Done!"
echo ""
echo "=== What changed ==="
echo "  ✓ index.html — new about section, stats, Formspree contact form"
echo "  ✓ projects/index.html — problem-first cards, homelab consolidation"  
echo "  ✓ projects/documentation.html — tightened to half length"
echo "  ✓ projects/homelab.html — consolidated 4 self-hosted pages"
echo "  ✓ js/main.js — XSS fixes, reduced-motion support"
echo "  ✓ css/style.css — reduced-motion for background animations"
echo "  ✗ Removed: backups/, cpanel-hosting.html, wireguard.html"
echo ""
echo "=== STILL NEEDED ==="
echo "  1. Set up Formspree (see README) and replace YOUR_FORM_ID in index.html"
echo "  2. Add nginx redirect rules if not done above"
echo "  3. Decide: keep or remove services.html (no longer in nav)"
echo ""
echo "Backup saved to: ${BACKUP}"
