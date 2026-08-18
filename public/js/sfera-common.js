/* ==========================================================================
   SFERA PLATFORM — ОБЩИЕ УТИЛИТЫ СТРАНИЦ (sfera-common.js)
   Классический скрипт (без модулей): подключается до инлайновых скриптов
   страниц и убирает продублированный код (частицы, авторизация, i18n).
   ========================================================================== */
(function (global) {
    'use strict';

    var LOGIN_PAGE = 'login.html';
    var LANG_STORAGE_KEYS = ['lang', 'sfera_lang', 'sfera-lang'];
    var DEFAULT_LANG = 'tm';
    var LANG_CYCLE = ['tm', 'ru', 'en'];

    /* ----------------------------------------------------------------------
       ЧАСТИЦЫ (единый неоновый фон для всех модулей)
       ---------------------------------------------------------------------- */
    function initParticles(containerId, count) {
        var container = document.getElementById(containerId || 'particles');
        if (!container || container.children.length > 0) return;

        var total = count || 60;
        for (var i = 0; i < total; i++) {
            var particle = document.createElement('span');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDuration = (6 + Math.random() * 12) + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(particle);
        }
    }

    /* ----------------------------------------------------------------------
       АВТОРИЗАЦИЯ
       ---------------------------------------------------------------------- */
    function getToken() {
        return localStorage.getItem('token');
    }

    function getUser(fallback) {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null') || fallback || {};
        } catch (err) {
            return fallback || {};
        }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = LOGIN_PAGE;
    }

    /**
     * Проверяет токен (и при необходимости роль), иначе уводит на страницу входа.
     *
     * @param {Object} [options]
     * @param {Object} [options.fallbackUser] - данные по умолчанию, если в localStorage пусто
     * @param {string} [options.role] - требуемая роль
     * @returns {Object|null} данные пользователя или null при редиректе
     */
    function requireAuth(options) {
        var settings = options || {};
        var user = getUser(settings.fallbackUser);

        if (!getToken() || (settings.role && user.role !== settings.role)) {
            window.location.href = LOGIN_PAGE;
            return null;
        }
        return user;
    }

    function bindLogout(buttonId) {
        var button = document.getElementById(buttonId || 'logoutBtn');
        if (button) button.addEventListener('click', logout);
    }

    /**
     * Выводит имя пользователя в переданные элементы.
     */
    function showUserName(user, elementIds) {
        var ids = elementIds || ['username'];
        var name = (user && user.username) || 'User';

        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = name;
        });
    }

    /**
     * Ссылка «Назад» зависит от роли пользователя.
     */
    function applyRoleBackLink(user, elementId) {
        var backLink = document.getElementById(elementId || 'backLink');
        if (!backLink) return;
        backLink.href = user && user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    }

    /* ----------------------------------------------------------------------
       ЛОКАЛИЗАЦИЯ (механика общая, словари остаются у страниц)
       ---------------------------------------------------------------------- */
    /**
     * Читает язык из любого исторического ключа; по умолчанию — туркменский.
     */
    function getStoredLang(supported) {
        for (var i = 0; i < LANG_STORAGE_KEYS.length; i++) {
            var stored = localStorage.getItem(LANG_STORAGE_KEYS[i]);
            if (stored && (!supported || supported.indexOf(stored) !== -1)) return stored;
        }
        return DEFAULT_LANG;
    }

    function persistLang(lang) {
        LANG_STORAGE_KEYS.forEach(function (key) {
            localStorage.setItem(key, lang);
        });
    }

    /**
     * Сохраняет язык и обновляет подпись кнопки переключателя.
     */
    function setLangLabel(lang, buttonId) {
        var button = document.getElementById(buttonId || 'langBtn');
        if (button) button.textContent = lang.toUpperCase();
        document.documentElement.setAttribute('lang', lang);
        persistLang(lang);
    }

    /**
     * Единый переключатель языка: цикл tm → ru → en.
     */
    function bindLanguageCycle(buttonId, getCurrentLang, setLanguage) {
        var button = document.getElementById(buttonId || 'langBtn');
        if (!button) return;

        button.addEventListener('click', function () {
            var index = LANG_CYCLE.indexOf(getCurrentLang());
            setLanguage(LANG_CYCLE[(index + 1) % LANG_CYCLE.length]);
        });
    }

    /**
     * Применяет словарь к элементам с data-i18n (текст, placeholder, title, value).
     */
    function applyTranslations(dictionary) {
        if (!dictionary) return;

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var value = dictionary[el.getAttribute('data-i18n')];
            if (value === undefined || el.tagName === 'SELECT') return;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.getAttribute('placeholder') !== null) el.placeholder = value;
                else if (el.type === 'submit' || el.type === 'button') el.value = value;
                else el.textContent = value;
            } else {
                el.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var value = dictionary[el.getAttribute('data-i18n-placeholder')];
            if (value !== undefined) el.placeholder = value;
        });

        document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            var value = dictionary[el.getAttribute('data-i18n-title')];
            if (value !== undefined) el.title = value;
        });
    }

    /**
     * Загружает словарь из languages/<lang>.json (с резервным словарём страницы).
     */
    async function loadLanguageFile(lang, fallbackDictionary) {
        try {
            var response = await fetch('languages/' + lang + '.json');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } catch (err) {
            console.warn('Не удалось загрузить languages/' + lang + '.json, используется встроенный резерв.', err);
            return fallbackDictionary || {};
        }
    }

    global.Sfera = {
        DEFAULT_LANG: DEFAULT_LANG,
        LANG_CYCLE: LANG_CYCLE,
        initParticles: initParticles,
        getToken: getToken,
        getUser: getUser,
        logout: logout,
        requireAuth: requireAuth,
        bindLogout: bindLogout,
        showUserName: showUserName,
        applyRoleBackLink: applyRoleBackLink,
        getStoredLang: getStoredLang,
        setLangLabel: setLangLabel,
        bindLanguageCycle: bindLanguageCycle,
        applyTranslations: applyTranslations,
        loadLanguageFile: loadLanguageFile
    };
})(window);
