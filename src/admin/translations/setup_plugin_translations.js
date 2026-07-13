const fs = require('fs');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const pluginsBase = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

const pluginDirs = [
  { name: 'content-manager', src: `${pluginsBase}/content-manager/dist/admin/translations` },
  { name: 'content-type-builder', src: `${pluginsBase}/content-type-builder/dist/admin/translations` },
  { name: 'review-workflows', src: `${pluginsBase}/review-workflows/dist/admin/translations` },
  { name: 'email', src: `${pluginsBase}/email/dist/admin/translations` },
  { name: 'i18n', src: `${pluginsBase}/i18n/dist/admin/translations` },
  { name: 'upload', src: `${pluginsBase}/upload/dist/admin/translations` },
];

function extractKeysFromMjs(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const keys = {};
  // Match top-level var assignments
  const varMatches = txt.matchAll(/var\s+(\w+)\s*=\s*"([^"]*)"/g);
  for (const m of varMatches) {
    keys[m[1]] = m[2];
  }
  // Match keys inside the en = { ... } object
  const objMatch = txt.match(/var\s+en\s*=\s*\{([\s\S]*)\}/);
  if (objMatch) {
    const strMatches = objMatch[1].matchAll(/"([^"]+)":\s*"([^"]*)"/g);
    for (const m of strMatches) {
      keys[m[1]] = m[2];
    }
  }
  return keys;
}

function createHeJsonMjs(keys, pluginName) {
  let lines = [];
  const varNames = {};
  
  // Generate unique variable names for top-level keys
  for (const k of Object.keys(keys)) {
    const varName = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
    varNames[k] = varName;
    lines.push(`var ${varName} = "${keys[k]}";`);
  }
  
  lines.push('var he = {');
  let i = 0;
  for (const k of Object.keys(keys)) {
    i++;
    const comma = i < Object.keys(keys).length ? ',' : '';
    lines.push(`    "${k}": ${varNames[k]}${comma}`);
  }
  lines.push('};');
  lines.push('');
  lines.push(`export { ${Object.values(varNames).join(', ')} };`);
  lines.push('export default he;');
  lines.push('//# sourceMappingURL=he.json.mjs.map');
  
  return lines.join('\n');
}

let totalPlugins = 0;

for (const plugin of pluginDirs) {
  const enFile = path.join(plugin.src, 'en.json.mjs');
  if (!fs.existsSync(enFile)) {
    console.log(`SKIP ${plugin.name}: no en.json.mjs`);
    continue;
  }
  
  const keys = extractKeysFromMjs(enFile);
  const outDir = path.join(base, 'plugin-' + plugin.name);
  fs.mkdirSync(outDir, { recursive: true });
  
  // Create he.json (plain JSON) for the override
  const heJson = {};
  for (const [k, v] of Object.entries(keys)) {
    heJson[k] = v; // Start with English, user can translate later
  }
  
  const heJsonPath = path.join(outDir, 'he.json');
  fs.writeFileSync(heJsonPath, JSON.stringify(heJson, null, 2), 'utf8');
  
  // Also create he.json.mjs in the plugin's dist directory
  const mjsContent = createHeJsonMjs(keys, plugin.name);
  const distHePath = path.join(plugin.src, 'he.json.mjs');
  fs.writeFileSync(distHePath, mjsContent, 'utf8');
  
  // Create .js and .mjs.map stubs
  fs.writeFileSync(path.join(plugin.src, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
  fs.writeFileSync(path.join(plugin.src, 'he.json.mjs.map'), '{"version":3,"sources":["he.json.mjs"],"names":[],"mappings":"AAAA","file":"he.json.mjs","sourcesContent":[""]}\n', 'utf8');
  
  console.log(`OK ${plugin.name}: ${Object.keys(keys).length} keys -> ${outDir}`);
  totalPlugins++;
}

console.log(`\nDone. Created ${totalPlugins} plugin translation overrides.`);
console.log('Next: restart Strapi with: cd aahome && npm run develop');
