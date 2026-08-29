/* ============================================
   SFERA — Глобальная система переводов (i18n)
   Язык по умолчанию: tm (туркменский)
   Файлы переводов: /languages/tm.json, ru.json, en.json
============================================ */

const LANGS = ['tm', 'ru', 'en'];
const DEFAULT_LANG = 'tm';

// Кэш переводов
let translations = {};
let currentLang = localStorage.getItem('lang');

// Если язык не сохранён или недопустим — ставим tm
if (!currentLang || !LANGS.includes(currentLang)) {
    currentLang = DEFAULT_LANG;
    localStorage.setItem('lang', currentLang);
}

// Загрузка переводов с сервера
async function loadTranslations(lang) {
    try {
        const response = await fetch(`/languages/${lang}.json`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        translations[lang] = data;
        return data;
    } catch (e) {
        console.warn(`Не удалось загрузить ${lang}.json, используем фолбэк.`);
        // Минимальный фолбэк, чтобы не сломать интерфейс
        return {};
    }
}

// Применение переводов ко всем элементам с data-i18n и data-i18n-placeholder
function applyTranslations(lang) {
    const t = translations[lang] || {};
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    // Обновляем кнопку языка
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = lang.toUpperCase();
    
    localStorage.setItem('lang', lang);
}

// Инициализация при загрузке страницы
async function initI18n() {
    // Загружаем все три языка сразу для быстрого переключения
    await Promise.all(LANGS.map(lang => loadTranslations(lang)));
    
    // Применяем текущий язык
    applyTranslations(currentLang);

    // Обработчик кнопки переключения языка
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            const nextIndex = (LANGS.indexOf(currentLang) + 1) % LANGS.length;
            currentLang = LANGS[nextIndex];
            applyTranslations(currentLang);
        });
    }
}

// Обработчики кнопок (если они есть на странице)
function initActionButtons() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('username');
            window.location.href = '/login.html';
        });
    }

    const backLink = document.getElementById('backLink');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/index.html';
            }
        });
    }
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    initI18n();
    initActionButtons();
});
