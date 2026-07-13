const fs = require('fs');
const path = require('path');

const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

const cmTranslations = {
  "groups": "קבוצות",
  "models": "סוגי אוסף",
  "pageNotFound": "הדף לא נמצא",
  "form.button.collection-type.name": "סוג אוסף",
  "form.button.single-type.name": "טיפוס בודד",
  "form.button.collection-type.description": "מיטבי למקרים מרובים כמו מאמרים, מוצרים, תגובות וכו׳.",
  "form.button.single-type.description": "מיטבי להופעה יחידה כמו אודות nosotros, דף בית וכו׳.",
};

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

const pluginDir = path.join(nodeModules, 'content-manager/dist/admin/translations');
const heMjs = createHeJsonMjs(cmTranslations);
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs'), heMjs, 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs.map'), JSON.stringify({
  version: 3, sources: ['he.json.mjs'], names: [], mappings: 'AAAA',
  file: 'he.json.mjs', sourcesContent: ['']
}, null, 2), 'utf8');

console.log('Created content-manager he.json.mjs with', Object.keys(cmTranslations).length, 'keys');
