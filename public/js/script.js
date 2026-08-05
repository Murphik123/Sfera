// STUN-серверы для обхода NAT/Firewall
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

let socket;
let peerConnection;
let localStream;
let activeCallUserId = null;
let currentChatUserId = null;
let currentUserId = localStorage.getItem('userId'); // Извлечение ID авторизованного юзера

document.addEventListener('DOMContentLoaded', () => {
    if (currentUserId) {
        initSocketConnection(currentUserId);
        loadUsers();
    }
    setupUIEvents();
});

// Инициализация Socket.io
function initSocketConnection(userId) {
    socket = io();

    socket.emit('register_user', userId);

    socket.on('receive_message', (data) => {
        if (data.senderId === currentChatUserId) {
            appendMessage(data.text, 'incoming');
        }
    });

    socket.on('incoming_call', async (data) => {
        activeCallUserId = data.from;
        document.getElementById('callModal').style.display = 'flex';
        document.getElementById('callStatusText').innerText = 'Входящий звонок...';
        document.getElementById('acceptCallBtn').style.display = 'inline-block';

        document.getElementById('acceptCallBtn').onclick = async () => {
            await handleAcceptCall(data);
        };
    });

    socket.on('call_accepted', async (signal) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
            document.getElementById('callStatusText').innerText = 'Разговор...';
        }
    });

    socket.on('ice_candidate', async (data) => {
        if (peerConnection && data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error('Ошибка ICE кандидата:', e);
            }
        }
    });

    socket.on('call_ended', () => {
        closeCallUI();
    });
}

// Загрузка диалогов
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        users.forEach(user => {
            if (user._id === currentUserId) return;
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerText = user.name || user.username || user.email;
            div.onclick = () => selectUser(user);
            usersList.appendChild(div);
        });
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
    }
}

function selectUser(user) {
    currentChatUserId = user._id;
    document.getElementById('chatTitle').innerText = user.name || user.username;
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('audioCallBtn').style.display = 'inline-block';
    document.getElementById('videoCallBtn').style.display = 'inline-block';
    loadMessages(user._id);
}

// REST API — Загрузка сообщений
async function loadMessages(recipientId) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    try {
        const res = await fetch(`/api/chat/history/${recipientId}`);
        const messages = await res.json();
        messages.forEach(msg => {
            const type = msg.senderId === currentUserId ? 'outgoing' : 'incoming';
            appendMessage(msg.text, type);
        });
    } catch (err) {
        console.error('Ошибка истории чата:', err);
    }
}

// Отправка сообщений
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatUserId) return;

    appendMessage(text, 'outgoing');
    socket.emit('send_message', {
        recipientId: currentChatUserId,
        text: text
    });
    input.value = '';
}

function appendMessage(text, type) {
    const container = document.getElementById('messagesContainer');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// WebRTC — Звонки
async function startCall(isVideo) {
    if (!currentChatUserId) return;
    activeCallUserId = currentChatUserId;
    document.getElementById('callModal').style.display = 'flex';
    document.getElementById('callStatusText').innerText = 'Вызов...';
    document.getElementById('acceptCallBtn').style.display = 'none';

    setupPeerConnection();

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
}

async function handleAcceptCall(data) {
    document.getElementById('acceptCallBtn').style.display = 'none';
    document.getElementById('callStatusText').innerText = 'Соединение...';

    setupPeerConnection();

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
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && activeCallUserId) {
            socket.emit('ice_candidate', {
                to: activeCallUserId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };
}

function setupUIEvents() {
    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    document.getElementById('audioCallBtn').onclick = () => startCall(false);
    document.getElementById('videoCallBtn').onclick = () => startCall(true);
    document.getElementById('rejectCallBtn').onclick = () => {
        if (activeCallUserId && socket) {
            socket.emit('end_call', { to: activeCallUserId });
        }
        closeCallUI();
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
    document.getElementById('callModal').style.display = 'none';
}
