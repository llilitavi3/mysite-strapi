const fs = require('fs');
const path = require('path');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const nodeModules = 'C:/Users/CyberAvt/Desktop/node_modules/@strapi';

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
  "content-type-builder.attribute.enumeration": "רשימה",
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
  "content-type-builder.attribute.uid": "מזהה יחודי (UID)",
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
  "content-type-builder.error.attributeName.reserved-name": "שם זה לא ניתן לשימוש בסוג התוכן שלך כיוון שעלול לשבור תכונות אחרות",
  "content-type-builder.error.contentType.pluralName-used": "ערך זה אינו יכול להיות זהה ליחיד",
  "content-type-builder.error.contentType.singularName-used": "ערך זה אינו יכול להיות זהה לרבים",
  "content-type-builder.error.contentType.singularName-equals-pluralName": "ערך זה אינו יכול להיות זהה למזהה ה-API הרביבי של סוג תוכן אחר.",
  "content-type-builder.error.contentType.pluralName-equals-singularName": "ערך זה אינו יכול להיות זהה למזהה ה-API הייחודי של סוג תוכן אחר.",
  "content-type-builder.error.contentType.pluralName-equals-collectionName": "ערך זה כבר בשימוש על ידי סוג תוכן אחר.",
  "content-type-builder.error.contentTypeName.reserved-name": "שם זה אינו ניתן לשימוש בפרויקט שלך כיוון שעלול לשבור תכונות אחרות",
  "content-type-builder.error.validation.enum-duplicate": "ערכים כפולים לא מורשים (רק תווים אלפאנומריים נלקחים בחשבון).",
  "content-type-builder.error.validation.enum-empty-string": "מחרוזות ריקות לא מורשות",
  "content-type-builder.error.validation.enum-regex": "לפחות ערך אחד אינו חוקי. ערכים צריכים לכלול לפחות תו אלפי לפני המופע הראשון של מספר.",
  "content-type-builder.error.validation.minSupMax": "מינימום לא יכול להיות גדול ממקסימום",
  "content-type-builder.error.validation.positive": "חייב להיות מספר חיובי",
  "content-type-builder.error.validation.regex": "תבנית Regex לא חוקית",
  "content-type-builder.error.validation.relation.targetAttribute-taken": "שם זה קיים ביעד",
  "content-type-builder.form.attribute.component.option.add": "הוסף רכיב",
  "content-type-builder.form.attribute.component.option.create": "צור רכיב חדש",
  "content-type-builder.form.attribute.component.option.create.description": "רכיב משותף בין טיפוסים ורכיבים, יהיה זמין ונגיש בכל מקום.",
  "content-type-builder.form.attribute.component.option.repeatable": "רכיב ניתן לחזרה",
  "content-type-builder.form.attribute.component.option.repeatable.description": "מיטבי למקרים מרובים (מערך) של מצרכים, תגי מטא וכו׳.",
  "content-type-builder.form.attribute.component.option.reuse-existing": "השתמש ברכיב קיים",
  "content-type-builder.form.attribute.component.option.reuse-existing.description": "ש� utilization שוב ברכיב שכבר נוצר כדי לשמור על עקביות הנתונים בין סוגי תוכן.",
  "content-type-builder.form.attribute.component.option.single": "רכיב יחיד",
  "content-type-builder.form.attribute.component.option.single.description": "מיטבי לקיבוץ שדות כמו כתובת מלאה, מידע ראשי וכו׳.",
  "content-type-builder.form.attribute.item.customColumnName": "שמות עמודות מותאמים",
  "content-type-builder.form.attribute.item.customColumnName.description": "זה שימושי לשינוי שמות עמודות במסד הנתונים בפורמט ברור יותר לתגובות ה-API",
  "content-type-builder.form.attribute.item.date.type.date": "תאריך (למשל: 01/01/2024)",
  "content-type-builder.form.attribute.item.date.type.datetime": "תאריך ושעה (למשל: 01/01/2024 00:00)",
  "content-type-builder.form.attribute.item.date.type.time": "שעה (למשל: 00:00)",
  "content-type-builder.form.attribute.item.defineRelation.fieldName": "שם שדה",
  "content-type-builder.form.attribute.item.enumeration.graphql": "שם חלופי עבור GraphQL",
  "content-type-builder.form.attribute.item.enumeration.graphql.description": "אפשר לעקוף את השם שנוצר בברירת מחדל עבור GraphQL",
  "content-type-builder.form.attribute.item.enumeration.placeholder": "לדוגמה:\nבוקר\nצהריים\nערב",
  "content-type-builder.form.attribute.item.enumeration.rules": "ערכים (שורה אחת לכל ערך)",
  "content-type-builder.form.attribute.item.maximum": "ערך מקסימלי",
  "content-type-builder.form.attribute.item.maximumComponents": "רכיבים מקסימליים",
  "content-type-builder.form.attribute.item.maximumLength": "אורך מקסימלי",
  "content-type-builder.form.attribute.item.minimum": "ערך מינימלי",
  "content-type-builder.form.attribute.item.minimumComponents": "רכיבים מינימליים",
  "content-type-builder.form.attribute.item.minimumLength": "אורך מינימלי",
  "content-type-builder.form.attribute.item.number.type": "פורמט מספר",
  "content-type-builder.form.attribute.item.number.type.biginteger": "מספר שלם גדול (למשל: 123456789)",
  "content-type-builder.form.attribute.item.number.type.decimal": "עשרוני (למשל: 2.22)",
  "content-type-builder.form.attribute.item.number.type.float": "צף (למשל: 3.33333333)",
  "content-type-builder.form.attribute.item.number.type.integer": "מספר שלם (למשל: 10)",
  "content-type-builder.form.attribute.item.privateField": "שדה פרטי",
  "content-type-builder.form.attribute.item.privateField.description": "שדה זה לא יופיע בתגובת ה-API",
  "content-type-builder.form.attribute.item.requiredField": "שדה חובה",
  "content-type-builder.form.attribute.item.requiredField.description": "לא תוכל ליצור רשומה אם שדה זה ריק",
  "content-type-builder.form.attribute.item.text.regex": "תבנית RegExp",
  "content-type-builder.form.attribute.item.text.regex.description": "טקסט הביטmage המתמשך",
  "content-type-builder.form.attribute.item.uniqueField": "שדה ייחודי",
  "content-type-builder.form.attribute.item.uniqueField.description": "לא תוכל ליצור רשומה אם כבר קיימת רשומה עם תוכן זהה",
  "content-type-builder.modalForm.custom-fields.advanced.settings.extended": "הגדרות מורחבות",
  "content-type-builder.modalForm.empty.heading": "אין כאן כלום עדיין.",
  "content-type-builder.modalForm.empty.sub-heading": "מצא את מה שאתה מחפש דרך מגוון רחב של הרחבות.",
  "content-type-builder.modalForm.header-edit": "עריכת {name}",
  "content-type-builder.modalForm.header.categories": "קטגוריות",
  "content-type-builder.modalForm.header.back": "חזרה",
  "content-type-builder.modalForm.sub-header.addComponentToDynamicZone": "הוסף רכיב חדש לאזור הדינמי",
  "content-type-builder.modalForm.sub-header.attribute.create": "הוסף שדה {type} חדש",
  "content-type-builder.modalForm.sub-header.attribute.create.step": "הוסף רכיב חדש ({step}/2)",
  "content-type-builder.modalForm.sub-header.attribute.edit": "עריכת {name}",
  "content-type-builder.modalForm.sub-header.chooseAttribute.collectionType": "בחר שדה לסוג האוסף שלך",
  "content-type-builder.modalForm.sub-header.chooseAttribute.component": "בחר שדה שלך",
  "content-type-builder.modalForm.sub-header.chooseAttribute.singleType": "בחר שדה לטיפוס הבודד שלך",
  "content-type-builder.notification.contentType.relations.conflict": "לסוג התוכן יש יחסים סותרים",
  "content-type-builder.notification.error": "התרחשה שגיאה",
  "content-type-builder.notification.error.layout": "לא ניתן היה לאחזר את הפריסה",
  "content-type-builder.notification.form.error.fields": "הטופס מכיל מספר שגיאות",
  "content-type-builder.notification.form.success.fields": "שינויים נשמרו",
  "content-type-builder.notification.link-copied": "הקישור הועתק ללוח",
  "content-type-builder.notification.permission.not-allowed-read": "אין לך הרשאה לצפות במסמך זה",
  "content-type-builder.plugin.description.long": "Modelize את מבנה הנתונים של ה-API שלך. צור שדות וקשרים בדיוק דקה. הקבצים נוצרים ומתעדכנים אוטומטית בפרויקט שלך.",
  "content-type-builder.plugin.description.short": "Modelize את מבנה הנתונים של ה-API שלך.",
  "content-type-builder.plugin.name": "בונה סוגי תוכן",
  "content-type-builder.popUpForm.navContainer.advanced": "הגדרות מתקדמות",
  "content-type-builder.popUpForm.navContainer.base": "הגדרות בסיסיות",
  "content-type-builder.popUpWarning.bodyMessage.cancel-modifications": "האם אתה בטוח שברצונך לבטל את השינויים?",
  "content-type-builder.popUpWarning.bodyMessage.cancel-modifications.with-components": "האם אתה בטוח שברצונך לבטל את השינויים? רכיבים מסוימים נוצרו או שונו...",
  "content-type-builder.popUpWarning.bodyMessage.category.delete": "האם אתה בטוח שברצונך למחוק קטגוריה זו? כל הרכיבים ימחקו גם כן.",
  "content-type-builder.popUpWarning.bodyMessage.component.delete": "האם אתה בטוח שברצונך למחוק רכיב זה?",
  "content-type-builder.popUpWarning.bodyMessage.contentType.delete": "האם אתה בטוח שברצונך למחוק סוג אוסף זה?",
  "content-type-builder.popUpWarning.draft-publish.button.confirm": "כן, השבת",
  "content-type-builder.popUpWarning.draft-publish.message": "אם תשבית את טיוטה ופרסום, הטיוטות שלך ימחקו.",
  "content-type-builder.popUpWarning.draft-publish.second-message": "האם אתה בטוח שברצונך להשבית זאת?",
  "content-type-builder.popUpWarning.discardAll.message": "האם אתה בטוח שברצונך לבטל את כל השינויים?",
  "content-type-builder.popUpWarning.bodyMessage.delete-condition": "האם אתה בטוח שברצונך למחוק תנאי זה?",
  "content-type-builder.popUpWarning.bodyMessage.delete-attribute-with-conditions": "השדות הבאים כוללים תנאים שנתונים בשדה זה: ",
  "content-type-builder.popUpWarning.bodyMessage.delete-attribute-with-conditions-end": ". האם אתה בטוח שברצונך למחוק אותו?",
  "content-type-builder.prompt.unsaved": "האם אתה בטוח שברצונך לעזוב? כל השינויים שלך יאבדו.",
  "content-type-builder.relation.attributeName.placeholder": "לדוגמה: מחבר, קטגוריה, תג",
  "content-type-builder.relation.manyToMany": "יש ויש לרבים",
  "content-type-builder.relation.manyToOne": "יש לרבים",
  "content-type-builder.relation.manyWay": "יש לרבים",
  "content-type-builder.relation.oneToMany": "שייך לרבים",
  "content-type-builder.relation.oneToOne": "יש ויש ליחיד",
  "content-type-builder.relation.oneWay": "יש ליחיד",
  "content-type-builder.table.button.no-fields": "הוסף שדה חדש",
  "content-type-builder.table.content.create-first-content-type.title": "אין סוגי תוכן",
  "content-type-builder.table.content.create-first-content-type.description": "צור סוגי אוסף, טיפוסים בודדים ורכיבים כדי לבנות את הסכימה שלך.",
  "content-type-builder.table.content.create-first-content-type.import-code": "ייבוא מהמחשב",
  "content-type-builder.table.content.create-first-content-type.start-with-prompt": "התחל בפרומפט",
  "content-type-builder.table.content.no-fields.collection-type": "הוסף את השדה הראשון לסוג אוסף זה",
  "content-type-builder.table.content.no-fields.component": "הוסף את השדה הראשון לרכיב זה",
  "content-type-builder.IconPicker.search.placeholder.label": "חפש אייקון",
  "content-type-builder.IconPicker.search.clear.label": "נקה חיפוש אייקון",
  "content-type-builder.IconPicker.search.button.label": "כפתור חיפוש אייקון",
  "content-type-builder.IconPicker.remove.tooltip": "הסר את האייקון הנבחר",
  "content-type-builder.IconPicker.remove.button": "הסר את כפתור האייקון הנבחר",
  "content-type-builder.IconPicker.emptyState.label": "לא נמצא אייקון",
  "content-type-builder.IconPicker.icon.label": "בחר אייקון {icon}",
  "content-type-builder.chat.tooltips.close-chat": "סגור צ׳אט",
  "content-type-builder.chat.tooltips.create-chat": "שיח� חדשה",
  "content-type-builder.chat.tooltips.open-chat": "פתח צ׳אט",
  "content-type-builder.chat.tooltips.send-message": "שלח",
  "content-type-builder.chat.tooltips.stop-generation": "עצור",
  "content-type-builder.chat.tooltips.upload-attachments": "העלה קבצים מצורפים",
  "content-type-builder.chat.header.default-title": "שיחה חדשה",
  "content-type-builder.chat.input.defaults.title": "איך אני יכול לעזור?",
  "content-type-builder.chat.input.defaults.generate": "צור סכימת מוצר",
  "content-type-builder.chat.input.defaults.ctb": "ספר לי על בונה סוגי תוכן",
  "content-type-builder.chat.input.defaults.strapi": "ספר לי על Strapi",
  "content-type-builder.chat.input.thinking": "Strapi AI חושב...",
  "content-type-builder.chat.input.placeholder": "שאל את Strapi AI...",
  "content-type-builder.chat.input.strapi-ai-can-make-errors": "Strapi AI עלול לטעות.",
  "content-type-builder.chat.messages.error": "משהו השתבש.",
  "content-type-builder.chat.messages.too-many-requests": "יותר מדי בקשות, נסה שוב מאוחר יותר.",
  "content-type-builder.chat.messages.license-limit-reached": "הגעת למגבלת רישיון, נסה שוב מחר.",
  "content-type-builder.chat.messages.license-limit-exceeded": "חרגת ממגבלת קרדיטי AI.",
  "content-type-builder.chat.messages.too-long-error": "השיחה הזו הגיעה לאורכה המקסימלי. התחל שיחה חדשה",
  "content-type-builder.chat.code-upload.header": "ייבוא קוד",
  "content-type-builder.chat.code-upload.title": "ייבוא קוד",
  "content-type-builder.chat.code-upload.description": "האפליקציה שלך ת� être נית�Sheckby AI. וודא שהסרת את כל הנתונים הרגישים לפני היבואץ.",
  "content-type-builder.chat.code-upload.drop-zone": "גרור לכאן קובץ .zip או",
  "content-type-builder.chat.code-upload.drop-zone-folder": "גרור לכאן תיקייה או",
  "content-type-builder.chat.code-upload.drop-zone-browse": "עיין בקבצים",
  "content-type-builder.chat.attachments.menu.import-code": "ייבוא קוד",
  "content-type-builder.chat.attachments.menu.attach-image": "צר� תמונה",
  "content-type-builder.chat.attachments.menu.import-code-": "ייבוא מ-Figma",
  "content-type-builder.chat.feedback.title": "ספק משוב",
  "content-type-builder.chat.feedback.subtitle": "ספק משוב נוסף על הודעה זו. בחר את כל הרלוונטי.",
  "content-type-builder.chat.feedback.comment.label": "איך אנחנו יכולים לשפר? (אופציונלי)",
  "content-type-builder.chat.feedback.placeholder": "המשוב שלך...",
  "content-type-builder.chat.feedback.submitted": "תודה על המשוב שלך!",
  "content-type-builder.chat.feedback.error": "אירעה שגיאה בשליחת המשוב",
  "content-type-builder.chat.feedback.reason.invalid_schema": "סכימה לא חוקית",
  "content-type-builder.chat.feedback.reason.bad_recommendation": "המלצה גרועה",
  "content-type-builder.chat.feedback.reason.slow": "איטי",
  "content-type-builder.chat.feedback.reason.instructions_ignored": "הוראות נזנחו",
  "content-type-builder.chat.feedback.reason.being_lazy": "עצלן",
  "content-type-builder.chat.feedback.reason.other": "אחר",
  "content-type-builder.chat.figma-upload.step1-title": "הזן כתובת Figma",
  "content-type-builder.chat.figma-upload.step2-title": "תצוגה מקדימה של תמונות",
  "content-type-builder.chat.figma-upload.select-images": "בחר פריימים לייבוא",
  "content-type-builder.chat.figma-upload.no-images": "לא נמצאו פריימים בקובץ ה-Figma.",
  "content-type-builder.chat.figma-upload.import-button": "ייבא",
  "content-type-builder.form.button.finish": "סיום",
  "content-type-builder.form.button.back": "חזרה"
};

function createHeJsonMjs(entries) {
  const lines = [];
  const varNames = {};
  const usedNames = new Set();
  
  for (const k of Object.keys(entries)) {
    let varName = k.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
    // Ensure uniqueness
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
const heMjs = createHeJsonMjs(heTranslations);
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs'), heMjs, 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.js'), 'export { he as default } from "./he.json.mjs";\n', 'utf8');
fs.writeFileSync(path.join(pluginDir, 'he.json.mjs.map'), JSON.stringify({version:3,sources:["he.json.mjs"],names:[],mappings:"AAAA",file:"he.json.mjs",sourcesContent:[""]}, null, 2), 'utf8');

console.log('Created he.json.mjs for content-type-builder with', Object.keys(heTranslations).length, 'keys');
console.log('No duplicate variable names');
