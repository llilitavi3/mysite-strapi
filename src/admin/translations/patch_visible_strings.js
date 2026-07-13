const fs = require('fs');
const path = require('path');

const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

// Critical UI translations for Content-Type Builder - these are the most visible strings
const ctbTranslations = {
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
  "form.button.collection-type.description": "מיטבי למקרים מרובים כמו מאמרים, מוצרים, תגובות וכו׳.",
  "form.button.single-type.name": "טיפוס בודד",
  "form.button.single-type.description": "מיטבי להופעה יחידה כמו אודות nosotros, דף בית וכו׳.",
  "form.button.add.field.to.collectionType": "הוסף עוד שדה לסוג אוסף זה",
  "form.button.add.field.to.component": "הוסף עוד שדה לרכיב זה",
  "form.button.add.field.to.contentType": "הוסף עוד שדה לסוג תוכן זה",
  "form.button.add.field.to.singleType": "הוסף עוד שדה לטיפוס הבודד זה",
  "form.button.cancel": "ביטול",
  "form.button.submit": "שלח",
  "form.button.finish": "סיום",
  "form.button.back": "חזרה",
  "form.attribute.item.customColumnName": "שמות עמודות מותאמים",
  "form.attribute.item.customColumnName.description": "זה שימושי לשינוי שמות עמודות במסד הנתונים",
  "modalForm.attribute.form.base.name.description": "אסור להשתמש ברווחים לשם המאפיין",
  "modalForm.attribute.form.base.name.placeholder": "למשל: slug, seoUrl, canonicalUrl",
  "modalForm.attribute.target-field": "שדה מצורף",
  "modalForm.attributes.select-component": "בחר רכיב",
  "modalForm.attributes.select-components": "בחר את הרכיבים",
  "modalForm.empty.button": "הוסף שדות מותאמים",
  "modalForm.empty.heading": "אין כאן כלום עדיין.",
  "modalForm.empty.sub-heading": "מצא את מה שאתה מחפש דרך מגוון רחב של הרחבות.",
  "modalForm.header-edit": "עריכת {name}",
  "modalForm.header.categories": "קטגוריות",
  "modalForm.header.back": "חזרה",
  "modalForm.sub-header.addComponentToDynamicZone": "הוסף רכיב חדש לאזור הדינמי",
  "modalForm.sub-header.attribute.create": "הוסף שדה {type} חדש",
  "modalForm.sub-header.attribute.create.step": "הוסף רכיב חדש ({step}/2)",
  "modalForm.sub-header.attribute.edit": "עריכת {name}",
  "modalForm.sub-header.chooseAttribute.collectionType": "בחר שדה לסוג האוסף שלך",
  "modalForm.sub-header.chooseAttribute.component": "בחר שדה לרכיב",
  "modalForm.sub-header.chooseAttribute.singleType": "בחר שדה לטיפוס הבודד שלך",
  "modalForm.custom-fields.advanced.settings.extended": "הגדרות מורחבות",
  "contentType.apiId-plural.description": "מזהה API מריבי",
  "contentType.apiId-plural.label": "מזהה API (מריבי)",
  "contentType.apiId-singular.description": "ה-UID משמש ליצירת נתיבי API וטבלאות באתר מסד הנתונים",
  "contentType.apiId-singular.label": "מזהה API (יחיד)",
  "contentType.collectionName.description": "שימושי כאשר שם סוג התוכן ושם הטבלה שלך שונים",
  "contentType.collectionName.label": "שם אוסף",
  "contentType.displayName.label": "שם תצוגה",
  "contentType.kind.change.warning": "שינית את סוג סוג התוכן: ה-API יאופס (נתיבים, בקרים ושירותים יחודו מחדש).",
  "attribute.boolean": "בוליאני",
  "attribute.boolean.description": "כן או לא, 1 או 0, אמת או שקר",
  "attribute.component": "רכיב",
  "attribute.component.description": "קבוצת שדות שניתנים לחזרה ושימוש מחדש",
  "attribute.customField": "שדה מותאם",
  "attribute.date": "תאריך",
  "attribute.date.description": "בורר תאריך עם שעות, דקות ושניות",
  "attribute.datetime": "תאריך ושעה",
  "attribute.dynamiczone": "אזור דינמי",
  "attribute.dynamiczone.description": "בחירה דינמית של רכיבים בעריכת תוכן",
  "attribute.email": "אימייל",
  "attribute.email.description": "שדה אימייל עם אימות פורמט",
  "attribute.enumeration": "רשימה",
  "attribute.enumeration.description": "רשימת ערכים, ולאחר מכן בחירת אחד",
  "attribute.json": "JSON",
  "attribute.json.description": "נתונים בפורמט JSON",
  "attribute.media": "מדיה",
  "attribute.media.description": "קבצים כמו תמונות, סרטונים וכו׳",
  "attribute.number": "מספר",
  "attribute.number.description": "מספרים (שלמים, עשרוניים, צפה)",
  "attribute.password": "סיסמה",
  "attribute.password.description": "שדה סיסמה עם הצפנה",
  "attribute.relation": "קשר",
  "attribute.relation.description": "מפנה לסוג אוסף",
  "attribute.richtext": "טקסט עשיר (Markdown)",
  "attribute.richtext.description": "עורך טקסט עשיר קלאסי",
  "attribute.blocks": "טקסט עשיר (Blocks)",
  "attribute.blocks.description": "עורך טקסט עשיר חדש מבוסס JSON",
  "attribute.text": "טקסט",
  "attribute.text.description": "טקסט קצר או ארוך כמו כותרת או תיאור",
  "attribute.time": "זמן",
  "attribute.timestamp": "חותמת זמן",
  "attribute.uid": "מזהה יחודי",
  "attribute.uid.description": "מזהה ייחודי",
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

const pluginDir = path.join(nodeModules, 'content-type-builder/dist/admin/translations');
const heMjs = createHeJsonMjs(ctbTranslations);
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs'), heMjs, 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs.map'), JSON.stringify({
  version: 3, sources: ['he.json.mjs'], names: [], mappings: 'AAAA',
  file: 'he.json.mjs', sourcesContent: ['']
}, null, 2), 'utf8');

console.log('Created content-type-builder he.json.mjs with', Object.keys(ctbTranslations).length, 'keys');
