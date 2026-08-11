/**
 * SFERA Platform — Particles Module
 * Version: 1.0
 */

export function createParticles(containerId = 'particles', count = 60) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.children.length > 0) return;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'particle';
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDuration = (6 + Math.random() * 12) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(particle);
    }
}
