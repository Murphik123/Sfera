require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

connectDB();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health: /ping`);
  console.log(`   Stats: /api/stats`);
});
