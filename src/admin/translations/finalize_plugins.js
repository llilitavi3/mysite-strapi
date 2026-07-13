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

// Manual overrides for critical visible strings in CTB
const ctbOverrides = {
  "plugin.name": "בונה סוגי תוכן",
  "configurations": "תצורות",
  "from": "מ",
  "popUpForm.navContainer.advanced": "הגדרות מתקדמות",
  "popUpForm.navContainer.base": "הגדרות בסיסיות",
  "menu.section.models.name": "סוגי אוסף",
  "menu.section.single-types.name": "טיפוסים בודדים",
  "menu.section.components.name": "רכיבים",
  "button.model.create": "יצירת סוג אוסף חדש",
  "button.single-types.create": "יצירת טיפוס בודד חדש",
  "button.component.create": "יצירת רכיב חדש",
  "modalForm.collectionType.header-create": "יצירת סוג אוסף",
  "modalForm.singleType.header-create": "יצירת טיפוס בודד",
  "modalForm.component.header-create": "יצירת רכיב",
  "table.content.create-first-content-type.title": "אין סוגי תוכן",
  "table.content.create-first-content-type.description": "צור סוגי אוסף, טיפוסים בודדים ורכיבים כדי לבנות את הסכימה שלך.",
  "table.content.no-fields.collection-type": "הוסף את השדה הראשון לסוג אוסף זה",
  "table.content.no-fields.component": "הוסף את השדה הראשון לרכיב זה",
  "table.button.no-fields": "הוסף שדה חדש",
  "form.button.collection-type.name": "סוג אוסף",
  "form.button.single-type.name": "טיפוס בודד",
  "form.button.cancel": "ביטול",
  "form.button.submit": "שלח",
  "form.button.add.field.to.collectionType": "הוסף עוד שדה לסוג אוסף זה",
  "form.button.add.field.to.component": "הוסף עוד שדה לרכיב זה",
  "form.button.add.field.to.contentType": "הוסף עוד שדה לסוג תוכן זה",
  "form.button.add.field.to.singleType": "הוסף עוד שדהלטיפוס הבודד זה",
};

const plugins = [
  { name: 'content-type-builder', dir: path.join(nodeModules, 'content-type-builder/dist/admin/translations'), overrides: ctbOverrides },
  { name: 'content-manager', dir: path.join(nodeModules, 'content-manager/dist/admin/translations'), overrides: {
    "groups": "קבוצות",
    "models": "סוגי אוסף",
    "pageNotFound": "הדף לא נמצא",
    "form.button.collection-type.name": "סוג אוסף",
    "form.button.single-type.name": "טיפוס בודד",
  }},
  { name: 'review-workflows', dir: path.join(nodeModules, 'review-workflows/dist/admin/translations'), overrides: {} },
  { name: 'content-releases', dir: path.join(nodeModules, 'content-releases/dist/admin/translations'), overrides: {} },
  { name: 'email', dir: path.join(nodeModules, 'email/dist/admin/translations'), overrides: {} },
  { name: 'i18n', dir: path.join(nodeModules, 'i18n/dist/admin/translations'), overrides: {} },
  { name: 'upload', dir: path.join(nodeModules, 'upload/dist/admin/translations'), overrides: {} },
  { name: 'plugin-cloud', dir: path.join(nodeModules, 'plugin-cloud/dist/admin/translations'), overrides: {} },
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
  
  // First add all English entries as fallback
  for (const [key, enValue] of Object.entries(enObj)) {
    entries[key] = enValue;
  }
  
  // Then apply overrides (Hebrew translations)
  let overrideCount = 0;
  for (const [key, heValue] of Object.entries(plugin.overrides)) {
    if (entries[key] !== undefined) {
      entries[key] = heValue;
      overrideCount++;
    }
  }
  
  // Then try to find Hebrew from main he.json by English value
  let autoTranslated = 0;
  for (const [key, enValue] of Object.entries(enObj)) {
    if (plugin.overrides[key] === undefined) {
      const heValue = heMain[enValue];
      if (heValue && heValue !== enValue) {
        entries[key] = heValue;
        autoTranslated++;
      }
    }
  }

  const mjs = createHeJsonMjs(entries);
  fs.writeFileSync(path.join(plugin.dir, 'he.json.mjs'), mjs, 'utf8');
  fs.writeFileSync(path.join(plugin.dir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
  fs.writeFileSync(path.join(plugin.dir, 'he.json.mjs.map'), JSON.stringify({
    version: 3, sources: ['he.json.mjs'], names: [], mappings: 'AAAA',
    file: 'he.json.mjs', sourcesContent: ['']
  }, null, 2), 'utf8');

  console.log(`${plugin.name}: ${overrideCount} manual overrides, ${autoTranslated} auto from heMain (${Object.keys(enObj).length} total)`);
}

console.log('\nDone! Now restart Strapi: npm run develop');
