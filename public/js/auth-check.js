// js/auth-check.js — подключить во все HTML файлы проекта
(function () {
    const token = localStorage.getItem('token') || localStorage.getItem('sfera_token');
    const userRaw = localStorage.getItem('user');
    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch (e) {
        user = null;
    }

    const role = user?.role || localStorage.getItem('sfera_role') || 'guest';

    window.SFERA_AUTH = {
        token: token,
        user: user,
        role: role,
        isAdmin: role === 'admin'
    };

    // Если закрытый раздел admin.html пытается открыть не-админ
    if (window.location.pathname.includes('admin.html') && role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

// Перехватчик всех fetch-запросов для автоматической передачи токена
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
    const token = localStorage.getItem('token') || localStorage.getItem('sfera_token');
    options.headers = options.headers || {};

    if (token) {
        if (options.headers instanceof Headers) {
            options.headers.append('Authorization', `Bearer ${token}`);
        } else {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return originalFetch(url, options);
};
