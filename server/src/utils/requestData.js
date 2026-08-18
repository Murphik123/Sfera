/**
 * Абсолютный базовый URL текущего запроса (учитывает reverse proxy).
 */
const getRequestBaseUrl = (req) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    return `${protocol}://${req.get('host')}`;
};

/**
 * Ссылки на файлы, загруженные через multer (req.files).
 * @returns {Array<{ url: string, public_id: string }>}
 */
const collectUploadedImages = (req, folder = 'uploads') => {
    if (!req.files || req.files.length === 0) return [];

    const baseUrl = getRequestBaseUrl(req);
    return req.files.map((file) => ({
        url: `${baseUrl}/${folder}/${file.filename}`,
        public_id: file.filename
    }));
};

/**
 * Поля multipart-формы приходят строками: разбираем JSON, не падая на некорректном вводе.
 */
const parseJsonField = (value, fallback = {}) => {
    if (typeof value !== 'string') return value === undefined ? fallback : value;

    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
};

module.exports = { getRequestBaseUrl, collectUploadedImages, parseJsonField };
