const fs = require('fs');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const heMainPath = path.join(base, 'he.json');
const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

const heMain = JSON.parse(fs.readFileSync(heMainPath, 'utf8'));

function extractEnObject(mjsPath) {
  const txt = fs.readFileSync(mjsPath, 'utf8');
  const objMatch = txt.match(/var\s+en\s*=\s*\{([\s\S]*)\}/);
  if (!objMatch) return null;
  const result = {};
  const strMatches = objMatch[1].matchAll(/"([^"]+)":\s*"([^"]*)"/g);
  for (const m of strMatches) {
    result[m[1]] = m[2];
  }
  return result;
}

const pluginMap = {
  'content-type-builder': path.join(nodeModules, 'content-type-builder/dist/admin/translations'),
  'content-manager': path.join(nodeModules, 'content-manager/dist/admin/translations'),
  'review-workflows': path.join(nodeModules, 'review-workflows/dist/admin/translations'),
  'email': path.join(nodeModules, 'email/dist/admin/translations'),
  'i18n': path.join(nodeModules, 'i18n/dist/admin/translations'),
  'upload': path.join(nodeModules, 'upload/dist/admin/translations'),
  'content-releases': path.join(nodeModules, 'content-releases/dist/admin/translations'),
  'plugin-cloud': path.join(nodeModules, 'plugin-cloud/dist/admin/translations'),
};

const pluginIds = {
  'content-type-builder': 'content-type-builder',
  'content-manager': 'content-manager',
  'review-workflows': 'review-workflows',
  'email': 'plugins.email',
  'i18n': 'i18n',
  'upload': 'upload',
  'content-releases': 'content-releases',
  'plugin-cloud': 'plugin-cloud',
};

let added = 0;

for (const [pluginName, pluginDir] of Object.entries(pluginMap)) {
  const enPath = path.join(pluginDir, 'en.json.mjs');
  if (!fs.existsSync(enPath)) {
    console.log(`  SKIP ${pluginName}: no en.json.mjs`);
    continue;
  }

  const enObj = extractEnObject(enPath);
  if (!enObj) {
    console.log(`  SKIP ${pluginName}: could not parse`);
    continue;
  }

  const prefix = pluginIds[pluginName] || pluginName;
  let pluginTranslated = 0;
  let pluginFallback = 0;

  for (const [key, enValue] of Object.entries(enObj)) {
    const prefixedKey = `${prefix}.${key}`;
    if (heMain[prefixedKey] === undefined) {
      // Try to find a matching key in heMain by English value
      const heValue = heMain[enValue];
      if (heValue) {
        heMain[prefixedKey] = heValue;
        pluginTranslated++;
      } else {
        heMain[prefixedKey] = enValue;
        pluginFallback++;
      }
      added++;
    }
  }

  console.log(`  ${pluginName}: +${pluginTranslated} translated, +${pluginFallback} english fallback`);
}

fs.writeFileSync(heMainPath, JSON.stringify(heMain, null, 2), 'utf8');
console.log(`\nDone! Added ${added} prefixed plugin keys to he.json`);
console.log(`Total keys in he.json: ${Object.keys(heMain).length}`);
