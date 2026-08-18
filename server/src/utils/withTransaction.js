const mongoose = require('mongoose');

/**
 * Выполняет callback внутри транзакции MongoDB, сам делает commit/abort/endSession.
 *
 * @param {(session: import('mongoose').ClientSession) => Promise<any>} fn
 */
const withTransaction = async (fn) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = withTransaction;
