/* ==========================================================================
   SFERA PLATFORM — MAIN SERVER (Node.js + Express + Socket.io)
   ========================================================================== */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ДИНАМИЧЕСКИЙ ПОИСК ПАПКИ PUBLIC ---
let publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
    publicPath = path.join(__dirname, '..', 'public');
}

console.log(`📂 Раздача статики из папки: ${publicPath}`);
app.use(express.static(publicPath));

// Автоматическое подключение маршрутов REST API
const routesPath = path.join(__dirname, 'src', 'routes');
const fallbackRoutesPath = path.join(__dirname, 'routes');
const actualRoutesPath = fs.existsSync(routesPath) ? routesPath : (fs.existsSync(fallbackRoutesPath) ? fallbackRoutesPath : null);

if (actualRoutesPath) {
    console.log(`📁 Найдена папка маршрутов (routes): ${actualRoutesPath}`);
    fs.readdirSync(actualRoutesPath).forEach(file => {
        if (file.endsWith('.js')) {
            const routeName = file.replace(/Routes\.js$|\.js$/, '');
            let prefix = `/api/${routeName}`;
            if (file === 'paymentRoutes.js') prefix = '/api/tmpay';
            
            const routeModule = require(path.join(actualRoutesPath, file));
            app.use(prefix, routeModule);
            console.log(`✅ Маршрут подключен: ${prefix} -> ${file}`);
        }
    });
}

// --- WebSocket & WebRTC Signaling Logic ---
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        activeUsers.set(userId, socket.id);
        io.emit('user_status_change', { userId, online: true });
    });

    socket.on('send_message', (data) => {
        const recipientSocketId = activeUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receive_message', data);
        }
    });

    socket.on('call_user', (data) => {
        const recipientSocketId = activeUsers.get(data.userToCall);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming_call', {
                signal: data.signalData,
                from: data.from,
                isVideo: data.isVideo
            });
        }
    });

    socket.on('answer_call', (data) => {
        const callerSocketId = activeUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_accepted', data.signal);
        }
    });

    socket.on('ice_candidate', (data) => {
        const recipientSocketId = activeUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('ice_candidate', { candidate: data.candidate });
        }
    });

    socket.on('end_call', (data) => {
        const recipientSocketId = activeUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call_ended');
        }
    });

    socket.on('disconnect', () => {
        for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                io.emit('user_status_change', { userId, online: false });
                break;
            }
        }
    });
});

// Фолбэк для фронтенда и HTML страниц
app.get('*', (req, res) => {
    const requestedPath = path.join(publicPath, req.path);
    if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
        return res.sendFile(requestedPath);
    }

    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Front-end main file not found.');
    }
});

// Запуск сервера
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`🔌 WebSocket готов`);
});
