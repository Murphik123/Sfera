// Конфигурация WebRTC со STUN-серверами Google
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

// Инициализация Socket.io соединения
function initSocketConnection(userId) {
    socket = io();

    socket.emit('register_user', userId);

    // Обработка входящего вызова
    socket.on('incoming_call', async (data) => {
        activeCallUserId = data.from;
        document.getElementById('callModal').style.display = 'flex';
        document.getElementById('callStatusText').innerText = 'Входящий звонок...';
        document.getElementById('acceptCallBtn').style.display = 'inline-block';

        document.getElementById('acceptCallBtn').onclick = async () => {
            await handleAcceptCall(data);
        };
    });

    // Обработка ответа на звонок
    socket.on('call_accepted', async (signal) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
            document.getElementById('callStatusText').innerText = 'Разговор...';
        }
    });

    // Обработка входящих ICE-кандидатов
    socket.on('ice_candidate', async (data) => {
        if (peerConnection && data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error('Ошибка добавления ICE кандидата:', e);
            }
        }
    });

    // Завершение звонка собеседником
    socket.on('call_ended', () => {
        closeCallUI();
    });
}

// Старт исходящего звонка
async function startCall(targetUserId, isVideo = false) {
    activeCallUserId = targetUserId;
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
        userToCall: targetUserId,
        signalData: offer,
        isVideo: isVideo
    });
}

// Принятие входящего звонка
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

// Настройка RTCPeerConnection и обработчиков ICE
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

// Кнопка сброса / завершения вызова
document.getElementById('rejectCallBtn').onclick = () => {
    if (activeCallUserId && socket) {
        socket.emit('end_call', { to: activeCallUserId });
    }
    closeCallUI();
};

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
