const dns = require('dns');
// Явное указание DNS Яндекса для обхода блокировок SRV-запросов MongoDB
dns.setServers(['77.88.8.8', '77.88.8.1']);

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Поочередный поиск файла .env в папке server и в корне проекта
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const Listing = require('./models/Listing');

// Генерируем тестовый ID продавца для прохождения валидации схемы
const dummySellerId = new mongoose.Types.ObjectId();

const products = [
  {
    title: 'Смартфон Sfera Phone 1',
    price: 450,
    description: 'Тестовый смартфон для проверки маркетплейса',
    category: 'Электроника',
    seller: dummySellerId
  },
  {
    title: 'Беспроводные наушники Sfera Sound',
    price: 80,
    description: 'Качественный звук и шумоподавление',
    category: 'Аксессуары',
    seller: dummySellerId
  }
];

const seedDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('Переменная MONGO_URI не найдена в файле .env или окружении');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Успешное подключение к MongoDB');

    await Listing.deleteMany({});
    console.log('🗑️ Старые товары удалены');

    await Listing.insertMany(products);
    console.log('✅ База успешно заполнена товарами!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка заполнения:', err.message);
    process.exit(1);
  }
};

seedDB();