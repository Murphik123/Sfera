/**
 * SFERA Platform — i18n Module
 */

const DEFAULT_LANG = 'tm';
const SUPPORTED_LANGS = ['tm', 'ru', 'en'];

// Prefer canonical key 'sfera_lang' but keep backward compatibility with older keys
const STORAGE_KEYS = ['sfera_lang', 'sfera-lang', 'lang'];

function readStoredLang() {
    for (const k of STORAGE_KEYS) {
        const v = localStorage.getItem(k);
        if (v) return v;
    }
    return null;
}

let currentLang = readStoredLang() || DEFAULT_LANG;
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
    // Write canonical key and keep older keys for compatibility
    try {
        localStorage.setItem('sfera_lang', lang);
        localStorage.setItem('sfera-lang', lang);
        localStorage.setItem('lang', lang);
    } catch (e) {
        console.warn('[i18n] Could not persist language to localStorage', e);
    }

    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function cycleLanguage() {
    const idx = SUPPORTED_LANGS.indexOf(currentLang);
    const next = (idx + 1) % SUPPORTED_LANGS.length;
    setLanguage(SUPPORTED_LANGS[next]).catch((err) => {
        console.error('[i18n] Не удалось переключить язык', err);
    });
}

async function initI18n() {
    const saved = readStoredLang() || DEFAULT_LANG;
    await setLanguage(saved);
}

// Автоматический запуск после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    initI18n().catch((err) => {
        console.error('[i18n] Не удалось инициализировать переводы', err);
    });
    const btn = document.getElementById('langBtn');
    if (btn) {
        btn.addEventListener('click', cycleLanguage);
    }
});

// Sync language across tabs/windows
window.addEventListener('storage', (ev) => {
    if (!ev.key) return;
    if (STORAGE_KEYS.includes(ev.key)) {
        const newLang = readStoredLang() || DEFAULT_LANG;
        if (newLang && newLang !== currentLang) {
            setLanguage(newLang).catch((err) => {
                console.error(`[i18n] Не удалось синхронизировать язык ${newLang}`, err);
            });
        }
    }
});

// Enhance applyTranslations to support placeholders, titles and values
function applyTranslations(data) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = data && data[key];
        if (val !== undefined && val !== null) {
            if (typeof val === 'string' && val.includes('<')) {
                el.innerHTML = val;
            } else {
                el.textContent = val;
            }
        }
    });

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = data && data[key];
        if (val !== undefined && val !== null) el.setAttribute('placeholder', val);
    });

    // titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = data && data[key];
        if (val !== undefined && val !== null) el.setAttribute('title', val);
    });

    // values
    document.querySelectorAll('[data-i18n-value]').forEach(el => {
        const key = el.getAttribute('data-i18n-value');
        const val = data && data[key];
        if (val !== undefined && val !== null) el.value = val;
    });

    // update lang button if present
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = (currentLang || DEFAULT_LANG).toUpperCase();
}

export { setLanguage, cycleLanguage, initI18n, currentLang, translations };
