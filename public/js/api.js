/**
 * Sfera Platform - UI State & Data Synchronizer
 * Автоматически обновляет UI-элементы профиля и баланса
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем наличие API клиента
    if (!window.api) return;

    // Если пользователь авторизован, подгружаем актуальные данные
    if (window.api.isAuthenticated()) {
        try {
            // 1. Получаем профиль
            const profileRes = await window.api.getProfile();
            const user = profileRes.user || profileRes;

            // Обновляем отображение имени пользователя
            const usernameEls = document.querySelectorAll('#user-display-name, .user-display-name');
            usernameEls.forEach(el => {
                if (el) el.textContent = user.username || 'Пользователь';
            });

            // Обновляем аватар
            const avatarEls = document.querySelectorAll('#user-avatar-img, .user-avatar-img');
            avatarEls.forEach(el => {
                if (el && user.avatar) el.src = user.avatar;
            });

            // 2. Получаем данные кошелька/баланса
            try {
                const walletData = await window.api.request('/bank/balance');
                
                // Баланс TMT
                const balanceEls = document.querySelectorAll('#user-balance-tmt, .user-balance-tmt');
                balanceEls.forEach(el => {
                    if (el) el.textContent = `${walletData.balance !== undefined ? walletData.balance : 0} TMT`;
                });

                // Баланс TM Coin
                const tmCoinEls = document.querySelectorAll('#user-balance-tmcoin, .user-balance-tmcoin');
                tmCoinEls.forEach(el => {
                    if (el) el.textContent = `${walletData.tmCoinBalance !== undefined ? walletData.tmCoinBalance : 0} TMC`;
                });

            } catch (bankErr) {
                console.warn('Информация о кошельке недоступна:', bankErr.message);
            }

        } catch (error) {
            console.warn('Ошибка авто-синхронизации профиля:', error.message);
        }
    }
});
