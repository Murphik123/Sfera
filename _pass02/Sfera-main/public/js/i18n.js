/**
 * SFERA — Единый центральный i18n
 * Языки: TM → RU → EN → TM
 *
 * Архитектурные правила:
 * - первый запуск ВСЕГДА TM;
 * - выбранный язык сохраняется в localStorage и используется на последующих страницах;
 * - один центральный обработчик кнопки языка;
 * - локальные/внешние переводчики не используются;
 * - перевод НЕ переписывает innerHTML/textContent контейнера;
 * - SVG, SPAN, ICON, BR, OPTION и другие дочерние узлы сохраняются;
 * - placeholders/title/aria-label переводятся отдельными атрибутами;
 * - динамический DOM переводится через i18n.apply(root);
 * - после смены языка отправляется sfera:language-changed.
 */
(function (window, document) {
    'use strict';

    const LANGS = ['tm', 'ru', 'en'];
    const DEFAULT_LANG = 'tm';
    const STORAGE_KEY = 'sfera_lang';

    const dictionaries = {
        tm: {},
        ru: {},
        en: {}
    };

    const loading = {
        tm: null,
        ru: null,
        en: null
    };

    let currentLang = DEFAULT_LANG;
    let initialized = false;
    let initPromise = null;

    window.translations = dictionaries;
    window.currentLang = currentLang;

    function normalizeLang(lang) {
        const normalized = String(lang || '').toLowerCase().trim();
        return LANGS.includes(normalized) ? normalized : DEFAULT_LANG;
    }

    async function load(lang) {
        lang = normalizeLang(lang);

        if (Object.keys(dictionaries[lang]).length) {
            return dictionaries[lang];
        }

        if (loading[lang]) {
            return loading[lang];
        }

        loading[lang] = (async () => {
            try {
                const response = await fetch(new URL(`../languages/${lang}.json`, import.meta.url), {
                    cache: 'no-store'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (!data || typeof data !== 'object' || Array.isArray(data)) {
                    throw new Error('Некорректный JSON');
                }

                dictionaries[lang] = data;
            } catch (error) {
                console.warn(
                    `[SFERA i18n] Не удалось загрузить ${lang}.json`,
                    error
                );

                dictionaries[lang] = {};
            } finally {
                loading[lang] = null;
            }

            return dictionaries[lang];
        })();

        return loading[lang];
    }

    function t(key) {
        if (!key) return '';

        const active = dictionaries[currentLang] || {};
        const tm = dictionaries.tm || {};

        if (
            Object.prototype.hasOwnProperty.call(active, key) &&
            active[key] !== ''
        ) {
            return String(active[key]);
        }

        if (
            Object.prototype.hasOwnProperty.call(tm, key) &&
            tm[key] !== ''
        ) {
            return String(tm[key]);
        }

        return String(key);
    }

    /**
     * Безопасная замена текста внутри конкретного элемента.
     *
     * КРИТИЧЕСКОЕ ПРАВИЛО:
     * никогда не использовать el.textContent = value,
     * потому что это уничтожает SVG/SPAN/ICON/BR и другие дочерние узлы.
     *
     * Переводится последний "содержательный" прямой текстовый узел.
     * Это позволяет корректно работать, например, с:
     *
     *   <button><svg>...</svg> Текст</button>
     *
     * и:
     *
     *   <button>Текст <svg>...</svg></button>
     */
    function setElementText(el, value) {
        if (!el) return;

        const tag = el.tagName;

        // SELECT переводится через его OPTION, а не целиком.
        if (tag === 'SELECT') return;

        const textNodes = Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE);

        if (textNodes.length === 0) {
            // Контейнер содержит только дочерние элементы.
            // Его DOM намеренно не изменяем.
            return;
        }

        const meaningfulNodes = textNodes.filter(
            node => String(node.nodeValue || '').trim() !== ''
        );

        const target =
            meaningfulNodes[meaningfulNodes.length - 1] ||
            textNodes[textNodes.length - 1];

        if (!target) return;

        target.nodeValue = value;

        // Если после перевода осталось несколько прямых текстовых узлов,
        // очищаем только их текст, но НЕ удаляем и НЕ перестраиваем DOM.
        for (const node of textNodes) {
            if (node !== target) {
                node.nodeValue = '';
            }
        }
    }

    function getTranslatableElements(root, selector) {
        const elements = [];

        if (!root) return elements;

        if (
            root.nodeType === Node.ELEMENT_NODE &&
            root.matches(selector)
        ) {
            elements.push(root);
        }

        if (typeof root.querySelectorAll === 'function') {
            elements.push(...root.querySelectorAll(selector));
        }

        return elements;
    }

    function applyTranslations(root) {
        root = root || document;

        getTranslatableElements(root, '[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;

            const value = t(key);

            if (el.tagName === 'TITLE') {
                document.title = value;
                setElementText(el, value);
                return;
            }

            if (el.tagName === 'OPTION') {
                // OPTION не имеет визуального SVG/DOM-контейнера,
                // поэтому безопасно заменяем только его собственный текст.
                el.textContent = value;
                return;
            }

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = value;
                } else if (el.type !== 'button' && el.type !== 'submit') {
                    el.value = value;
                } else {
                    setElementText(el, value);
                }
                return;
            }

            setElementText(el, value);
        });

        getTranslatableElements(root, '[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                el.setAttribute('placeholder', t(key));
            }
        });

        getTranslatableElements(root, '[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) {
                el.setAttribute('title', t(key));
            }
        });

        getTranslatableElements(root, '[data-i18n-aria-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (key) {
                el.setAttribute('aria-label', t(key));
            }
        });

        updateLanguageButtons();
    }

    /**
     * Обновляет только текстовые узлы языковой кнопки.
     * НИКАКОГО textContent/innerHTML — иконки внутри кнопки сохраняются.
     */
    function updateLanguageButtons() {
        document
            .querySelectorAll('#langBtn, .lang-btn, button.lang')
            .forEach(btn => {
                setElementText(btn, currentLang.toUpperCase());
                btn.setAttribute('data-current-lang', currentLang);
            });
    }

    async function setLanguage(lang) {
        lang = normalizeLang(lang);

        // TM всегда загружается первым и является обязательным fallback.
        await load('tm');

        if (lang !== 'tm') {
            await load(lang);
        }

        currentLang = lang;
        window.currentLang = currentLang;

        // Выбранный язык сохраняется для всех последующих страниц СФЕРЫ.
        // При первом запуске ключ отсутствует, поэтому используется TM.
        try {
            window.localStorage.setItem(STORAGE_KEY, currentLang);
        } catch (error) {
            // Приватный режим/ограничения браузера не должны ломать i18n.
        }

        document.documentElement.lang = currentLang;

        // Сначала обновляем статический DOM.
        // Затем сообщаем модулям, чтобы они могли перерисовать
        // только свои динамические данные на новом языке.
        applyTranslations();

        window.dispatchEvent(
            new CustomEvent('sfera:language-changed', {
                detail: { lang: currentLang }
            })
        );

        // Динамический DOM, созданный слушателями события,
        // также получает перевод без изменения его структуры.
        applyTranslations();

        return currentLang;
    }

    async function cycleLanguage() {
        const index = LANGS.indexOf(currentLang);
        const next = LANGS[(index + 1) % LANGS.length];
        return setLanguage(next);
    }

    async function init() {
        if (initialized) return currentLang;
        if (initPromise) return initPromise;

        initPromise = (async function () {
            // Первый запуск — TM. Если пользователь уже выбирал язык,
            // используем его на этой и последующих страницах.
            let savedLang = DEFAULT_LANG;
            try {
                savedLang = normalizeLang(window.localStorage.getItem(STORAGE_KEY));
            } catch (error) {
                savedLang = DEFAULT_LANG;
            }

            currentLang = savedLang;
            window.currentLang = currentLang;
            document.documentElement.lang = currentLang;

            await load('tm');

            // RU/EN загружаются заранее для быстрого переключения,
            // но до действия пользователя НЕ применяются.
            await Promise.all([
                load('ru'),
                load('en')
            ]);

            applyTranslations();
            updateLanguageButtons();

            initialized = true;
            return currentLang;
        })();

        return initPromise;
    }

    window.i18n = {
        LANGS: LANGS.slice(),
        DEFAULT_LANG,
        translations: dictionaries,
        init,
        setLanguage,
        cycleLanguage,
        apply: applyTranslations,
        t,
        getLang: () => currentLang
    };

    /**
     * ЕДИНСТВЕННЫЙ ЦЕНТРАЛЬНЫЙ обработчик языковой кнопки.
     *
     * Он не вызывает никакой внешний/локальный переводчик.
     * stopPropagation не используется: остальные клики страницы
     * не должны ломаться из-за переключения языка.
     */
    document.addEventListener(
        'click',
        function (event) {
            const button = event.target.closest(
                '#langBtn, .lang-btn, button.lang'
            );

            if (!button) return;

            event.preventDefault();

            // Не даём другим обработчикам именно этой кнопки
            // повторно запускать смену языка, но не блокируем
            // обработчики остальных элементов страницы.
            if (button.dataset.sferaI18nHandled === '1') return;

            button.dataset.sferaI18nHandled = '1';

            cycleLanguage().finally(() => {
                // Снимаем флаг после завершения цикла.
                button.dataset.sferaI18nHandled = '0';
            });
        },
        true
    );

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})(window, document);
