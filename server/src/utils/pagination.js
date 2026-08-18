const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Разбор ?page= и ?limit= с безопасными значениями по умолчанию.
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPaginationParams = (query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = 100 } = {}) => {
    const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
    const parsedLimit = parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(parsedLimit, 1), maxLimit);

    return { page, limit, skip: (page - 1) * limit };
};

/**
 * Постраничная выборка документов + подсчёт общего количества.
 *
 * @param {import('mongoose').Model} model
 * @param {Object} filter - условие поиска
 * @param {Object} [options]
 * @param {Object} [options.query] - req.query для автоматического разбора page/limit
 * @param {number} [options.page]
 * @param {number} [options.limit]
 * @param {Object} [options.sort={ createdAt: -1 }]
 * @param {string} [options.select]
 * @param {Array<string|Object>} [options.populate] - аргументы для .populate()
 * @returns {Promise<{ items: Array, total: number, page: number, limit: number, pages: number }>}
 */
const paginate = async (model, filter = {}, options = {}) => {
    const { query, sort = { createdAt: -1 }, select, populate = [] } = options;
    const params = query ? getPaginationParams(query, options) : null;
    const page = options.page || (params ? params.page : DEFAULT_PAGE);
    const limit = options.limit || (params ? params.limit : DEFAULT_LIMIT);

    let cursor = model.find(filter);
    if (select) cursor = cursor.select(select);
    populate.forEach((args) => {
        cursor = Array.isArray(args) ? cursor.populate(...args) : cursor.populate(args);
    });

    const items = await cursor
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sort);

    const total = await model.countDocuments(filter);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
};

/**
 * Формирует стандартный постраничный ответ: { <key>: [...], total, page, pages }
 */
const paginatedResponse = (key, { items, total, page, pages }) => ({
    [key]: items,
    total,
    page,
    pages
});

module.exports = { getPaginationParams, paginate, paginatedResponse, DEFAULT_LIMIT };
