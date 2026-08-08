/**
 * SFERA Platform — Main Entry Point
 * Version: 1.0
 */

import { createParticles } from './particles.js';
import { getTheme, toggleTheme } from './theme.js';
import { animateCounter, initScrollReveal, staggerReveal } from './animations.js';

// Инициализация частиц при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Частицы
    createParticles('particles', 60);

    // Анимация счётчиков на главной (если они есть)
    const counters = [
        { id: 'online', target: 1842 },
        { id: 'users', target: 2340000 },
        { id: 'orders', target: 18540291 },
        { id: 'docs', target: 11328901 },
        { id: 'coin', target: 21000000 }
    ];
    counters.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) {
            animateCounter(el, c.target);
        }
    });

    // Плавное появление при скролле (элементы с классом .reveal)
    initScrollReveal('.reveal');

    // Последовательное появление (элементы с классом .stagger)
    staggerReveal('.stagger', 100);

    // Переключение темы (можно привязать к кнопке)
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
        themeToggleBtn.textContent = getTheme() === 'dark' ? '🌙' : '☀️';
    }

    // Обработка гамбургера (хедера)
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    if (hamburger && nav) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    // Закрытие меню при клике на ссылку (для мобильных)
    nav?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1200) {
                hamburger?.classList.remove('active');
                nav?.classList.remove('active');
            }
        });
    });

    console.log('✅ SFERA Platform initialized');
});
