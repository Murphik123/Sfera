/* ==========================================================================
   SFERA PLATFORM — MAIN CLIENT SCRIPT (Full Architecture + WebRTC + Sockets)
   ========================================================================== */

// --- Конфигурация WebRTC (STUN-серверы для обхода NAT) ---
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// --- Глобальное состояние приложения ---
let socket = null;
let peerConnection = null;
let localStream = null;
let activeCallUserId = null;
let currentChatUserId = null;
let currentUserId = localStorage.getItem('userId') || null;
let currentLang = localStorage.getItem('sfera_lang') || 'ru';

// --- Словарь локализации (RU / TM / EN) ---
const translations = {
    ru: {
        messenger: "Мессенджер",
        marketplace: "Маркетплейс",
        banking: "Банк & ТМ-Pay",
        docs: "Документация",
        selectChat: "Выберите пользователя для общения",
        writeMessage: "Напишите сообщение...",
        send: "Отправить",
        callStatusInit: "Инициализация вызова...",
        callStatusIncoming: "Входящий звонок...",
        callStatusCalling: "Вызов...",
        callStatusTalking: "Разговор...",
        callStatusConnecting: "Соединение...",
        accept: "Ответить",
        reject: "Сбросить",
        guest: "Гость"
    },
    tm: {
        messenger: "Habarlaşmak",
        marketplace: "Bazarymyz",
        banking: "Bank & TM-Pay",
        docs: "Resminamalar",
        selectChat: "Gürleşmek üçin ulanyjyny saýlaň",
        writeMessage: "Hatyňyzy ýazyň...",
        send: "Ugratmak",
        callStatusInit: "Jaň taýýarlanylýar...",
        callStatusIncoming: "Gelen jaň...",
        callStatusCalling: "Jaň edilýär...",
        callStatusTalking: "Gürleşilýär...",
        callStatusConnecting: "Birikdirilýär...",
        accept: "Jap bermek",
        reject: "Goýbolsun etmek",
        guest: "Müşderi"
    },
    en: {
        messenger: "Messenger",
        marketplace: "Marketplace",
        banking: "Banking & TM-Pay",
        docs: "Documentation",
        selectChat: "Select a user to chat",
        writeMessage: "Type a message...",
        send: "Send",
        callStatusInit: "Initializing call...",
        callStatusIncoming: "Incoming call...",
        callStatusCalling: "Calling...",
        callStatusTalking: "In call...",
        callStatusConnecting: "Connecting...",
        accept: "Accept",
        reject: "Decline",
        guest: "Guest"
    }
};

// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initNavigation();
    initUIEvents();

    if (currentUserId) {
        initSocketConnection(currentUserId);
        loadUsers();
    }
});

/* ==========================================================================
   1. МУЛЬТИЯЗЫЧНОСТЬ И НАВИГАЦИЯ ВКТАДОК
   ========================================================================== */

function initLanguage() {
    setLanguage(currentLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('sfera_lang', lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    const t = translations[lang];
    
    // Обновление текстов интерфейса
    const navMessenger = document.querySelector('[data-tab="messenger"]');
    const navMarketplace = document.querySelector('[data-tab="marketplace"]');
    const navBanking = document.querySelector('[data-tab="banking"]');
    const navDocs = document.querySelector('[data-tab="docs"]');

    if (navMessenger) navMessenger.innerText = t.messenger;
    if (navMarketplace) navMarketplace.innerText = t.marketplace;
    if (navBanking) navBanking.innerText = t.banking;
    if (navDocs) navDocs.innerText = t.docs;

    const msgInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const acceptBtn = document.getElementById('acceptCallBtn');
    const rejectBtn = document.getElementById('rejectCallBtn');

    if (msgInput) msgInput.placeholder = t.writeMessage;
    if (sendBtn) sendBtn.innerText = t.send;
    if (acceptBtn) acceptBtn.innerText = t.accept;
    if (rejectBtn) rejectBtn.innerText = t.reject;
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const activeContent = document.getElementById(`tab-${targetTab}`);
            if (activeContent) activeContent.classList.add('active');
        });
    });
}

/* ==========================================================================
   2. SOCKET.IO И РЕАЛЬНОЕ ВРЕМЯ
   ========================================================================== */

function initSocketConnection(userId) {
    if (typeof io === 'undefined') {
        console.error('Socket.io library not loaded!');
        return;
    }

    socket = io();

    // Регистрация на сервере
    socket.emit('register_user', userId);

    // Прием новых сообщений
    socket.on('receive_message', (data) => {
        if (data.senderId === currentChatUserId) {
            appendMessage(data.text, 'incoming');
        }
    });

    // Обработка статуса пользователей (online/offline)
    socket.on('user_status_change', (data) => {
        const userElem = document.querySelector(`[data-user-id="${data.userId}"]`);
        if (userElem) {
            userElem.classList.toggle('online', data.online);
        }
    });

    /* --- Сигналинг WebRTC звонков --- */
    socket.on('incoming_call', async (data) => {
        activeCallUserId = data.from;
        const t = translations[currentLang];
        
        document.getElementById('callModal').style.display = 'flex';
        document.getElementById('callStatusText').innerText = t.callStatusIncoming;
        document.getElementById('acceptCallBtn').style.display = 'inline-block';

        document.getElementById('acceptCallBtn').onclick = async () => {
            await handleAcceptCall(data);
        };
    });

    socket.on('call_accepted', async (signal) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
            document.getElementById('callStatusText').innerText = translations[currentLang].callStatusTalking;
        }
    });

    socket.on('ice_candidate', async (data) => {
        if (peerConnection && data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error('Ошибка добавления ICE кандидата:', e);
            }
        }
    });

    socket.on('call_ended', () => {
        closeCallUI();
    });
}

/* ==========================================================================
   3. REST API И УПРАВЛЕНИЕ ЧАТОМ
   ========================================================================== */

async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        usersList.innerHTML = '';

        users.forEach(user => {
            if (user._id === currentUserId) return;

            const div = document.createElement('div');
            div.className = 'user-item';
            div.setAttribute('data-user-id', user._id);
            div.innerHTML = `
                <div class="user-avatar">👤</div>
                <div class="user-info">
                    <span class="user-name">${user.name || user.username || user.email}</span>
                </div>
            `;
            div.onclick = () => selectUser(user);
            usersList.appendChild(div);
        });
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
    }
}

function selectUser(user) {
    currentChatUserId = user._id;
    document.getElementById('chatTitle').innerText = user.name || user.username || user.email;
    
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    
    const audioBtn = document.getElementById('audioCallBtn');
    const videoBtn = document.getElementById('videoCallBtn');
    if (audioBtn) audioBtn.style.display = 'inline-block';
    if (videoBtn) videoBtn.style.display = 'inline-block';

    loadMessages(user._id);
}

async function loadMessages(recipientId) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    try {
        const res = await fetch(`/api/chat/history/${recipientId}`);
        const messages = await res.json();
        messages.forEach(msg => {
            const type = (msg.senderId === currentUserId || msg.sender === currentUserId) ? 'outgoing' : 'incoming';
            appendMessage(msg.text || msg.content, type);
        });
    } catch (err) {
        console.error('Ошибка загрузки истории чата:', err);
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatUserId) return;

    appendMessage(text, 'outgoing');

    if (socket) {
        socket.emit('send_message', {
            recipientId: currentChatUserId,
            text: text
        });
    }

    input.value = '';
}

function appendMessage(text, type) {
    const container = document.getElementById('messagesContainer');
    const placeholder = container.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

/* ==========================================================================
   4. WEBRTC — ГОЛОСОВЫЕ И ВИДЕОЗВОНКИ
   ========================================================================== */

async function startCall(isVideo) {
    if (!currentChatUserId) return;
    activeCallUserId = currentChatUserId;
    const t = translations[currentLang];

    document.getElementById('callModal').style.display = 'flex';
    document.getElementById('callStatusText').innerText = t.callStatusCalling;
    document.getElementById('acceptCallBtn').style.display = 'none';

    setupPeerConnection();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        document.getElementById('localVideo').srcObject = localStream;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('call_user', {
            userToCall: activeCallUserId,
            signalData: offer,
            isVideo: isVideo
        });
    } catch (err) {
        console.error('Доступ к медиаустройствам отклонен:', err);
        closeCallUI();
    }
}

async function handleAcceptCall(data) {
    const t = translations[currentLang];
    document.getElementById('acceptCallBtn').style.display = 'none';
    document.getElementById('callStatusText').innerText = t.callStatusConnecting;

    setupPeerConnection();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: data.isVideo });
        document.getElementById('localVideo').srcObject = localStream;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer_call', {
            to: data.from,
            signal: answer
        });
    } catch (err) {
        console.error('Ошибка принятия вызова:', err);
        closeCallUI();
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && activeCallUserId && socket) {
            socket.emit('ice_candidate', {
                to: activeCallUserId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
}

function closeCallUI() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    activeCallUserId = null;
    const modal = document.getElementById('callModal');
    if (modal) modal.style.display = 'none';
}

/* ==========================================================================
   5. ВСПОМОГАТЕЛЬНЫЕ СОБЫТИЯ И КНОПКИ
   ========================================================================== */

function initUIEvents() {
    const sendBtn = document.getElementById('sendBtn');
    const msgInput = document.getElementById('messageInput');
    const audioBtn = document.getElementById('audioCallBtn');
    const videoBtn = document.getElementById('videoCallBtn');
    const rejectBtn = document.getElementById('rejectCallBtn');

    if (sendBtn) sendBtn.onclick = sendMessage;
    if (msgInput) {
        msgInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
    }

    if (audioBtn) audioBtn.onclick = () => startCall(false);
    if (videoBtn) videoBtn.onclick = () => startCall(true);
    if (rejectBtn) {
        rejectBtn.onclick = () => {
            if (activeCallUserId && socket) {
                socket.emit('end_call', { to: activeCallUserId });
            }
            closeCallUI();
        };
    }
}
