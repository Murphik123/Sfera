// server/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Поддержка обеих распространенных переменных окружения
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error('❌ Ошибка: Переменная MONGODB_URI/MONGO_URI не задана в .env!');
    }

    // В Mongoose 7+ useNewUrlParser и useUnifiedTopology не требуются
    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Ошибки и обрывы после успешного подключения раньше нигде не видны были:
    // запросы просто начинали падать по таймауту без внятной причины.
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.stack || error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected — запросы будут буферизованы до восстановления');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.stack || error);
    process.exit(1);
  }
};

module.exports = connectDB;
