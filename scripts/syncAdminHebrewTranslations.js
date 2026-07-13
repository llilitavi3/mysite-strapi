/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const strapiNodeModulesRoot = path.resolve(__dirname, '..', 'node_modules', '@strapi');

const customHePath = path.resolve(__dirname, '..', 'src', 'admin', 'translations', 'he.json');
const overridesHePath = path.resolve(
  __dirname,
  '..',
  'src',
  'admin',
  'translations',
  'he.overrides.json'
);

const loadJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const collectTranslationFiles = (langCode) => {
  const suffix = `${path.sep}translations${path.sep}${langCode}.json.mjs`;
  return walk(strapiNodeModulesRoot).filter((fullPath) => fullPath.endsWith(suffix));
};

const loadMergedModules = async (filePaths) => {
  let merged = {};
  for (const filePath of filePaths) {
    const mod = await import(pathToFileURL(filePath).href);
    const data = mod?.default || {};
    merged = { ...merged, ...data };
  }
  return merged;
};

async function run() {
  if (!fs.existsSync(strapiNodeModulesRoot)) {
    throw new Error(`Strapi node_modules path not found: ${strapiNodeModulesRoot}`);
  }

  const allEnFiles = collectTranslationFiles('en');
  const allHeFiles = collectTranslationFiles('he');

  if (allEnFiles.length === 0) {
    throw new Error('No Strapi admin English translation files were found.');
  }

  const builtinEn = await loadMergedModules(allEnFiles);
  const builtinHe = await loadMergedModules(allHeFiles);
  const customHe = loadJsonIfExists(customHePath);
  const overrideHe = loadJsonIfExists(overridesHePath);

  const merged = {
    ...builtinEn,
    ...builtinHe,
    ...customHe,
    ...overrideHe,
  };

  fs.mkdirSync(path.dirname(customHePath), { recursive: true });
  fs.writeFileSync(customHePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  console.log(
    `Synced admin Hebrew translations from ${allEnFiles.length} en files and ${allHeFiles.length} he files. English keys: ${Object.keys(builtinEn).length}, Hebrew keys: ${Object.keys(builtinHe).length}, merged keys: ${Object.keys(merged).length}`
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
