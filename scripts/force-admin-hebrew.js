const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src', 'admin', 'translations');
const hePath = path.join(srcDir, 'he.json');
const enPath = path.join(srcDir, 'en.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function run() {
  if (!fs.existsSync(hePath)) {
    throw new Error(`Missing Hebrew translations file: ${hePath}`);
  }

  const he = readJson(hePath);
  const en = fs.existsSync(enPath) ? readJson(enPath) : {};
  const merged = { ...en, ...he };

  // Keep English locale keyspace complete, but values in Hebrew.
  writeJson(enPath, merged);

  console.log('[force-admin-hebrew] Synced en.json from he.json');
  console.log(`[force-admin-hebrew] Keys in en.json: ${Object.keys(merged).length}`);
}

run();
