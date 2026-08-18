/**
 * SFERA Platform — Main Entry Point
 * Version: 1.0
 */

import { createParticles } from './particles.js';
import { getTheme, toggleTheme } from './theme.js';
import { animateCounter, initScrollReveal, staggerReveal } from './animations.js';

/**
 * Safely returns an element by id without throwing if it does not exist.
 * @param {string} id - DOM element identifier.
 * @returns {HTMLElement | null}
 */
const getElement = (id) => document.getElementById(id) || null;

/**
 * Safely executes a callback and logs a warning if it fails.
 * @param {Function} callback - Function to execute.
 * @param {string} message - Context for the warning.
 */
const safeInvoke = (callback, message) => {
    try {
        callback();
    } catch (error) {
        console.warn(`⚠️ ${message}:`, error?.message || error);
    }
};

/**
 * Initializes the particle background if the target container exists.
 */
const initParticles = () => {
    const container = getElement('particles');
    if (!container || typeof createParticles !== 'function') {
        return;
    }

    createParticles('particles', 60);
};

/**
 * Runs counter animations for known numeric elements on the page.
 */
const initCounters = () => {
    const counters = [
        { id: 'online', target: 1842 },
        { id: 'users', target: 2340000 },
        { id: 'orders', target: 18540291 },
        { id: 'docs', target: 11328901 },
        { id: 'coin', target: 21000000 }
    ];

    counters.forEach(({ id, target }) => {
        const element = getElement(id);
        if (!element) {
            return;
        }

        if (typeof animateCounter === 'function') {
            animateCounter(element, target);
        } else {
            element.textContent = target.toLocaleString();
        }
    });
};

/**
 * Initializes scroll reveal animations for reveal and staggered elements.
 */
const initRevealEffects = () => {
    safeInvoke(() => {
        if (typeof initScrollReveal === 'function') {
            initScrollReveal('.reveal');
        }
        if (typeof staggerReveal === 'function') {
            staggerReveal('.stagger', 100);
        }
    }, 'Ошибка анимации появления');
};

/**
 * Attaches theme toggle behavior and synchronizes its icon state.
 */
const initThemeToggle = () => {
    const themeToggleBtn = getElement('themeToggle');
    if (!themeToggleBtn) {
        return;
    }

    const syncThemeIcon = () => {
        if (typeof getTheme !== 'function') {
            return;
        }

        themeToggleBtn.textContent = getTheme() === 'dark' ? '🌙' : '☀️';
    };

    themeToggleBtn.addEventListener('click', () => {
        if (typeof toggleTheme === 'function') {
            toggleTheme();
        }
        syncThemeIcon();
    });

    syncThemeIcon();
};

/**
 * Initializes the mobile hamburger navigation menu if the relevant elements exist.
 */
const initMobileNavigation = () => {
    const hamburger = getElement('hamburger');
    const nav = getElement('mainNav');

    if (!hamburger || !nav) {
        return;
    }

    hamburger.addEventListener('click', function toggleMenu() {
        this.classList.toggle('active');
        nav.classList.toggle('active');
    });

    nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1200) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
            }
        });
    });
};

/**
 * Initializes all page interactions after the DOM is ready.
 */
const initializeApp = () => {
    initParticles();
    initCounters();
    initRevealEffects();
    initThemeToggle();
    initMobileNavigation();

    console.log('✅ SFERA Platform initialized');
};

document.addEventListener('DOMContentLoaded', initializeApp);
