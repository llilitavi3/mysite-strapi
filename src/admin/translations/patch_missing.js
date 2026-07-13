const fs = require('fs');
const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const hePath = base + '/he.json';
let he = JSON.parse(fs.readFileSync(hePath, 'utf8'));

const updates = {
  "Advanced settings": "הגדרות מתקדמות",
  "Content History": "היסטוריית תוכן",
  "Releases": "גרסאות / שחרורים",
  "Internationalization": "בינאום",
  "Review Workflows": "זרימות עבודה",
  "Single Sign-On": "כניסה אחידה (SSO)",
  "Transfer Tokens": "טוקני העברה",
  "Webhooks": "Webhooks",
  "Audit Logs": "לוגי ביקורת",
  "API Tokens": "טוקני API",
  "Content-Type Builder": "בונה סוגי תוכן",
  "Email plugin": "תוסף אימייל",
  "Configuration": "תצורה",
  "Email templates": "תבניות אימייל",
  "Providers": "ספקים"
};

let added = 0;
for (const k of Object.keys(updates)) {
  if (he[k] === undefined) {
    he[k] = updates[k];
    added++;
  }
}

fs.writeFileSync(hePath, JSON.stringify(he, null, 2), 'utf8');
console.log('Added', added, 'keys. Total now:', Object.keys(he).length);
