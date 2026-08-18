const mongoose = require('mongoose');

/**
 * Проверяет, что значение — корректный ObjectId, переданный строкой.
 * Объекты и массивы отклоняются, чтобы в запрос нельзя было подставить
 * операторы MongoDB (например, { $ne: null }).
 */
exports.isValidObjectId = (value) =>
    typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

/**
 * Приводит значение из query/body к строке; для не-строк возвращает undefined,
 * чтобы операторы MongoDB не попадали в фильтры запросов.
 */
exports.asString = (value) => (typeof value === 'string' ? value : undefined);

/**
 * Оставляет в объекте только разрешённые поля (защита от mass assignment).
 */
exports.pick = (source, allowedFields) =>
    allowedFields.reduce((result, field) => {
        if (source && source[field] !== undefined) result[field] = source[field];
        return result;
    }, {});
