document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. МУЛЬТИЯЗЫЧНОСТЬ (TM / RU / EN)
    // ==========================================
    const translations = {
        tm: {
            logo_title: "SFERA",
            logo_subtitle: "Milli Sanly Platforma",
            nav_home: "Baş sahypa",
            nav_marketplace: "Marketpleýs",
            nav_exchange: "Birža",
            nav_trading_platform: "Söwda meýdançasy",
            nav_tm_pay: "TM Pay",
            nav_tm_coin: "TM Coin",
            nav_bank: "Bank",
            nav_ai: "AI",
            nav_docs: "Resmiýetler",
            nav_contacts: "Kontaktlar",
            login_btn: "Girmek",
            hero_tag: "SFERA — SANLY PLATFORMA",
            hero_title: "Türkmenistanyň Ýeke Sanly<br />Platformasy",
            hero_subtitle: "Söwda • AI • Töleg • Bank • Resmiýet",
            hero_text: "Elektron söwda, intellektual analitika, maliýe hyzmatlary, resmiýet aýlymyny we sanly döwlet hyzmatlaryny birleşdirýän häzirki zaman döwlet sanly ekosistemasy.",
            hero_btn_start: "Başlamak",
            hero_btn_demo: "Demo",
            modules_title: "Platformanyň Esasy Modullary",
            module_exchange_title: "Birža",
            module_exchange_desc: "Elektron söwda meýdançasy",
            module_tmpay_title: "TM Pay",
            module_tmpay_desc: "Milli töleg ulgamy",
            module_tmcoin_title: "TM Coin",
            module_tmcoin_desc: "Sanly döwlet walýutasy",
            module_bank_title: "TM Bank",
            module_bank_desc: "Sanly bank hyzmatlary",
            module_ai_title: "AI analitika",
            module_ai_desc: "TM Coin prognozlary, trendler",
            module_docs_title: "Resmiýetler",
            module_docs_desc: "Awtomatik tassyklama",
            stat_online: "Onlaýn",
            stat_users: "Ulanyjylar",
            stat_orders: "Söwdalar",
            stat_docs: "Resmiýetler",
            stat_coin: "TM Coin",
            news_title: "Iň soňky habarlar",
            news1_title: "Platformanyň işe girizilmegi",
            news1_text: "Täze nesil sanly ekosistema.",
            news2_title: "AI moduly",
            news2_text: "Resmiýetleri awtomatik barlamak.",
            news3_title: "TM Pay",
            news3_text: "Milli çalt töleg ulgamy.",
            footer_title: "SFERA",
            footer_copyright: "© 2026 — Milli sanly platforma"
        },
        ru: {
            logo_title: "СФЕРА",
            logo_subtitle: "Национальная Цифровая Платформа",
            nav_home: "Главная",
            nav_marketplace: "Маркетплейс",
            nav_exchange: "Биржа",
            nav_trading_platform: "Торговая площадка",
            nav_tm_pay: "TM Pay",
            nav_tm_coin: "TM Coin",
            nav_bank: "Банк",
            nav_ai: "ИИ",
            nav_docs: "Документы",
            nav_contacts: "Контакты",
            login_btn: "Войти",
            hero_tag: "СФЕРА — ЦИФРОВАЯ ПЛАТФОРМА",
            hero_title: "Единая цифровая платформа<br />Туркменистана",
            hero_subtitle: "Торговля • ИИ • Платежи • Банк • Документы",
            hero_text: "Современная цифровая экосистема, объединяющая электронную торговлю, интеллектуальную аналитику, финансовые услуги и электронный документооборот.",
            hero_btn_start: "Начать",
            hero_btn_demo: "Демо",
            modules_title: "Основные модули платформы",
            module_exchange_title: "Биржа",
            module_exchange_desc: "Электронная торговая площадка",
            module_tmpay_title: "TM Pay",
            module_tmpay_desc: "Национальная платежная система",
            module_tmcoin_title: "TM Coin",
            module_tmcoin_desc: "Цифровая государственная валюта",
            module_bank_title: "TM Bank",
            module_bank_desc: "Цифровые банковские услуги",
            module_ai_title: "ИИ Аналитика",
            module_ai_desc: "Прогнозы TM Coin, тренды",
            module_docs_title: "Документы",
            module_docs_desc: "Автоматическое утверждение",
            stat_online: "Онлайн",
            stat_users: "Пользователи",
            stat_orders: "Сделки",
            stat_docs: "Документы",
            stat_coin: "TM Coin",
            news_title: "Последние новости",
            news1_title: "Запуск платформы",
            news1_text: "Цифровая экосистема нового поколения.",
            news2_title: "Модуль ИИ",
            news2_text: "Автоматическая проверка документов.",
            news3_title: "TM Pay",
            news3_text: "Национальная система быстрых платежей.",
            footer_title: "СФЕРА",
            footer_copyright: "© 2026 — Национальная цифровая платформа"
        },
        en: {
            logo_title: "SFERA",
            logo_subtitle: "National Digital Platform",
            nav_home: "Home",
            nav_marketplace: "Marketplace",
            nav_exchange: "Exchange",
            nav_trading_platform: "Trading Platform",
            nav_tm_pay: "TM Pay",
            nav_tm_coin: "TM Coin",
            nav_bank: "Bank",
            nav_ai: "AI",
            nav_docs: "Documents",
            nav_contacts: "Contacts",
            login_btn: "Login",
            hero_tag: "SFERA — DIGITAL PLATFORM",
            hero_title: "Unified Digital Platform<br />of Turkmenistan",
            hero_subtitle: "Trade • AI • Payments • Bank • Documents",
            hero_text: "A modern state digital ecosystem combining e-commerce, intelligent analytics, financial services, and electronic document management.",
            hero_btn_start: "Get Started",
            hero_btn_demo: "Demo",
            modules_title: "Core Platform Modules",
            module_exchange_title: "Exchange",
            module_exchange_desc: "E-commerce platform",
            module_tmpay_title: "TM Pay",
            module_tmpay_desc: "National payment system",
            module_tmcoin_title: "TM Coin",
            module_tmcoin_desc: "Digital state currency",
            module_bank_title: "TM Bank",
            module_bank_desc: "Digital banking services",
            module_ai_title: "AI Analytics",
            module_ai_desc: "TM Coin forecasts, trends",
            module_docs_title: "Documents",
            module_docs_desc: "Automated verification",
            stat_online: "Online",
            stat_users: "Users",
            stat_orders: "Deals",
            stat_docs: "Documents",
            stat_coin: "TM Coin",
            news_title: "Latest News",
            news1_title: "Platform Launch",
            news1_text: "Next-generation digital ecosystem.",
            news2_title: "AI Module",
            news2_text: "Automated document verification.",
            news3_title: "TM Pay",
            news3_text: "National fast payment system.",
            footer_title: "SFERA",
            footer_copyright: "© 2026 — National Digital Platform"
        }
    };

    const langOrder = ['tm', 'ru', 'en'];
    let currentLangIndex = 0;
    const langBtn = document.getElementById('langBtn');

    function setLanguage(lang) {
        document.documentElement.lang = lang;
        langBtn.textContent = lang.toUpperCase();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                el.innerHTML = translations[lang][key];
            }
        });
    }

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLangIndex = (currentLangIndex + 1) % langOrder.length;
            setLanguage(langOrder[currentLangIndex]);
        });
    }

    // Инициализация Туркменского языка по умолчанию
    setLanguage('tm');

    // ==========================================
    // 2. НАВИГАЦИЯ И МОБИЛЬНОЕ МЕНЮ
    // ==========================================
    const hamburger = document.getElementById('hamburger');
    const mainNav = document.getElementById('mainNav');
    const dropdownMarketplace = document.getElementById('dropdownMarketplace');

    if (hamburger && mainNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
    }

    if (dropdownMarketplace) {
        dropdownMarketplace.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                dropdownMarketplace.classList.toggle('open');
            }
        });
    }

    // ==========================================
    // 3. АНИМАЦИЯ СЧЕТЧИКОВ СТАТИСТИКИ
    // ==========================================
    const statsData = {
        online: 12480,
        users: 850400,
        orders: 342100,
        docs: 1205000,
        coin: 99.8
    };

    function animateCounters() {
        Object.keys(statsData).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            const target = statsData[id];
            const isFloat = !Number.isInteger(target);
            const duration = 2000;
            const startTime = performance.now();

            function update(now) {
                const progress = Math.min((now - startTime) / duration, 1);
                const current = target * progress;
                el.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
        });
    }

    // Запуск анимации цифр
    animateCounters();

    // ==========================================
    // 4. ДИНАМИЧЕСКИЙ ФОН И ЧАСТИЦЫ (CANVAS)
    // ==========================================
    const canvas = document.getElementById('heroCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        });

        const particles = Array.from({ length: 40 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        }));

        function renderCanvas() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(renderCanvas);
        }

        renderCanvas();
    }
});
