#!/bin/bash
cd /var/www/greenhouse
git add .
git diff --staged --quiet || git commit -m "Auto backup: $(date '+%Y-%m-%d %H:%M')"
git push origin main
