/**
 * SFERA Platform — i18n Module
 */

const DEFAULT_LANG = 'tm';
const SUPPORTED_LANGS = ['tm', 'ru', 'en'];

let currentLang = localStorage.getItem('sfera-lang') || DEFAULT_LANG;
let translations = {};

async function loadLanguage(lang) {
    try {
        // Относительный путь от корня public (languages/lang.json)
        const res = await fetch(`languages/${lang}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`[i18n] Failed to load ${lang}.json:`, err);
        if (lang !== DEFAULT_LANG) {
            console.warn(`[i18n] Falling back to ${DEFAULT_LANG}`);
            return loadLanguage(DEFAULT_LANG);
        }
        return {};
    }
}

function applyTranslations(data) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = data[key];
        if (val !== undefined) {
            if (val.includes('<')) {
                el.innerHTML = val;
            } else {
                el.textContent = val;
            }
        }
    });
}

async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        lang = DEFAULT_LANG;
    }
    const data = await loadLanguage(lang);
    translations = data;
    applyTranslations(data);
    currentLang = lang;
    localStorage.setItem('sfera-lang', lang);
    
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = lang.toUpperCase();
    
    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function cycleLanguage() {
    const idx = SUPPORTED_LANGS.indexOf(currentLang);
    const next = (idx + 1) % SUPPORTED_LANGS.length;
    setLanguage(SUPPORTED_LANGS[next]);
}

async function initI18n() {
    const saved = localStorage.getItem('sfera-lang') || DEFAULT_LANG;
    await setLanguage(saved);
}

// Автоматический запуск после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    initI18n();
    const btn = document.getElementById('langBtn');
    if (btn) {
        btn.addEventListener('click', cycleLanguage);
    }
});

export { setLanguage, cycleLanguage, initI18n, currentLang, translations };
