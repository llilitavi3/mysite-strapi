const fs = require('fs');
const https = require('https');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const hePath = path.join(base, 'he.json');
const outPath = path.join(base, 'en_plugins.json');

let he = JSON.parse(fs.readFileSync(hePath, 'utf8'));

const pluginPaths = [
  'packages/core/admin/admin/src/translations/en.json',
  'packages/core/plugin-users-permissions/admin/src/translations/en.json',
  'packages/core/plugin-content-manager/admin/src/translations/en.json',
  'packages/core/plugin-email/admin/src/translations/en.json',
  'packages/core/plugin-i18n/admin/src/translations/en.json',
  'packages/core/plugin-documentation/admin/src/translations/en.json',
  'packages/core/plugin-sso/admin/src/translations/en.json',
  'packages/core/admin/admin/src/translations/he.json',
  'packages/core/plugin-users-permissions/admin/src/translations/he.json',
  'packages/core/plugin-content-manager/admin/src/translations/he.json',
  'packages/core/plugin-email/admin/src/translations/he.json',
  'packages/core/plugin-i18n/admin/src/translations/he.json',
  'packages/core/plugin-documentation/admin/src/translations/he.json',
  'packages/core/plugin-sso/admin/src/translations/he.json',
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  let merged = {};
  for (const p of pluginPaths) {
    const url = `https://raw.githubusercontent.com/strapi/strapi/main/${p}`;
    try {
      const txt = await httpsGet(url);
      const obj = JSON.parse(txt);
      let added = 0;
      for (const k of Object.keys(obj)) {
        if (merged[k] === undefined) {
          merged[k] = obj[k];
          added++;
        }
      }
      console.log(`  ${p} -> +${added} keys (total ${Object.keys(merged).length})`);
    } catch (e) {
      console.log(`  SKIP ${p}: ${e.message}`);
    }
  }

  let before = Object.keys(he).length;
  let added = 0;
  for (const k of Object.keys(merged)) {
    if (he[k] === undefined) {
      he[k] = merged[k];
      added++;
    }
  }

  fs.writeFileSync(hePath, JSON.stringify(he, null, 2), 'utf8');
  console.log('Done. Added', added, 'keys. Total he.json:', Object.keys(he).length);
})();
