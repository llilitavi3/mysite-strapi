const fs = require('fs');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

// Hebrew translations for Content-Type Builder plugin keys
const heTranslations = {
  "content-type-builder.attribute.boolean": "בוליאני",
  "content-type-builder.attribute.boolean.description": "כן או לא, 1 או 0, אמת או שקר",
  "content-type-builder.attribute.component": "רכיב",
  "content-type-builder.attribute.component.description": "קבוצת שדות שניתנים לחזרה ושימוש מחדש",
  "content-type-builder.attribute.customField": "שדה מותאם",
  "content-type-builder.attribute.date": "תאריך",
  "content-type-builder.attribute.date.description": "בורר תאריך עם שעות, דקות ושניות",
  "content-type-builder.attribute.datetime": "תאריך ושעה",
  "content-type-builder.attribute.dynamiczone": "אזור דינמי",
  "content-type-builder.attribute.dynamiczone.description": "בחירה דינמית של רכיבים בעריכת תוכן",
  "content-type-builder.attribute.email": "אימייל",
  "content-type-builder.attribute.email.description": "שדה אימייל עם אימות פורמט",
  "content-type-builder.attribute.enumeration": "נא�Enumeration (רשימה)",
  "content-type-builder.attribute.enumeration.description": "רשימת ערכים, ולאחר מכן בחירת אחד",
  "content-type-builder.attribute.json": "JSON",
  "content-type-builder.attribute.json.description": "נתונים בפורמט JSON",
  "content-type-builder.attribute.media": "מדיה",
  "content-type-builder.attribute.media.description": "קבצים כמו תמונות, סרטונים וכו׳",
  "content-type-builder.attribute.null": " ",
  "content-type-builder.attribute.number": "מספר",
  "content-type-builder.attribute.number.description": "מספרים (שלמים, עשרוניים, צפה)",
  "content-type-builder.attribute.password": "סיסמה",
  "content-type-builder.attribute.password.description": "שדה סיסמה עם הצפנה",
  "content-type-builder.attribute.relation": "קשר",
  "content-type-builder.attribute.relation.description": "מפנה לסוג אוסף",
  "content-type-builder.attribute.richtext": "טקסט עשיר (Markdown)",
  "content-type-builder.attribute.richtext.description": "עורך טקסט עשיר קלאסי",
  "content-type-builder.attribute.blocks": "טקסט עשיר (Blocks)",
  "content-type-builder.attribute.blocks.description": "עורך טקסט עשיר חדש מבוסס JSON",
  "content-type-builder.attribute.text": "טקסט",
  "content-type-builder.attribute.text.description": "טקסט קצר או ארוך כמו כותרת או תיאור",
  "content-type-builder.attribute.time": "זמן",
  "content-type-builder.attribute.timestamp": "חותמת זמן",
  "content-type-builder.attribute.uid": "מזהה יחודי",
  "content-type-builder.attribute.uid.description": "מזהה ייחודי",
  "content-type-builder.button.attributes.add.another": "הוסף עוד שדה",
  "content-type-builder.button.component.add": "הוסף רכיב",
  "content-type-builder.button.component.create": "יצירת רכיב חדש",
  "content-type-builder.button.model.create": "יצירת סוג אוסף חדש",
  "content-type-builder.button.single-types.create": "יצירת טיפוס בודד חדש",
  "content-type-builder.media.multiple": "מרובה",
  "content-type-builder.component.repeatable": "ניתן לחזרה",
  "content-type-builder.components.SelectComponents.displayed-value": "{number, plural, =0 {# רכיבים} one {# רכיב} other {# רכיבים}} נבחרו",
  "content-type-builder.components.componentSelect.no-component-available": "כבר הוספת את כל הרכיבים שלך",
  "content-type-builder.components.componentSelect.no-component-available.with-search": "אין רכיב התואם את החיפוש",
  "content-type-builder.components.componentSelect.value-component": "{number} רכיב נבחר (הקלד לחיפוש רכיב)",
  "content-type-builder.components.componentSelect.value-components": "{number} רכיבים נבחרו",
  "content-type-builder.contentType.apiId-plural.description": "מזהה API מריבי",
  "content-type-builder.contentType.apiId-plural.label": "מזהה API (מריבי)",
  "content-type-builder.contentType.apiId-singular.description": "ה-UID משמש ליצירת נתיבי API וטבלאות/אוספים במסד הנתונים",
  "content-type-builder.contentType.apiId-singular.label": "מזהה API (יחיד)",
  "content-type-builder.contentType.collectionName.description": "שימושי כאשר שם סוג התוכן ושם הטבלה שלך שונים",
  "content-type-builder.contentType.collectionName.label": "שם אוסף",
  "content-type-builder.contentType.displayName.label": "שם תצוגה",
  "content-type-builder.contentType.kind.change.warning": "שינית את סוג סוג התוכן: ה-API יאופס (נתיבים, בקרים ושירותים יחודו מחדש).",
  "content-type-builder.from": "מ",
  "content-type-builder.menu.section.components.name": "רכיבים",
  "content-type-builder.menu.section.models.name": "סוגי אוסף",
  "content-type-builder.menu.section.single-types.name": "טיפוסים בודדים",
  "content-type-builder.modalForm.collectionType.header-create": "יצירת סוג אוסף",
  "content-type-builder.modalForm.component.header-create": "יצירת רכיב",
  "content-type-builder.modalForm.singleType.header-create": "יצירת טיפוס בודד",
  "content-type-builder.plugin.name": "בונה סוגי תוכן",
  "content-type-builder.popUpForm.navContainer.advanced": "הגדרות מתקדמות",
  "content-type-builder.popUpForm.navContainer.base": "הגדרות בסיסיות",
  "content-type-builder.table.content.create-first-content-type.title": "אין סוגי תוכן",
  "content-type-builder.table.content.create-first-content-type.description": "צור סוגי אוסף, טיפוסים בודדים ורכיבים כדי לבנות את הסכימה שלך.",
  "content-type-builder.table.content.create-first-content-type.import-code": "ייבוא מהמחשב",
  "content-type-builder.table.content.create-first-content-type.start-with-prompt": "התחל בפרומפט",

  // Content Manager plugin
  "content-manager.groups": "קבוצות",
  "content-manager.models": "סוגי אוסף",
  "content-manager.pageNotFound": "הדף לא נמצא",
  "content-manager.form.button.collection-type.name": "סוג אוסף",
  "content-manager.form.button.single-type.name": "טיפוס בודד",

  // Generic plugin translations that might be used by multiple plugins
  "notification.success.delete": "הפריט נמחק",
  "notification.success.saved": "נשמר",
  "request.error.model.unknown": "המודל הזה לא קיים",
};

function createHeJsonMjs(entries) {
  const lines = [];
  const varNames = {};
  
  for (const k of Object.keys(entries)) {
    const varName = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&').substring(0, 40);
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

const pluginDir = path.join(nodeModules, 'content-type-builder/dist/admin/translations');
const heMjs = createHeJsonMjs(heTranslations);
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs'), heMjs, 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs.map'), JSON.stringify({version:3,sources:["he.json.mjs"],names:[],mappings:"AAAA",file:"he.json.mjs",sourcesContent:[""]}, null, 2), 'utf8');

console.log('Created he.json.mjs for content-type-builder with', Object.keys(heTranslations).length, 'keys');
console.log('File:', path.join(pluginDir, 'he.json.mjs'));
