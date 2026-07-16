// ============================================================
// ОСНОВНОЙ СКРИПТ (вынесен из index.html)
// Путь: public/js/main.js
// ============================================================

// =====================================================
// ПЕРЕВОДЫ
// =====================================================
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
        hero_title: "Türkmenistanyň Ýeke Sanly<br>Platformasy",
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
        module_ai_desc: "TM Coin prokgnozlary, trendler",
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
        hero_title: "Единая цифровая<br>платформа Туркменистана",
        hero_subtitle: "Торговля • ИИ • Платежи • Банк • Документооборот",
        hero_text: "Современная государственная цифровая экосистема, объединяющая электронную торговлю, интеллектуальную аналитику, финансовые сервисы, документооборот и цифровые государственные услуги.",
        hero_btn_start: "Начать работу",
        hero_btn_demo: "Демо",
        modules_title: "Основные модули платформы",
        module_exchange_title: "Биржа",
        module_exchange_desc: "Электронная торговая площадка",
        module_tmpay_title: "TM Pay",
        module_tmpay_desc: "Национальная платежная система",
        module_tmcoin_title: "TM Coin",
        module_tmcoin_desc: "Цифровая государственная валюта",
        module_bank_title: "ТМ Банк",
        module_bank_desc: "Цифровые банковские услуги",
        module_ai_title: "ИИ-аналитика",
        module_ai_desc: "Прогнозы курса TM Coin, тренды",
        module_docs_title: "Документы",
        module_docs_desc: "Автоматическая верификация",
        stat_online: "Онлайн",
        stat_users: "Пользователей",
        stat_orders: "Сделок",
        stat_docs: "Документов",
        stat_coin: "TM Coin",
        news_title: "Последние новости",
        news1_title: "Запуск платформы",
        news1_text: "Современная цифровая экосистема нового поколения.",
        news2_title: "ИИ модуль",
        news2_text: "Автоматическая проверка документов.",
        news3_title: "TM Pay",
        news3_text: "Национальная система мгновенных платежей.",
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
        hero_title: "Unified Digital<br>Platform of Turkmenistan",
        hero_subtitle: "Trade • AI • Payments • Bank • Document Flow",
        hero_text: "A modern state digital ecosystem that combines e-commerce, intelligent analytics, financial services, document management and digital government services.",
        hero_btn_start: "Get Started",
        hero_btn_demo: "Demo",
        modules_title: "Main Platform Modules",
        module_exchange_title: "Exchange",
        module_exchange_desc: "Electronic trading platform",
        module_tmpay_title: "TM Pay",
        module_tmpay_desc: "National payment system",
        module_tmcoin_title: "TM Coin",
        module_tmcoin_desc: "Digital state currency",
        module_bank_title: "TM Bank",
        module_bank_desc: "Digital banking services",
        module_ai_title: "AI Analytics",
        module_ai_desc: "TM Coin price forecasts, trends",
        module_docs_title: "Documents",
        module_docs_desc: "Automatic verification",
        stat_online: "Online",
        stat_users: "Users",
        stat_orders: "Transactions",
        stat_docs: "Documents",
        stat_coin: "TM Coin",
        news_title: "Latest News",
        news1_title: "Platform Launch",
        news1_text: "Next-generation digital ecosystem.",
        news2_title: "AI Module",
        news2_text: "Automatic document verification.",
        news3_title: "TM Pay",
        news3_text: "National instant payment system.",
        footer_title: "SFERA",
        footer_copyright: "© 2026 — National Digital Platform"
    }
};

// =====================================================
// УСТАНОВКА ЯЗЫКА (по умолчанию TM)
// =====================================================
let currentLang = localStorage.getItem('lang') || 'tm';

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            if (el.innerHTML.includes('<br>')) {
                el.innerHTML = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });
    document.getElementById('langBtn').textContent = lang.toUpperCase();
    localStorage.setItem('lang', lang);
}

// =====================================================
// КНОПКА ПЕРЕКЛЮЧЕНИЯ (TM → RU → EN → TM …)
// =====================================================
const langBtn = document.getElementById('langBtn');
const langCycle = ['tm', 'ru', 'en'];
let langIndex = langCycle.indexOf(currentLang);
if (langIndex === -1) langIndex = 0;

langBtn.addEventListener('click', function() {
    langIndex = (langIndex + 1) % langCycle.length;
    setLanguage(langCycle[langIndex]);
});

// =====================================================
// АНИМИРОВАННЫЕ СЧЁТЧИКИ
// =====================================================
const statsData = {
    online: { current: 0, target: 1842 },
    users: { current: 0, target: 2340000 },
    orders: { current: 0, target: 18540291 },
    docs: { current: 0, target: 11328901 },
    coin: { current: 0, target: 21000000 }
};

function animateCounter(element, target, duration = 3000) {
    let start = 0;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString('ru-RU');
    }, stepTime);
}

function startCounters() {
    animateCounter(document.getElementById('online'), statsData.online.target, 2000);
    animateCounter(document.getElementById('users'), statsData.users.target, 4000);
    animateCounter(document.getElementById('orders'), statsData.orders.target, 4000);
    animateCounter(document.getElementById('docs'), statsData.docs.target, 4000);
    animateCounter(document.getElementById('coin'), statsData.coin.target, 4000);
}

function updateOnline() {
    const onlineEl = document.getElementById('online');
    const base = statsData.online.target;
    const variation = Math.floor(Math.random() * 200 - 100);
    const newVal = Math.max(0, base + variation);
    onlineEl.textContent = newVal.toLocaleString('ru-RU');
    statsData.online.target = newVal;
}

// =====================================================
// ПОЛУЧЕНИЕ СТАТИСТИКИ С БЭКЕНДА
// =====================================================
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        statsData.online.target = data.online || 1842;
        statsData.users.target = data.users || 2340000;
        statsData.orders.target = data.orders || 18540291;
        statsData.docs.target = data.docs || 11328901;
        statsData.coin.target = data.coin || 21000000;
        startCounters();
    } catch (e) {
        console.log('Используем локальные данные');
        startCounters();
    }
}

// =====================================================
// ГАМБУРГЕР И ВЫПАДАЮЩИЕ МЕНЮ
// =====================================================
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('mainNav');
hamburger.addEventListener('click', function() {
    this.classList.toggle('active');
    nav.classList.toggle('active');
});
nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function() {
        if (window.innerWidth <= 1200) {
            hamburger.classList.remove('active');
            nav.classList.remove('active');
        }
    });
});
const dropdown = document.getElementById('dropdownMarketplace');
const dropdownLink = dropdown.querySelector('> a');
dropdownLink.addEventListener('click', function(e) {
    if (window.innerWidth <= 1200) {
        e.preventDefault();
        dropdown.classList.toggle('open');
    }
});

// =====================================================
// CANVAS (линии данных)
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        w = canvas.width;
        h = canvas.height;
    }
    resize();
    window.addEventListener('resize', resize);

    const points = [];
    for (let i = 0; i < 30; i++) {
        points.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
        });
    }

    function drawLines() {
        ctx.clearRect(0, 0, w, h);
        points.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
        });
        for (let i = 0; i < points.length; i++) {
            for (let j = i+1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.strokeStyle = `rgba(0,212,255,${0.15 * (1 - dist/150)})`;
                    ctx.stroke();
                }
            }
        }
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,212,255,0.5)';
            ctx.fill();
        });
        requestAnimationFrame(drawLines);
    }
    drawLines();
});

// =====================================================
// ЧАСТИЦЫ
// =====================================================
const particles = document.getElementById('particles');
if (particles) {
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDuration = (6 + Math.random() * 12) + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        particles.appendChild(p);
    }
}

// =====================================================
// INTERSECTION OBSERVER (анимация появления)
// =====================================================
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.card, .news-card, .stat').forEach(el => {
    el.classList.add('hidden');
    observer.observe(el);
});

// =====================================================
// HOVER ЭФФЕКТ НА КАРТОЧКАХ
// =====================================================
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.background = `
            radial-gradient(circle at ${x}px ${y}px,
            rgba(0,212,255,.18),
            rgba(255,255,255,.05))
        `;
    });
    card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255,255,255,.06)';
    });
});

// =====================================================
// ЛИПКИЙ ХЕДЕР
// =====================================================
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.background = 'rgba(5,15,25,.85)';
        header.style.boxShadow = '0 10px 35px rgba(0,0,0,.35)';
    } else {
        header.style.background = 'rgba(5,15,25,.55)';
        header.style.boxShadow = 'none';
    }
});

// =====================================================
// КНОПКИ (hover)
// =====================================================
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-3px) scale(1.03)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});

// =====================================================
// ЭФФЕКТ ПУЛЬСАЦИИ СФЕРЫ
// =====================================================
const core = document.querySelector('.core-center');
if (core) {
    setInterval(() => {
        core.style.boxShadow = '0 0 ' + (80 + Math.random() * 60) + 'px rgba(0,212,255,.6)';
    }, 1500);
}

// =====================================================
// ИНИЦИАЛИЗАЦИЯ
// =====================================================
window.addEventListener('load', () => {
    setLanguage(currentLang);
    fetchStats();
    setInterval(updateOnline, 10000);
});

console.log('СФЕРА ПЛАТФОРМА загружена (фронтенд разделён)');
