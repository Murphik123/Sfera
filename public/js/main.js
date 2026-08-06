// ТРЕХЪЯЗЫЧНЫЙ СЛОВАРЬ (TM / RU / EN)
const i18n = {
    tm: {
        nav_home: "Baş sahypa",
        nav_marketplace: "Marketpleýs",
        nav_exchange: "Birža",
        nav_trade: "Söwda meýdançasy",
        nav_bank: "Bank",
        nav_docs: "Resmiýetler",
        btn_login: "Girmek",
        hero_tag: "SFERA — SANLY PLATFORMA",
        hero_title: "Türkmenistanyň Ýeke Sanly Platformasy",
        hero_sub: "Söwda • AI • Töleg • Bank • Resmiýet",
        hero_desc: "Elektron söwda, intellektual analitika, maliýe hyzmatlary, resmiýet aýlymyny we sanly döwlet hyzmatlaryny birleşdirýän häzirki zaman döwlet sanly ekosistemasy.",
        btn_start: "Başlamak",
        btn_explore: "Gözden geçirmek",
        mod_title: "Platformanyň Esasy Modullary",
        m1_t: "Birža", m1_d: "Elektron söwda meýdançasy",
        m2_d: "Milli töleg ulgamy",
        m3_d: "Sanly döwlet walýutasy",
        m4_t: "TM Bank", m4_d: "Sanly bank hyzmatlary",
        m5_t: "AI analitika", m5_d: "TM Coin prognozlary, trendler",
        m6_t: "Resmiýetler", m6_d: "Awtomatik tassyklama",
        st_online: "Onlaýn", st_users: "Ulanyjylar", st_orders: "Söwdalar", st_docs: "Resmiýetler",
        footer_copy: "© 2026 — Milli sanly platforma"
    },
    ru: {
        nav_home: "Главная",
        nav_marketplace: "Маркетплейс",
        nav_exchange: "Биржа",
        nav_trade: "Торговая площадка",
        nav_bank: "Банк",
        nav_docs: "Документы",
        btn_login: "Войти",
        hero_tag: "СФЕРА — ЦИФРОВАЯ ПЛАТФОРМА",
        hero_title: "Единая цифровая платформа Туркменистана",
        hero_sub: "Торговля • ИИ • Платежи • Банк • Документы",
        hero_desc: "Современная государственная цифровая экосистема, объединяющая электронную торговлю, аналитику ИИ, финансовые услуги и документооборот.",
        btn_start: "Начать",
        btn_explore: "Обзор",
        mod_title: "Основные модули платформы",
        m1_t: "Биржа", m1_d: "Электронная торговая площадка",
        m2_d: "Национальная платежная система",
        m3_d: "Цифровая государственная валюта",
        m4_t: "ТМ Банк", m4_d: "Цифровые банковские услуги",
        m5_t: "ИИ аналитика", m5_d: "Прогнозы TM Coin, тренды",
        m6_t: "Документы", m6_d: "Автоматическое заверение",
        st_online: "Онлайн", st_users: "Пользователи", st_orders: "Сделки", st_docs: "Документы",
        footer_copy: "© 2026 — Национальная цифровая платформа"
    },
    en: {
        nav_home: "Home",
        nav_marketplace: "Marketplace",
        nav_exchange: "Exchange",
        nav_trade: "Trading Floor",
        nav_bank: "Bank",
        nav_docs: "Documents",
        btn_login: "Sign In",
        hero_tag: "SFERA — DIGITAL PLATFORM",
        hero_title: "Unified Digital Platform of Turkmenistan",
        hero_sub: "Trade • AI • Payments • Bank • Documents",
        hero_desc: "A modern state digital ecosystem combining e-commerce, AI analytics, financial services, and digital public services.",
        btn_start: "Get Started",
        btn_explore: "Explore",
        mod_title: "Core Platform Modules",
        m1_t: "Exchange", m1_d: "E-commerce platform",
        m2_d: "National payment system",
        m3_d: "Digital state currency",
        m4_t: "TM Bank", m4_d: "Digital banking services",
        m5_t: "AI Analytics", m5_d: "TM Coin predictions & trends",
        m6_t: "Documents", m6_d: "Automated verification",
        st_online: "Online", st_users: "Users", st_orders: "Deals", st_docs: "Documents",
        footer_copy: "© 2026 — National Digital Platform"
    }
};

const langs = ["tm", "ru", "en"];
let currentLangIndex = 0;

// ЦИКЛИЧЕСКОЕ ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА (TM -> RU -> EN -> TM)
function rotateLanguage() {
    currentLangIndex = (currentLangIndex + 1) % langs.length;
    const selectedLang = langs[currentLangIndex];

    const langBtn = document.getElementById("langBtn");
    if (langBtn) {
        langBtn.textContent = selectedLang.toUpperCase();
    }

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (i18n[selectedLang] && i18n[selectedLang][key]) {
            el.textContent = i18n[selectedLang][key];
        }
    });
}

// СОЗДАНИЕ НЕОНОВЫХ ЧАСТИЦ
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 4 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}vw`;
        const duration = Math.random() * 10 + 8;
        p.style.animationDuration = `${duration}s`;
        p.style.animationDelay = `${Math.random() * 10}s`;
        container.appendChild(p);
    }
}

// АНИМАЦИЯ СЧЕТЧИКОВ СТАТИСТИКИ
(function initCounters() {
    const counters = [
        { id: "online", target: 234 },
        { id: "users", target: 2340000 },
        { id: "orders", target: 18540291 },
        { id: "docs", target: 11328901 },
        { id: "coin", target: 21000000 }
    ];

    function formatNumber(num) {
        return num.toLocaleString("ru-RU");
    }

    function startCounter(el, target) {
        let current = 0;
        const step = Math.max(1, Math.floor(target / 120));
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = formatNumber(current);
        }, 16);
    }

    window.addEventListener("DOMContentLoaded", () => {
        createParticles();
        setTimeout(() => {
            counters.forEach(c => {
                const el = document.getElementById(c.id);
                if (el) startCounter(el, c.target);
            });
        }, 200);
    });
})();
