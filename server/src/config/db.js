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
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
