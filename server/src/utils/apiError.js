/**
 * Единый тип ошибки для REST-контроллеров.
 * Позволяет бросать ошибку с HTTP-статусом вместо ручного res.status(...).json(...)
 */
class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        if (details !== undefined) this.details = details;
    }

    static badRequest(message, details) {
        return new ApiError(400, message, details);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Not found') {
        return new ApiError(404, message);
    }

    static unavailable(message = 'Service unavailable') {
        return new ApiError(503, message);
    }
}

/**
 * Бросает 404, если документ не найден. Иначе возвращает сам документ.
 */
const assertFound = (doc, message = 'Not found') => {
    if (!doc) throw ApiError.notFound(message);
    return doc;
};

module.exports = { ApiError, assertFound };
