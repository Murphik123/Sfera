/**
 * Публичное представление пользователя для ответов API.
 */
const toPublicUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role || 'user',
    avatar: user.avatar || ''
});

module.exports = { toPublicUser };
