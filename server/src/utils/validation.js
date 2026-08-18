const mongoose = require('mongoose');
const { ApiError } = require('./apiError');

/**
 * Экранирование пользовательского ввода перед подстановкой в RegExp.
 */
const escapeRegex = (text = '') => String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * Регистронезависимый поиск по нескольким полям: buildSearchFilter('ab', ['username', 'email'])
 */
const buildSearchFilter = (search, fields = []) => {
    const term = search ? String(search).trim() : '';
    if (!term || fields.length === 0) return {};

    return {
        $or: fields.map((field) => ({ [field]: { $regex: escapeRegex(term), $options: 'i' } }))
    };
};

/**
 * Проверяет корректность ObjectId, иначе бросает 400.
 */
const assertValidObjectId = (id, label = 'Resource') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest(`Invalid ${label} ID`);
    }
    return id;
};

/**
 * Приводит значение к положительному числу, иначе бросает 400.
 */
const parsePositiveAmount = (value, message = 'Сумма должна быть больше 0') => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw ApiError.badRequest(message);
    }
    return amount;
};

/**
 * Проверяет, что переданы все обязательные поля тела запроса.
 */
const assertRequiredFields = (source = {}, fields = [], message = 'Заполните обязательные поля') => {
    const missing = fields.filter((field) => source[field] === undefined || source[field] === null || source[field] === '');
    if (missing.length > 0) {
        throw ApiError.badRequest(message);
    }
};

/**
 * Доступ разрешён владельцу ресурса или администратору, иначе 403.
 */
const assertOwnerOrAdmin = (ownerId, user, message = 'Нет прав на выполнение операции') => {
    const isOwner = ownerId && user && ownerId.toString() === (user._id || user.id || '').toString();
    if (!isOwner && (!user || user.role !== 'admin')) {
        throw ApiError.forbidden(message);
    }
};

module.exports = {
    escapeRegex,
    buildSearchFilter,
    assertValidObjectId,
    parsePositiveAmount,
    assertRequiredFields,
    assertOwnerOrAdmin
};
