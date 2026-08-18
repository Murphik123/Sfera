const { ApiError } = require('./apiError');

/**
 * Форматы тела ошибки, исторически используемые разными модулями API.
 */
const ERROR_FORMATS = {
    // { message: '...' }
    message: (message, detail) => (detail ? { message, error: detail } : { message }),
    // { success: false, message: '...' }
    success: (message, detail) => (detail ? { success: false, message, error: detail } : { success: false, message }),
    // { error: '...' }
    error: (message) => ({ error: message })
};

/**
 * Оборачивает async-обработчик Express: убирает повторяющийся try/catch
 * и приводит ответы об ошибках к единому виду.
 *
 * @param {Function} handler - (req, res) => Promise
 * @param {Object} [options]
 * @param {'message'|'success'|'error'} [options.format='message'] - формат тела ответа
 * @param {number} [options.status=500] - статус для непредвиденных ошибок
 * @param {string} [options.message] - человекочитаемое сообщение для непредвиденных ошибок
 *                                     (текст самой ошибки уходит в поле error)
 * @param {string} [options.logLabel] - префикс для console.error
 */
const asyncHandler = (handler, options = {}) => {
    const { format = 'message', status = 500, message, logLabel } = options;
    const buildBody = ERROR_FORMATS[format] || ERROR_FORMATS.message;

    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            if (logLabel) console.error(`${logLabel}:`, error);
            if (res.headersSent) return;

            const isApiError = error instanceof ApiError;
            const errorStatus = isApiError ? error.status : status;
            const body = isApiError
                ? buildBody(error.message, error.details)
                : buildBody(message || error.message, message ? error.message : undefined);

            res.status(errorStatus).json(body);
        }
    };
};

module.exports = asyncHandler;
module.exports.asyncHandler = asyncHandler;
module.exports.ERROR_FORMATS = ERROR_FORMATS;
