const fs = require('fs');
const path = require('path');

const languagesDir = path.resolve(__dirname, '..', 'languages');
const tmPath = path.join(languagesDir, 'tm.json');
const ruPath = path.join(languagesDir, 'ru.json');
const enPath = path.join(languagesDir, 'en.json');

if (!fs.existsSync(tmPath)) {
  console.error('tm.json not found'); process.exit(1);
}

const tm = JSON.parse(fs.readFileSync(tmPath,'utf8'));
const ru = fs.existsSync(ruPath) ? JSON.parse(fs.readFileSync(ruPath,'utf8')) : {};
const en = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath,'utf8')) : {};

// Collect keys that need translation: ru[key] missing or equal to tm, or empty; same for en
const ruKeys = Object.keys(tm).filter(k => !ru[k] || ru[k] === tm[k] || ru[k] === '');
const enKeys = Object.keys(tm).filter(k => !en[k] || en[k] === tm[k] || en[k] === '');

console.log('Keys to translate RU:', ruKeys.length, 'EN:', enKeys.length);

// Use LibreTranslate public endpoint
const LIBRE = 'https://libretranslate.com/translate';

async function translateText(text, source, target) {
  try {
    const res = await fetch(LIBRE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return j.translatedText;
  } catch (e) {
    console.error('translate error', e.message);
    return null;
  }
}

(async () => {
  // translate RU in batches
  for (const key of ruKeys) {
    const text = tm[key] || '';
    if (!text) { ru[key] = ''; continue; }
    const translated = await translateText(text, 'auto', 'ru');
    ru[key] = translated || text;
    // small delay to be polite
    await new Promise(r => setTimeout(r, 250));
  }

  for (const key of enKeys) {
    const text = tm[key] || '';
    if (!text) { en[key] = ''; continue; }
    const translated = await translateText(text, 'auto', 'en');
    en[key] = translated || text;
    await new Promise(r => setTimeout(r, 250));
  }

  fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');

  console.log('Translation finished.');
})();
