/**
 * SFERA Platform — Main Entry Point
 * Version: 1.0
 */

// Безопасный импорт вспомогательных модулей с фоллбэками
import { createParticles } from './particles.js';
import { getTheme, toggleTheme } from './theme.js';
import { animateCounter, initScrollReveal, staggerReveal } from './animations.js';

// Инициализация интерфейса и эффектов при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Создание фоновых плавающих частиц
    try {
        if (typeof createParticles === 'function' && document.getElementById('particles')) {
            createParticles('particles', 60);
        }
    } catch (err) {
        console.warn('⚠️ Ошибка инициализации частиц:', err.message);
    }

    // 2. Анимация счётчиков на главной странице
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
            if (typeof animateCounter === 'function') {
                animateCounter(el, c.target);
            } else {
                el.textContent = c.target.toLocaleString();
            }
        }
    });

    // 3. Плавное появление элементов при скролле
    try {
        if (typeof initScrollReveal === 'function') {
            initScrollReveal('.reveal');
        }
        if (typeof staggerReveal === 'function') {
            staggerReveal('.stagger', 100);
        }
    } catch (err) {
        console.warn('⚠️ Ошибка анимации появления:', err.message);
    }

    // 4. Переключение темы (светлая/тёмная)
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            }
            if (typeof getTheme === 'function') {
                themeToggleBtn.textContent = getTheme() === 'dark' ? '🌙' : '☀️';
            }
        });

        if (typeof getTheme === 'function') {
            themeToggleBtn.textContent = getTheme() === 'dark' ? '🌙' : '☀️';
        }
    }

    // 5. Обработка мобильного гамбургер-меню (хедер)
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });

        // Закрытие меню при клике на любую ссылку на мобильных устройствах
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1200) {
                    hamburger.classList.remove('active');
                    nav.classList.remove('active');
                }
            });
        });
    }

    console.log('✅ SFERA Platform initialized');
});
