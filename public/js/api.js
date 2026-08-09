/**
 * Sfera Core API Engine
 * Синхронизирован с Express routes и JWT/Redis авторизацией
 */

const API_CONFIG = {
    // Автоматический выбор между локальной разработкой и деплоем на Render
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : '/api',
    TOKEN_KEY: 'sfera_token',
    USER_KEY: 'sfera_user'
};

class ApiService {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
    }

    /**
     * Формирование заголовков аутентификации JWT
     */
    getAuthHeaders() {
        const token = localStorage.getItem(API_CONFIG.TOKEN_KEY);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Универсальный метод отправки запросов
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers
        };

        // Для FormData (загрузка файлов через Multer) Content-Type устанавливается автоматически
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            // Автоматический разлогин при 401 (недействительный токен или Redis-сессия)
            if (response.status === 401) {
                this.logout();
                const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
                if (!isAuthPage) {
                    window.location.href = '/login.html';
                }
                throw new Error(data.message || 'Сессия завершена');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка выполнения запроса');
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error.message);
            throw error;
        }
    }

    // ==========================================
    // AUTHENTICATION MODULE (/api/auth)
    // ==========================================

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.success && data.token) {
            localStorage.setItem(API_CONFIG.TOKEN_KEY, data.token);
            localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(data.user));
        }
        return data;
    }

    async getProfile() {
        return await this.request('/auth/me', { method: 'GET' });
    }

    logout() {
        localStorage.removeItem(API_CONFIG.TOKEN_KEY);
        localStorage.removeItem(API_CONFIG.USER_KEY);
        window.location.href = '/login.html';
    }

    getCurrentUser() {
        const user = localStorage.getItem(API_CONFIG.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    isAuthenticated() {
        return !!localStorage.getItem(API_CONFIG.TOKEN_KEY);
    }
}

window.api = new ApiService();
