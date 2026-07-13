const fs = require('fs');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

const heMain = JSON.parse(fs.readFileSync(path.join(base, 'he.json'), 'utf8'));

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

function createHeJsonMjs(entries) {
  const lines = [];
  const varNames = {};
  const usedNames = new Set();
  
  for (const k of Object.keys(entries)) {
    let varName = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
    if (usedNames.has(varName)) {
      let suffix = 1;
      while (usedNames.has(varName + '_' + suffix)) suffix++;
      varName = varName + '_' + suffix;
    }
    usedNames.add(varName);
    varNames[k] = varName;
    lines.push(`var ${varName} = "${entries[k]}";`);
  }
  
  lines.push('');
  lines.push('var he = {');
  const keys = Object.keys(entries);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const comma = i < keys.length - 1 ? ',' : '';
    lines.push(`  "${k}": ${varNames[k]}${comma}`);
  }
  lines.push('};');
  lines.push('');
  lines.push(`export { ${Object.values(varNames).join(', ')} };`);
  lines.push('export default he;');
  lines.push('//# sourceMappingURL=he.json.mjs.map');
  
  return lines.join('\n');
}

const plugins = [
  { name: 'review-workflows', dir: path.join(nodeModules, 'review-workflows/dist/admin/translations') },
  { name: 'email', dir: path.join(nodeModules, 'email/dist/admin/translations') },
  { name: 'i18n', dir: path.join(nodeModules, 'i18n/dist/admin/translations') },
  { name: 'upload', dir: path.join(nodeModules, 'upload/dist/admin/translations') },
  { name: 'content-releases', dir: path.join(nodeModules, 'content-releases/dist/admin/translations') },
  { name: 'plugin-cloud', dir: path.join(nodeModules, 'plugin-cloud/dist/admin/translations') },
];

for (const plugin of plugins) {
  const enPath = path.join(plugin.dir, 'en.json.mjs');
  if (!fs.existsSync(enPath)) {
    console.log(`SKIP ${plugin.name}: no en.json.mjs`);
    continue;
  }

  const enObj = extractEnObject(enPath);
  if (!enObj) {
    console.log(`SKIP ${plugin.name}: could not parse`);
    continue;
  }

  const entries = {};
  let translated = 0;
  let fallback = 0;

  for (const [key, enValue] of Object.entries(enObj)) {
    const heValue = heMain[enValue];
    if (heValue) {
      entries[key] = heValue;
      translated++;
    } else {
      entries[key] = enValue;
      fallback++;
    }
  }

  const mjs = createHeJsonMjs(entries);
  fs.writeFileSync(path.join(plugin.dir, 'he.json.mjs'), mjs, 'utf8');
  fs.writeFileSync(path.join(plugin.dir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
  fs.writeFileSync(path.join(plugin.dir, 'he.json.mjs.map'), JSON.stringify({
    version: 3, sources: ['he.json.mjs'], names: [], mappings: 'AAAA',
    file: 'he.json.mjs', sourcesContent: ['']
  }, null, 2), 'utf8');

  console.log(`${plugin.name}: ${translated} translated, ${fallback} english (${Object.keys(enObj).length} total)`);
}

console.log('\nAll plugin he.json.mjs files updated! Restart Strapi: cd aahome && npm run develop');
