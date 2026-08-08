// public/js/api.js
const API_BASE = '/api';

function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

export async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: getHeaders(),
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/login.html';
            }
        }
        throw new Error(data.message || data.error || 'Ошибка запроса');
    }
    return data;
}

// ---- Аутентификация ----
export const authApi = {
    login: (email, password) => apiRequest('/auth/login', 'POST', { email, password }),
    register: (userData) => apiRequest('/auth/register', 'POST', userData),
    getMe: () => apiRequest('/auth/me'),
};

// ---- Пользователи ----
export const userApi = {
    getProfile: () => apiRequest('/users/profile'),
    updateProfile: (data) => apiRequest('/users/profile', 'PUT', data),
};

// ---- Маркетплейс ----
export const marketplaceApi = {
    getListings: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/listings?${query}`);
    },
    getListingById: (id) => apiRequest(`/listings/${id}`),
    createListing: (data) => apiRequest('/listings', 'POST', data),
    updateListing: (id, data) => apiRequest(`/listings/${id}`, 'PUT', data),
    deleteListing: (id) => apiRequest(`/listings/${id}`, 'DELETE'),
    createOrder: (orderData) => apiRequest('/orders', 'POST', orderData),
};

// ---- Банк ----
export const bankApi = {
    getAccounts: () => apiRequest('/accounts'),
    createAccount: (data) => apiRequest('/accounts', 'POST', data),
    getTransactions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/transactions?${query}`);
    },
    createTransaction: (data) => apiRequest('/transactions', 'POST', data),
    getCards: () => apiRequest('/cards'),
    addCard: (data) => apiRequest('/cards', 'POST', data),
    deleteCard: (id) => apiRequest(`/cards/${id}`, 'DELETE'),
};

// ---- TM Coin ----
export const coinApi = {
    getWallet: () => apiRequest('/wallet'),
    transfer: (data) => apiRequest('/wallet/transfer', 'POST', data),
    swap: (data) => apiRequest('/wallet/swap', 'POST', data),
    stake: (data) => apiRequest('/wallet/stake', 'POST', data),
    getStakes: () => apiRequest('/wallet/stakes'),
    unstake: (id) => apiRequest(`/wallet/stakes/${id}`, 'DELETE'),
    getPredictions: () => apiRequest('/predictions'),
    getPrices: () => apiRequest('/prices'),
};

// ---- TM Pay ----
export const payApi = {
    getBalance: () => apiRequest('/pay/balance'),
    transfer: (data) => apiRequest('/pay/transfer', 'POST', data),
    internationalTransfer: (data) => apiRequest('/pay/international', 'POST', data),
    getTransactions: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/pay/transactions?${query}`);
    },
    getCards: () => apiRequest('/pay/cards'),
    addCard: (data) => apiRequest('/pay/cards', 'POST', data),
    deleteCard: (id) => apiRequest(`/pay/cards/${id}`, 'DELETE'),
    getQR: () => apiRequest('/pay/qr'),
};

// ---- Чат (REST) ----
export const chatApi = {
    getDialogs: () => apiRequest('/chats'),
    getMessages: (chatId) => apiRequest(`/chats/${chatId}/messages`),
    sendMessage: (chatId, text) => apiRequest(`/chats/${chatId}/messages`, 'POST', { text }),
    createChat: (data) => apiRequest('/chats', 'POST', data),
    markRead: (chatId) => apiRequest(`/chats/${chatId}/read`, 'PUT'),
};

// ---- Почта ----
export const mailApi = {
    getMails: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/mail?${query}`);
    },
    sendMail: (data) => apiRequest('/mail', 'POST', data),
    getMailById: (id) => apiRequest(`/mail/${id}`),
    markRead: (id) => apiRequest(`/mail/${id}/read`, 'PUT'),
    deleteMail: (id) => apiRequest(`/mail/${id}`, 'DELETE'),
    saveDraft: (data) => apiRequest('/mail/drafts', 'POST', data),
};

// ---- Документы ----
export const documentsApi = {
    upload: (formData) => {
        return fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData,
        }).then(res => res.json());
    },
    getDocuments: () => apiRequest('/documents'),
    deleteDocument: (id) => apiRequest(`/documents/${id}`, 'DELETE'),
    signDocument: (id, data) => apiRequest(`/documents/sign/${id}`, 'POST', data),
};

// ---- AI ----
export const aiApi = {
    getAnalytics: (period) => apiRequest(`/ai/analytics?period=${period}`),
    chat: (message) => apiRequest('/ai/chat', 'POST', { message }),
    createReport: (data) => apiRequest('/ai/reports', 'POST', data),
    getReports: () => apiRequest('/ai/reports'),
};

// ---- Админка ----
export const adminApi = {
    getStats: () => apiRequest('/admin/stats'),
    getUsers: () => apiRequest('/admin/users'),
    getUser: (id) => apiRequest(`/admin/users/${id}`),
    updateUser: (id, data) => apiRequest(`/admin/users/${id}`, 'PUT', data),
    deleteUser: (id) => apiRequest(`/admin/users/${id}`, 'DELETE'),
    getTransactions: (params) => apiRequest('/admin/transactions', 'GET', null, params),
    getListings: () => apiRequest('/admin/listings'),
    updateListing: (id, data) => apiRequest(`/admin/listings/${id}`, 'PUT', data),
    deleteListing: (id) => apiRequest(`/admin/listings/${id}`, 'DELETE'),
    getMails: () => apiRequest('/admin/mails'),
    deleteMail: (id) => apiRequest(`/admin/mails/${id}`, 'DELETE'),
    getPredictions: () => apiRequest('/admin/predictions'),
    createPrediction: (data) => apiRequest('/admin/predictions', 'POST', data),
    deletePrediction: (id) => apiRequest(`/admin/predictions/${id}`, 'DELETE'),
};

// ---- Публичная статистика ----
export const statsApi = {
    getStats: () => apiRequest('/stats'),
};
