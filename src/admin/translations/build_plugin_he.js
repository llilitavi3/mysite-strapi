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

function createHeJsonMjs(entries) {
  const lines = [];
  const varNames = {};
  
  for (const k of Object.keys(entries)) {
    const varName = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&').substring(0, 50);
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

function createHeJsonJs(mjsPath) {
  return `export { he as default } from "./${path.basename(mjsPath)}";\n`;
}

function createSourceMap() {
  return JSON.stringify({
    version: 3,
    sources: ['he.json.mjs'],
    names: [],
    mappings: 'AAAA',
    file: 'he.json.mjs',
    sourcesContent: ['']
  }, null, 2);
}

const plugins = [
  { id: 'content-type-builder', name: 'Content-Type Builder', src: path.join(nodeModules, 'content-type-builder/dist/admin/translations') },
  { id: 'content-manager', name: 'Content Manager', src: path.join(nodeModules, 'content-manager/dist/admin/translations') },
  { id: 'review-workflows', name: 'Review Workflows', src: path.join(nodeModules, 'review-workflows/dist/admin/translations') },
  { id: 'email', name: 'Email', src: path.join(nodeModules, 'email/dist/admin/translations') },
  { id: 'i18n', name: 'i18n', src: path.join(nodeModules, 'i18n/dist/admin/translations') },
  { id: 'upload', name: 'Upload', src: path.join(nodeModules, 'upload/dist/admin/translations') },
  { id: 'plugin-users-permissions', name: 'Users & Permissions', src: path.join(nodeModules, 'plugin-users-permissions/admin/src/translations') },
  { id: 'content-releases', name: 'Content Releases', src: path.join(nodeModules, 'content-releases/dist/admin/translations') },
  { id: 'plugin-cloud', name: 'Cloud', src: path.join(nodeModules, 'plugin-cloud/dist/admin/translations') },
];

const report = [];

for (const plugin of plugins) {
  const enPath = path.join(plugin.src, 'en.json.mjs');
  if (!fs.existsSync(enPath)) {
    console.log(`  SKIP ${plugin.name}: no en.json.mjs at ${enPath}`);
    report.push({ name: plugin.name, status: 'skipped', reason: 'no en.json.mjs' });
    continue;
  }

  const enObj = extractEnObject(enPath);
  if (!enObj || Object.keys(enObj).length === 0) {
    console.log(`  SKIP ${plugin.name}: empty en object`);
    report.push({ name: plugin.name, status: 'skipped', reason: 'empty en object' });
    continue;
  }

  const entries = {};
  let translated = 0;
  let englishFallback = 0;

  for (const [key, enValue] of Object.entries(enObj)) {
    const heValue = heMain[enValue];
    if (heValue) {
      entries[key] = heValue;
      translated++;
    } else {
      entries[key] = enValue;
      englishFallback++;
    }
  }

  const mjsContent = createHeJsonMjs(entries);
  const mjsOut = path.join(plugin.src, 'he.json.mjs');
  fs.writeFileSync(mjsOut, mjsContent, 'utf8');

  const jsContent = createHeJsonJs(mjsOut);
  fs.writeFileSync(path.join(plugin.src, 'he.json.js'), jsContent, 'utf8');
  
  fs.writeFileSync(path.join(plugin.src, 'he.json.mjs.map'), createSourceMap(), 'utf8');

  console.log(`  OK ${plugin.name}: ${translated} translated, ${englishFallback} english fallback (${Object.keys(enObj).length} total)`);
  report.push({ name: plugin.name, status: 'done', translated, englishFallback, total: Object.keys(enObj).length });
}

console.log('\n--- Summary ---');
report.filter(r => r.status === 'done').forEach(r => {
  console.log(`  ${r.name}: ${r.translated} he / ${r.englishFallback} en (${r.total} total)`);
});

fs.writeFileSync(path.join(base, 'translation_report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('\nReport saved to translation_report.json');
console.log('\nNow restart Strapi: cd aahome && npm run develop');
