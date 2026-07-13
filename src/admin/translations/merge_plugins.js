const fs = require('fs');
const path = require('path');
const https = require('https');

const base = 'C:/Users/CyberAvt/Desktop/bet-pro/aahome/src/admin/translations';
const hePath = path.join(base, 'he.json');

let he = JSON.parse(fs.readFileSync(hePath, 'utf8'));

const fetch = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      return fetch(res.headers.location);
    }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  }).on('error', reject);
});

const pluginKeys = [
  // מפתחות שנגלו בפרטי המשתמש - כלליות/פלאגינים
  'Email plugin',
  'Configuration',
  'Advanced settings',
  'Email templates',
  'Providers',
  'Content History',
  'Releases',
  'Internationalization',
  'Review Workflows',
  'Single Sign-On',
  'Transfer Tokens',
  'Webhooks',
  'Audit Logs',
  'API Tokens',
  ' Roles & Permissions',
  'Roles & Permissions',
  'Roles',
  'Users & Permissions plugin'
];

const seen = new Set();

pluginKeys.forEach(k => {
  if (!seen.has(k) && he[k] !== undefined) {
    seen.add(k);
  }
});

const countMissing = pluginKeys.filter(k => he[k] === undefined || (typeof he[k] === 'string' && he[k] === k)).length;
console.log('Missing global plugin keys to fix in he.json:', countMissing);

// כתוב רשימת המפתחות החסרים לקובץ עזר
const missing = pluginKeys.filter(k => he[k] === undefined || (typeof he[k] === 'string' && he[k] === k));
fs.writeFileSync(path.join(base, 'he_missing_global.json'), JSON.stringify(missing, null, 2), 'utf8');
console.log('Missing keys written to he_missing_global.json');
