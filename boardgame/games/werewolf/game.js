// Werewolf Agent - game.js
// Serverless real-time multiplayer One Night Werewolf game logic using MQTT & TTS

// Role configuration and visual metadata
const ROLE_DETAILS = {
    werewolf: {
        name: "หมาป่า (Werewolf)",
        icon: "🐺",
        desc: "คุณคือหมาป่า ลืมตาขึ้นมาตอนกลางคืนเพื่อตรวจสอบเพื่อนร่วมทีมของคุณ หากคุณเป็นหมาป่าตัวเดียวในเกม คุณสามารถเลือกดูการ์ดตรงกลางได้ 1 ใบ",
        color: "#ef4444"
    },
    minion: {
        name: "สมุนหมาป่า (Minion)",
        icon: "😈",
        desc: "คุณอยู่ฝ่ายเดียวกับหมาป่า ลืมตาตอนเริ่มแรกเพื่อส่องดูว่าเพื่อนร่วมทีมหมาป่าคือใคร (แต่หมาป่าจะไม่รู้ว่าคุณคือผู้ช่วยของพวกเขา)",
        color: "#db2777"
    },
    tanner: {
        name: "ตัวตลก (Tanner)",
        icon: "💀",
        desc: "คุณเป็นฝ่ายอิสระที่เกลียดชังงานของตนและต้องการจะตาย คุณจะชนะก็ต่อเมื่อได้รับการโหวตประหารชีวิตเท่านั้น!",
        color: "#22c55e"
    },
    seer: {
        name: "ผู้หยั่งรู้ (Seer)",
        icon: "👁️‍🗨️",
        desc: "คุณสามารถเบิกเนตรลืมตาขึ้นมาเพื่อเลือกดูการ์ดของผู้เล่นอื่น 1 ใบ หรือเลือกดูการ์ดคว่ำตรงกลาง 2 ใบ เพื่อหาข้อมูลเบาะแส",
        color: "#06b6d4"
    },
    robber: {
        name: "จอมขโมย (Robber)",
        icon: "🎭",
        desc: "คุณสามารถสลับการ์ดของคุณกับผู้เล่นคนอื่น 1 คน และแอบดูการ์ดใบใหม่ของคุณ (ต่อจากนี้คุณจะกลายเป็นบทบาทใหม่นั้น แต่ไม่ดำเนินพลังของบทบาทนั้น)",
        color: "#f59e0b"
    },
    troublemaker: {
        name: "ตัวป่วน (Troublemaker)",
        icon: "⚡",
        desc: "คุณสามารถปั่นป่วนบอร์ดโดยเลือกสลับการ์ดของผู้เล่นคนอื่น 2 คน โดยไม่ได้รับอนุญาตให้ดูว่าพวกเขาได้รับบทบาทอะไร",
        color: "#a855f7"
    },
    drunk: {
        name: "คนเมา (Drunk)",
        icon: "🍺",
        desc: "คุณเมาจนไม่ได้สติ ลืมตาขึ้นมาตอนกลางคืนเพื่อสลับการ์ดของคุณกับการ์ดตรงกลาง 1 ใบ โดยที่คุณไม่รู้ตัวเลยว่าได้บทใหม่เป็นอะไร",
        color: "#d97706"
    },
    insomniac: {
        name: "คนนอนไม่หลับ (Insomniac)",
        icon: "☕",
        desc: "คุณตื่นตระหนกจนนอนไม่หลับ ลืมตาขึ้นมาในตอนท้ายสุดของกลางคืนเพื่อแอบตรวจการ์ดตัวเองอีกครั้งดูว่าโดนขโมยหรือป่วนสลับการ์ดไปหรือไม่",
        color: "#0d9488"
    },
    villager: {
        name: "ชาวบ้าน (Villager)",
        icon: "👨‍🌾",
        desc: "คุณไม่มีพลังวิเศษใดๆ ในตอนกลางคืน หลับตาฟังเสียงบรรยาย และช่วยเพื่อนๆ วิเคราะห์ตามหาหมาป่าที่แฝงตัวอยู่ในตอนกลางวัน",
        color: "#94a3b8"
    }
};

// MQTT Broker config
const BROKERS = [
    { host: "broker.hivemq.com", port: 8884, path: "/mqtt" },
    { host: "broker.emqx.io", port: 8084, path: "/mqtt" }
];
let currentBrokerIndex = 0;

// Local states
let myPlayerId = "p_" + Math.random().toString(36).substr(2, 9);
let myPlayerName = "";
let roomCode = "";
let isHost = false;
let isMuted = false;
let client = null;
let connectionState = "disconnected"; // disconnected, connecting, connected

let players = [];
let currentSettings = {
    wolves: 2,
    seer: true,
    robber: true,
    troublemaker: true,
    minion: false,
    tanner: false,
    drunk: false,
    insomniac: false,
    duration: 5 // minutes
};

// Game play states
let myInitialRole = null;
let myCurrentRole = null;
let werewolvesList = [];
let nightActionData = null; // Stores results of night queries
let myActionSubmitted = false;

// Host only game states
let hostGameState = {
    initialRoles: {}, // playerId -> role
    currentRoles: {}, // playerId -> role, center-0/1/2 -> role
    swaps: [],        // array of swap details { role, from, to, detail }
    votes: {},        // playerId -> targetPlayerId
    nightActions: {}, // role -> { playerId, target }
    revealed: false
};

// Night Timeline states
let timeline = [];
let currentSlotIndex = -1;
let timelineTimer = null;
let timelineStartTime = 0;
let spokenTimeline = {}; // Tracks which announcements have been spoken

// TTS Voice Cache
let thaiVoice = null;

// Initialize Speech and Voices
if (window.speechSynthesis) {
    // Warm up speech synthesis
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            const voices = window.speechSynthesis.getVoices();
            thaiVoice = voices.find(v => v.lang.includes("th") || v.lang.includes("TH"));
        };
    }
}

// Sound synthesizer using Web Audio API
function playBeep(frequency, duration, type = 'sine') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Web Audio API not supported or blocked", e);
    }
}

// Dramatic Thai announcer
function speakThai(text) {
    if (isMuted || !window.speechSynthesis) return;
    try {
        window.speechSynthesis.cancel(); // Interrupt previous speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        if (thaiVoice) {
            utterance.voice = thaiVoice;
        }
        utterance.rate = 0.85; // Slightly slow and tense
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("Speech Synthesis Error:", e);
    }
}

// UI Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Custom Modal Alert Dialog
window.showAlert = function(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('alert-modal').style.display = 'flex';
};

window.closeAlert = function() {
    document.getElementById('alert-modal').style.display = 'none';
};

// Setup DOM bindings when page loads
document.addEventListener("DOMContentLoaded", () => {
    // Add volume control bar dynamically at top of app-container
    const appContainer = document.querySelector('.app-container');
    const muteBar = document.createElement('div');
    muteBar.className = 'mute-control-bar';
    muteBar.innerHTML = `<button id="btn-mute-toggle" class="btn-mute">🔊 เสียงผู้บรรยาย: เปิด</button>`;
    appContainer.insertBefore(muteBar, appContainer.firstChild);

    document.getElementById('btn-mute-toggle').addEventListener('click', () => {
        isMuted = !isMuted;
        const btn = document.getElementById('btn-mute-toggle');
        if (isMuted) {
            btn.innerHTML = `🔇 เสียงผู้บรรยาย: ปิด`;
            btn.style.color = 'var(--color-primary)';
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        } else {
            btn.innerHTML = `🔊 เสียงผู้บรรยาย: เปิด`;
            btn.style.color = 'var(--color-slate-400)';
            speakThai("เปิดระบบผู้บรรยายภาษาไทย");
        }
    });

    // Welcome Screen Bindings
    document.getElementById('btn-create-room').addEventListener('click', () => {
        const nameInput = document.getElementById('input-player-name').value.trim();
        if (!nameInput) {
            showAlert("ข้อผิดพลาด", "กรุณาระบุชื่อของคุณก่อนสร้างห้อง");
            return;
        }
        myPlayerName = nameInput;
        isHost = true;
        roomCode = generateRoomCode();
        speakThai("กำลังสร้างห้อง");
        connectMQTT();
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
        const nameInput = document.getElementById('input-player-name').value.trim();
        const codeInput = document.getElementById('input-room-code').value.trim().toUpperCase();
        if (!nameInput) {
            showAlert("ข้อผิดพลาด", "กรุณาระบุชื่อของคุณก่อนเข้าร่วม");
            return;
        }
        if (codeInput.length !== 4) {
            showAlert("ข้อผิดพลาด", "กรุณากรอกรหัสห้อง 4 หลักที่ถูกต้อง");
            return;
        }
        myPlayerName = nameInput;
        isHost = false;
        roomCode = codeInput;
        speakThai("กำลังเข้าร่วมห้อง");
        connectMQTT();
    });

    // Lobby Screen Bindings
    document.getElementById('range-duration').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('lbl-duration').innerText = `${val} นาที`;
        currentSettings.duration = parseInt(val);
        if (isHost && connectionState === "connected") {
            broadcastLobbySettings();
        }
    });

    document.getElementById('select-wolves').addEventListener('change', (e) => {
        currentSettings.wolves = parseInt(e.target.value);
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-seer').addEventListener('change', (e) => {
        currentSettings.seer = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-robber').addEventListener('change', (e) => {
        currentSettings.robber = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-troublemaker').addEventListener('change', (e) => {
        currentSettings.troublemaker = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-minion').addEventListener('change', (e) => {
        currentSettings.minion = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-tanner').addEventListener('change', (e) => {
        currentSettings.tanner = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-drunk').addEventListener('change', (e) => {
        currentSettings.drunk = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('check-insomniac').addEventListener('change', (e) => {
        currentSettings.insomniac = e.target.checked;
        if (isHost) broadcastLobbySettings();
    });

    document.getElementById('btn-leave-lobby').addEventListener('click', leaveGame);
    document.getElementById('btn-leave-game').addEventListener('click', leaveGame);

    document.getElementById('btn-start-game').addEventListener('click', () => {
        if (!isHost) return;
        if (players.length < 3) {
            showAlert("ผู้เล่นไม่ครบ", "เกมคืนล่าหมาป่าต้องการผู้เล่นอย่างน้อย 3 คน (รวมตัวคุณด้วย)");
            return;
        }
        setupAndStartGame();
    });

    // Fingerprint Scanner Events
    const fingerprintBtn = document.getElementById('fingerprint-btn');
    let scanInterval = null;
    let scanTicks = 0;

    function startScanning(e) {
        e.preventDefault();
        if (myInitialRole === null) return;
        
        fingerprintBtn.classList.add('scanning');
        playBeep(400, 0.08, 'triangle');
        
        scanTicks = 0;
        if (scanInterval) clearInterval(scanInterval);
        
        scanInterval = setInterval(() => {
            scanTicks++;
            if (scanTicks < 8) {
                // climbing audio pitch representing progress
                playBeep(400 + scanTicks * 60, 0.04, 'sine');
            } else {
                // Scan complete
                clearInterval(scanInterval);
                scanInterval = null;
                fingerprintBtn.classList.remove('scanning');
                document.getElementById('scanner-container').classList.add('hidden');
                
                // Show role panel
                showMyInitialRole();
                playBeep(880, 0.25, 'sine');
            }
        }, 150);
    }

    function cancelScanning() {
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
            fingerprintBtn.classList.remove('scanning');
            playBeep(180, 0.15, 'sawtooth'); // error buzz
        }
    }

    fingerprintBtn.addEventListener('mousedown', startScanning);
    fingerprintBtn.addEventListener('touchstart', startScanning);
    window.addEventListener('mouseup', cancelScanning);
    window.addEventListener('touchend', cancelScanning);

    // Night action submit
    document.getElementById('btn-submit-action').addEventListener('click', submitNightAction);
});

// Generate 4-letter uppercase code
function generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// MQTT Connect with fallbacks
function connectMQTT() {
    connectionState = "connecting";
    const broker = BROKERS[currentBrokerIndex];
    const clientId = `werewolf_${myPlayerId}`;
    
    console.log(`Connecting to MQTT broker: ${broker.host}:${broker.port}${broker.path} as ${clientId}`);
    
    client = new Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const connectOptions = {
        onSuccess: onConnectSuccess,
        onFailure: onConnectFailure,
        useSSL: true,
        keepAliveInterval: 30,
        timeout: 10
    };

    client.connect(connectOptions);
}

function onConnectSuccess() {
    console.log("MQTT Connected successfully!");
    connectionState = "connected";
    
    // Subscribe to room lobby topic
    client.subscribe(`werewolf/room/${roomCode}/lobby`);
    
    if (isHost) {
        // Host subscribes to host action topic
        client.subscribe(`werewolf/room/${roomCode}/host`);
        // Add self to lobby
        players = [{ id: myPlayerId, name: myPlayerName, isHost: true }];
        document.getElementById('lobby-code').innerText = roomCode;
        document.getElementById('lobby-owner-info').style.display = 'block';
        document.getElementById('lobby-player-info').style.display = 'none';
        document.getElementById('btn-start-game').style.display = 'block';
        
        renderLobbyPlayers();
        showScreen('screen-lobby');
    } else {
        // Player subscribes to their private topic
        client.subscribe(`werewolf/room/${roomCode}/player/${myPlayerId}`);
        // Send join request
        publishMessage(`werewolf/room/${roomCode}/lobby`, {
            type: "JOIN_REQUEST",
            playerId: myPlayerId,
            playerName: myPlayerName
        });
        
        document.getElementById('lobby-code').innerText = roomCode;
        document.getElementById('lobby-owner-info').style.display = 'none';
        document.getElementById('lobby-player-info').style.display = 'block';
        document.getElementById('lobby-my-name-badge').innerText = `ผู้เล่น: ${myPlayerName}`;
        document.getElementById('btn-start-game').style.display = 'none';
        
        // Disable settings editing for normal players
        document.getElementById('select-wolves').disabled = true;
        document.getElementById('check-seer').disabled = true;
        document.getElementById('check-robber').disabled = true;
        document.getElementById('check-troublemaker').disabled = true;
        document.getElementById('check-minion').disabled = true;
        document.getElementById('check-tanner').disabled = true;
        document.getElementById('check-drunk').disabled = true;
        document.getElementById('check-insomniac').disabled = true;
        document.getElementById('range-duration').disabled = true;
        
        showScreen('screen-lobby');
    }
}

function onConnectFailure(err) {
    console.error("MQTT Connection failed:", err);
    currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
    showAlert("กำลังพยายามใหม่", "การเชื่อมต่อขัดข้อง กำลังเปลี่ยนช่องทางสื่อสารสำรอง...");
    setTimeout(connectMQTT, 2000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error("MQTT connection lost:", responseObject.errorMessage);
        connectionState = "disconnected";
        showAlert("ขาดการเชื่อมต่อ", "การเชื่อมต่อกับเซิร์ฟเวอร์หลุด กำลังพยายามเชื่อมต่อใหม่...");
        setTimeout(connectMQTT, 2000);
    }
}

// Publish JSON object helper
function publishMessage(topic, payload) {
    if (!client || connectionState !== "connected") return;
    try {
        const message = new Paho.MQTT.Message(JSON.stringify(payload));
        message.destinationName = topic;
        message.qos = 1;
        client.send(message);
    } catch (e) {
        console.error("Error publishing message:", e);
    }
}

// Main Message Router
function onMessageArrived(message) {
    let payload;
    try {
        payload = JSON.parse(message.payloadString);
    } catch (e) {
        console.warn("Received non-JSON message:", message.payloadString);
        return;
    }

    const topic = message.destinationName;
    console.log(`Topic: ${topic} | Type: ${payload.type}`);

    // HOST ONLY HANDLERS
    if (isHost && topic === `werewolf/room/${roomCode}/host`) {
        handleHostMessage(payload);
        return;
    }

    // CLIENT HANDLERS
    switch (payload.type) {
        case "JOIN_REQUEST":
            if (isHost) {
                // Add player if doesn't exist
                if (!players.some(p => p.id === payload.playerId)) {
                    players.push({ id: payload.playerId, name: payload.playerName, isHost: false });
                    broadcastRoomUpdate();
                }
            }
            break;

        case "ROOM_UPDATE":
            players = payload.players;
            currentSettings = payload.settings;
            renderLobbyPlayers();
            syncLobbySettingsDisplay();
            break;

        case "ASSIGN_ROLE":
            myInitialRole = payload.role;
            myCurrentRole = payload.role;
            werewolvesList = payload.werewolves || [];
            console.log(`My secret role assigned: ${myInitialRole}`);
            break;

        case "GAME_START":
            handleGameStartMessage(payload);
            break;

        case "NIGHT_ACTION_RESPONSE":
            handleNightActionResponse(payload.result);
            break;

        case "GAME_OVER":
            handleGameOverMessage(payload);
            break;

        case "LEAVE_ANNOUNCEMENT":
            if (payload.playerId === myPlayerId) return;
            if (isHost) {
                players = players.filter(p => p.id !== payload.playerId);
                broadcastRoomUpdate();
            }
            break;
            
        case "HOST_CLOSE":
            showAlert("ห้องปิดแล้ว", "โฮสต์ผู้สร้างห้องได้ทำการยกเลิกและปิดห้องเล่นเกม");
            resetGameState();
            showScreen('screen-welcome');
            break;
    }
}

// Host specific message parser
function handleHostMessage(msg) {
    switch (msg.type) {
        case "REQUEST_VIEW_CENTER":
            if (currentSlotIndex !== getSlotIndexByName("werewolf")) return;
            const centerCardRole = hostGameState.currentRoles[`center-${msg.index}`];
            publishMessage(`werewolf/room/${roomCode}/player/${msg.playerId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: { viewType: "center", index: msg.index, role: centerCardRole }
            });
            break;

        case "REQUEST_SEER_VIEW":
            if (currentSlotIndex !== getSlotIndexByName("seer")) return;
            let result = { viewType: "seer", playerRoles: {}, centerRoles: {} };
            
            if (msg.targetPlayers && msg.targetPlayers.length > 0) {
                msg.targetPlayers.forEach(pId => {
                    result.playerRoles[pId] = hostGameState.currentRoles[pId];
                });
            }
            if (msg.targetCenters && msg.targetCenters.length > 0) {
                msg.targetCenters.forEach(idx => {
                    result.centerRoles[idx] = hostGameState.currentRoles[`center-${idx}`];
                });
            }
            
            publishMessage(`werewolf/room/${roomCode}/player/${msg.playerId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: result
            });
            break;

        case "REQUEST_ROBBER_SWAP":
            if (currentSlotIndex !== getSlotIndexByName("robber")) return;
            const robberId = msg.playerId;
            const targetId = msg.targetId;
            
            // Swap cards in memory
            const robberRole = hostGameState.currentRoles[robberId];
            const targetRole = hostGameState.currentRoles[targetId];
            
            hostGameState.currentRoles[robberId] = targetRole;
            hostGameState.currentRoles[targetId] = robberRole;
            
            // Record swap action
            const robberName = getPlayerNameById(robberId);
            const targetName = getPlayerNameById(targetId);
            hostGameState.swaps.push({
                role: "robber",
                from: robberId,
                to: targetId,
                detail: `จอมขโมย (${robberName}) สลับการ์ดของตนเองกับ ${targetName} (ได้รับบทเป็น ${targetRole})`
            });

            publishMessage(`werewolf/room/${roomCode}/player/${robberId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: { viewType: "robber", targetRole: targetRole, targetName: targetName }
            });
            break;

        case "REQUEST_TROUBLEMAKER_SWAP":
            if (currentSlotIndex !== getSlotIndexByName("troublemaker")) return;
            const pId1 = msg.targetId1;
            const pId2 = msg.targetId2;
            
            // Swap target players cards
            const role1 = hostGameState.currentRoles[pId1];
            const role2 = hostGameState.currentRoles[pId2];
            
            hostGameState.currentRoles[pId1] = role2;
            hostGameState.currentRoles[pId2] = role1;
            
            // Record swap action
            const tName1 = getPlayerNameById(pId1);
            const tName2 = getPlayerNameById(pId2);
            const tmName = getPlayerNameById(msg.playerId);
            hostGameState.swaps.push({
                role: "troublemaker",
                from: pId1,
                to: pId2,
                detail: `ตัวป่วน (${tmName}) สลับการ์ดของ ${tName1} และ ${tName2}`
            });

            publishMessage(`werewolf/room/${roomCode}/player/${msg.playerId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: { viewType: "troublemaker", success: true, targetName1: tName1, targetName2: tName2 }
            });
            break;

        case "REQUEST_DRUNK_SWAP":
            if (currentSlotIndex !== getSlotIndexByName("drunk")) return;
            const drunkId = msg.playerId;
            const centerIdx = msg.index;
            
            const drunkRole = hostGameState.currentRoles[drunkId];
            const targetCenterRole = hostGameState.currentRoles[`center-${centerIdx}`];
            
            hostGameState.currentRoles[drunkId] = targetCenterRole;
            hostGameState.currentRoles[`center-${centerIdx}`] = drunkRole;
            
            const drunkName = getPlayerNameById(drunkId);
            hostGameState.swaps.push({
                role: "drunk",
                from: drunkId,
                to: `center-${centerIdx}`,
                detail: `คนเมา (${drunkName}) สลับการ์ดของตนเองกับการ์ดตรงกลางใบที่ ${centerIdx + 1}`
            });

            publishMessage(`werewolf/room/${roomCode}/player/${drunkId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: { viewType: "drunk", centerIndex: centerIdx }
            });
            break;

        case "REQUEST_INSOMNIAC_VIEW":
            if (currentSlotIndex !== getSlotIndexByName("insomniac")) return;
            const insomniacId = msg.playerId;
            const insomniacFinalRole = hostGameState.currentRoles[insomniacId];
            
            publishMessage(`werewolf/room/${roomCode}/player/${insomniacId}`, {
                type: "NIGHT_ACTION_RESPONSE",
                result: { viewType: "insomniac", role: insomniacFinalRole }
            });
            break;

        case "VOTE_SUBMIT":
            hostGameState.votes[msg.playerId] = msg.targetId;
            // Count total active votes
            const votersCount = Object.keys(hostGameState.votes).length;
            console.log(`Vote cast: ${getPlayerNameById(msg.playerId)} -> ${getPlayerNameById(msg.targetId)}. Total votes: ${votersCount}/${players.length}`);
            
            if (votersCount === players.length) {
                // All players voted! Conclude game immediately.
                concludeGameAndReveal();
            }
            break;
    }
}

// Host triggers game updates
function broadcastRoomUpdate() {
    publishMessage(`werewolf/room/${roomCode}/lobby`, {
        type: "ROOM_UPDATE",
        players: players,
        settings: currentSettings
    });
}

function broadcastLobbySettings() {
    broadcastRoomUpdate();
}

function syncLobbySettingsDisplay() {
    document.getElementById('select-wolves').value = currentSettings.wolves;
    document.getElementById('check-seer').checked = currentSettings.seer;
    document.getElementById('check-robber').checked = currentSettings.robber;
    document.getElementById('check-troublemaker').checked = currentSettings.troublemaker;
    document.getElementById('check-minion').checked = currentSettings.minion;
    document.getElementById('check-tanner').checked = currentSettings.tanner;
    document.getElementById('check-drunk').checked = currentSettings.drunk;
    document.getElementById('check-insomniac').checked = currentSettings.insomniac;
    document.getElementById('range-duration').value = currentSettings.duration;
    document.getElementById('lbl-duration').innerText = `${currentSettings.duration} นาที`;
}

// Render player slots in the Lobby
function renderLobbyPlayers() {
    document.getElementById('lobby-players-count').innerText = players.length;
    const list = document.getElementById('lobby-players-list');
    list.innerHTML = "";
    
    players.forEach(p => {
        const li = document.createElement('li');
        
        let cardClass = "player-card-lobby";
        let badge = "";
        let avatar = "👤";

        if (p.id === myPlayerId) {
            cardClass += " is-me";
            badge = `<span class="player-status-badge">(คุณ)</span>`;
        }
        if (p.isHost) {
            cardClass += " is-host";
            badge = `<span class="badge badge-owner" style="font-size:0.55rem; padding:1px 4px;">Host</span>`;
            avatar = "👑";
        }
        
        li.className = cardClass;
        li.innerHTML = `
            <span class="player-avatar-icon">${avatar}</span>
            <span class="player-name-lbl" title="${p.name}">${p.name}</span>
            ${badge}
        `;
        list.appendChild(li);
    });

    // Update dynamic setup recommendations
    updateLobbyRecommendation(players.length);
}

function updateLobbyRecommendation(count) {
    const box = document.getElementById('lobby-recommendation-box');
    if (!box) return;
    
    // Auto-balance constraints: if 3 players, force 1 wolf
    const selectWolves = document.getElementById('select-wolves');
    if (count === 3) {
        if (currentSettings.wolves !== 1) {
            currentSettings.wolves = 1;
            if (selectWolves) selectWolves.value = "1";
            if (isHost) broadcastLobbySettings();
        }
        // Disable options 2 and 3
        if (selectWolves) {
            selectWolves.options[1].disabled = true; // 2 wolves
            selectWolves.options[2].disabled = true; // 3 wolves
        }
    } else {
        // Enable options 2 and 3
        if (selectWolves) {
            selectWolves.options[1].disabled = false;
            selectWolves.options[2].disabled = false;
        }
    }
    
    let text = "";
    if (count < 3) {
        text = `<strong>💡 แนะนำจัดบทบาท:</strong> รอผู้เล่นเข้าร่วมอย่างน้อย 3 คน...`;
        box.style.background = "rgba(255, 255, 255, 0.05)";
        box.style.borderColor = "rgba(255, 255, 255, 0.1)";
        box.style.color = "var(--color-slate-400)";
    } else if (count === 3) {
        text = `<strong>💡 ล็อคแนะนำสำหรับ 3 คน:</strong> บังคับหมาป่า 1 ตัว (เพื่อความสมดุลสูงสุด), ผู้หยั่งรู้, จอมขโมย, ตัวป่วน (การ์ดรวม 6 ใบ)`;
        box.style.background = "rgba(192, 132, 252, 0.08)";
        box.style.borderColor = "rgba(192, 132, 252, 0.25)";
        box.style.color = "#e9d5ff";
    } else if (count === 4 || count === 5) {
        text = `<strong>💡 แนะนำสำหรับ ${count} คน:</strong> หมาป่า 2 ตัว, ผู้หยั่งรู้, จอมขโมย, ตัวป่วน, คนเมา (และชาวบ้านเสริมเพื่อให้สลับการ์ดได้สนุกสนาน)`;
        box.style.background = "rgba(192, 132, 252, 0.08)";
        box.style.borderColor = "rgba(192, 132, 252, 0.25)";
        box.style.color = "#e9d5ff";
    } else if (count >= 6 && count <= 8) {
        text = `<strong>💡 แนะนำสำหรับ ${count} คน:</strong> หมาป่า 2 ตัว, สมุนหมาป่า, ผู้หยั่งรู้, จอมขโมย, ตัวป่วน, คนนอนไม่หลับ, คนเมา (บาลานซ์ทีมคนร้ายและทีมชาวบ้าน)`;
        box.style.background = "rgba(192, 132, 252, 0.08)";
        box.style.borderColor = "rgba(192, 132, 252, 0.25)";
        box.style.color = "#e9d5ff";
    } else {
        // count >= 9 (e.g. 10 players!)
        text = `<strong>💡 แนะนำสำหรับ ${count} คน (โต๊ะใหญ่):</strong> หมาป่า 3 ตัว, สมุนหมาป่า, ตัวตลก (ป่วนจับผิด), ผู้หยั่งรู้, จอมขโมย, ตัวป่วน, คนเมา, คนนอนไม่หลับ เพื่อความลึกลับซับซ้อนและสมดุลที่สุด!`;
        box.style.background = "rgba(239, 68, 68, 0.08)";
        box.style.borderColor = "rgba(239, 68, 68, 0.25)";
        box.style.color = "#fca5a5";
    }
    box.innerHTML = text;
}

// Game distribution & start initialization
function setupAndStartGame() {
    // 1. Compile deck
    const deck = [];
    // Add Werewolves
    for (let i = 0; i < currentSettings.wolves; i++) {
        deck.push("werewolf");
    }
    // Special roles
    if (currentSettings.seer) deck.push("seer");
    if (currentSettings.robber) deck.push("robber");
    if (currentSettings.troublemaker) deck.push("troublemaker");
    if (currentSettings.minion) deck.push("minion");
    if (currentSettings.tanner) deck.push("tanner");
    if (currentSettings.drunk) deck.push("drunk");
    if (currentSettings.insomniac) deck.push("insomniac");
    
    // Fill with villagers
    const totalCardsNeeded = players.length + 3;
    while (deck.length < totalCardsNeeded) {
        deck.push("villager");
    }

    // Shuffle deck
    const shuffledDeck = shuffle([...deck]);
    console.log("Shuffled Deck:", shuffledDeck);

    // 2. Assign to players
    const initialRoles = {};
    const currentRoles = {};
    const werewolvesIds = [];

    players.forEach((p, idx) => {
        initialRoles[p.id] = shuffledDeck[idx];
        currentRoles[p.id] = shuffledDeck[idx];
        if (shuffledDeck[idx] === "werewolf") {
            werewolvesIds.push(p.id);
        }
    });

    // 3. Assign center cards
    currentRoles["center-0"] = shuffledDeck[players.length];
    currentRoles["center-1"] = shuffledDeck[players.length + 1];
    currentRoles["center-2"] = shuffledDeck[players.length + 2];

    hostGameState = {
        initialRoles: initialRoles,
        currentRoles: currentRoles,
        swaps: [],
        votes: {},
        nightActions: {},
        revealed: false
    };

    // 4. Send private ASSIGN_ROLE to each client
    players.forEach(p => {
        const role = initialRoles[p.id];
        
        // Compile werewolf teammates list (name of other wolves)
        let teammates = [];
        if (role === "werewolf") {
            teammates = players
                .filter(other => other.id !== p.id && initialRoles[other.id] === "werewolf")
                .map(other => other.name);
        } else if (role === "minion") {
            // Minion sees who all werewolves are
            teammates = players
                .filter(other => initialRoles[other.id] === "werewolf")
                .map(other => other.name);
        }

        publishMessage(`werewolf/room/${roomCode}/player/${p.id}`, {
            type: "ASSIGN_ROLE",
            role: role,
            werewolves: teammates
        });
    });

    // 5. Broadcast general GAME_START
    // Scheduled in 3.5 seconds to absorb network delays
    const startTime = Date.now() + 3500;
    publishMessage(`werewolf/room/${roomCode}/lobby`, {
        type: "GAME_START",
        startTime: startTime,
        settings: currentSettings,
        players: players
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Client handler for game start
function handleGameStartMessage(data) {
    playBeep(600, 0.4, 'sine');
    
    players = data.players;
    currentSettings = data.settings;
    timelineStartTime = data.startTime;
    myActionSubmitted = false;
    nightActionData = null;
    spokenTimeline = {};
    
    // Build Timeline slots dynamically
    buildNightTimeline();
    
    // UI Transitions
    showScreen('screen-game');
    document.getElementById('game-phase-banner').classList.remove('day-phase');
    document.getElementById('game-phase-text').innerText = "เตรียมตัวเข้าสู่ค่ำคืนลึกลับ...";
    
    // Reset view visibility
    document.getElementById('view-night').classList.remove('hidden');
    document.getElementById('view-day').classList.add('hidden');
    document.getElementById('view-reveal').classList.add('hidden');
    
    // Scanner setup
    document.getElementById('scanner-container').classList.remove('hidden');
    document.getElementById('role-panel').classList.add('hidden');
    document.getElementById('active-action-panel').classList.add('hidden');
    document.getElementById('night-instruction-text').innerText = "กรุณาแตะสแกนนิ้วมือเพื่อดูบทบาทลับของคุณ... 🤫";

    // Start timeline local clock loop
    if (timelineTimer) clearInterval(timelineTimer);
    timelineTimer = setInterval(tickTimeline, 100);
}

// Setup chronological night script slots
function buildNightTimeline() {
    timeline = [];
    let offset = 0;

    // Slot 1: Initial Role View
    timeline.push({
        name: "role-view",
        start: offset,
        end: offset + 15,
        announcement: "สแกนนิ้วมือเพื่อตรวจดูบทบาทลับเบื้องต้นของคุณ และเตรียมตัวหลับตา"
    });
    offset += 15;

    // Slot 2: Werewolf Wakeup
    timeline.push({
        name: "werewolf",
        start: offset,
        end: offset + 16,
        announcement: "หมาป่า ลืมตาขึ้นมามองหน้ากัน หากมีหมาป่าตัวเดียว คุณสามารถเลือกดูการ์ดตรงกลางได้ 1 ใบ",
        closingAnnouncement: "หมาป่า หลับตาลง"
    });
    offset += 16;

    // Slot 2.5: Minion Wakeup
    if (currentSettings.minion) {
        timeline.push({
            name: "minion",
            start: offset,
            end: offset + 12,
            announcement: "สมุนหมาป่า ลืมตาขึ้นมาเพื่อดูว่าใครเป็นหมาป่า",
            closingAnnouncement: "สมุนหมาป่า หลับตาลง"
        });
        offset += 12;
    }

    // Slot 3: Seer Wakeup
    if (currentSettings.seer) {
        timeline.push({
            name: "seer",
            start: offset,
            end: offset + 18,
            announcement: "ผู้หยั่งรู้ ลืมตาขึ้นมา คุณสามารถตรวจดูการ์ดของเพื่อน 1 คน หรือเลือกดูการ์ดตรงกลาง 2 ใบ",
            closingAnnouncement: "ผู้หยั่งรู้ หลับตาลง"
        });
        offset += 18;
    }

    // Slot 4: Robber Wakeup
    if (currentSettings.robber) {
        timeline.push({
            name: "robber",
            start: offset,
            end: offset + 16,
            announcement: "จอมขโมย ลืมตาขึ้นมา คุณสามารถเลือกสลับการ์ดของคุณกับเพื่อน 1 คน และแอบดูการ์ดบทบาทใหม่ใบนั้น",
            closingAnnouncement: "จอมขโมย หลับตาลง"
        });
        offset += 16;
    }

    // Slot 5: Troublemaker Wakeup
    if (currentSettings.troublemaker) {
        timeline.push({
            name: "troublemaker",
            start: offset,
            end: offset + 16,
            announcement: "ตัวป่วน ลืมตาขึ้นมา คุณสามารถสลับการ์ดของเพื่อน 2 คน โดยห้ามเปิดดูการ์ดเหล่านั้น",
            closingAnnouncement: "ตัวป่วน หลับตาลง"
        });
        offset += 16;
    }

    // Slot 5.5: Drunk Wakeup
    if (currentSettings.drunk) {
        timeline.push({
            name: "drunk",
            start: offset,
            end: offset + 12,
            announcement: "คนเมา ลืมตาขึ้นมา คุณสามารถเลือกสลับการ์ดของคุณกับการ์ดตรงกลาง 1 ใบโดยไม่เปิดดู",
            closingAnnouncement: "คนเมา หลับตาลง"
        });
        offset += 12;
    }

    // Slot 5.7: Insomniac Wakeup
    if (currentSettings.insomniac) {
        timeline.push({
            name: "insomniac",
            start: offset,
            end: offset + 12,
            announcement: "คนนอนไม่หลับ ลืมตาขึ้นมาตรวจดูบทบาทปัจจุบันของตนเองอีกครั้ง",
            closingAnnouncement: "คนนอนไม่หลับ หลับตาลง"
        });
        offset += 12;
    }

    // Slot 6: Wake Up
    timeline.push({
        name: "wakeup",
        start: offset,
        end: offset + 3,
        announcement: "เช้าวันรุ่งขึ้นเริ่มต้นขึ้นแล้ว ทุกคนลืมตาขึ้นได้!"
    });
}

function getSlotIndexByName(name) {
    return timeline.findIndex(s => s.name === name);
}

// Sync loop: checks elapsed time relative to global timelineStartTime
function tickTimeline() {
    const elapsed = (Date.now() - timelineStartTime) / 1000;
    
    if (elapsed < 0) {
        // Countdown to actual game start
        const waitTime = Math.ceil(Math.abs(elapsed));
        document.getElementById('night-instruction-text').innerText = `เกมจะเริ่มในอีก ${waitTime} วินาที...`;
        return;
    }

    // Find active slot
    let activeSlot = timeline.find(slot => elapsed >= slot.start && elapsed < slot.end);
    
    if (!activeSlot) {
        // Timeline completed! Clean up and move to Day phase
        clearInterval(timelineTimer);
        timelineTimer = null;
        startDayPhase();
        return;
    }

    const activeIndex = timeline.indexOf(activeSlot);
    
    // Detect slot transition
    if (activeIndex !== currentSlotIndex) {
        currentSlotIndex = activeIndex;
        console.log(`Entering timeline slot: ${activeSlot.name}`);
        
        // Reset action states
        myActionSubmitted = false;
        
        // Trigger announcement voice
        if (!spokenTimeline[activeSlot.name]) {
            speakThai(activeSlot.announcement);
            spokenTimeline[activeSlot.name] = true;
        }

        // Adjust UI components
        updateNightSlotUI(activeSlot.name);
    }

    // Trigger closing announcements (2.5 seconds before slot ends)
    if (activeSlot.closingAnnouncement && elapsed >= (activeSlot.end - 2.5)) {
        const closeKey = `${activeSlot.name}_close`;
        if (!spokenTimeline[closeKey]) {
            speakThai(activeSlot.closingAnnouncement);
            spokenTimeline[closeKey] = true;
            // Hide action panel on closing to secure light leaks
            document.getElementById('active-action-panel').classList.add('hidden');
        }
    }
}

// Adjust Screen visual layout and privacy blackout based on active role slot
function updateNightSlotUI(slotName) {
    const blackOverlay = document.getElementById('view-night');
    const rolePanel = document.getElementById('role-panel');
    const scanner = document.getElementById('scanner-container');
    const actionPanel = document.getElementById('active-action-panel');
    
    if (slotName === "role-view") {
        blackOverlay.style.background = "radial-gradient(circle, #1c0e29 0%, #050208 100%)";
        scanner.classList.remove('hidden');
        rolePanel.classList.add('hidden');
        actionPanel.classList.add('hidden');
        return;
    }

    if (slotName === "wakeup") {
        blackOverlay.style.background = "radial-gradient(circle, #2e1d0f 0%, #0c0804 100%)";
        scanner.classList.add('hidden');
        rolePanel.classList.add('hidden');
        actionPanel.classList.add('hidden');
        document.getElementById('night-instruction-text').innerText = "รุ่งสางมาเยือนแล้ว... ยินดีต้อนรับกลับสู่ตอนกลางวัน ☀️";
        return;
    }

    // NORMAL PLAY 블랙아웃 - Privacy Lock to prevent light leaks & peeking
    let isMyTurn = (slotName === myInitialRole);
    
    if (isMyTurn) {
        // Wake up screen for this player
        blackOverlay.style.background = "radial-gradient(circle at center, #1f112e 0%, #0b0512 100%)";
        scanner.classList.add('hidden');
        rolePanel.classList.add('hidden');
        
        document.getElementById('night-instruction-text').innerText = `ถึงเวลาทำงานของ คุณ (${ROLE_DETAILS[myInitialRole].name})`;
        
        // Setup specific active controls
        setupActiveNightControls(slotName);
    } else {
        // Pitch Black for inactive players to keep game fully secure
        blackOverlay.style.background = "#000000";
        scanner.classList.add('hidden');
        rolePanel.classList.add('hidden');
        actionPanel.classList.add('hidden');
        document.getElementById('night-instruction-text').innerText = "หลับตาของคุณลง นั่งเงียบๆ และฟังเสียงบรรยาย... 🤫";
    }
}

// Set up action panel lists
function setupActiveNightControls(role) {
    const actionPanel = document.getElementById('active-action-panel');
    const title = document.getElementById('action-panel-title');
    const grid = document.getElementById('action-options-grid');
    const submitBtn = document.getElementById('btn-submit-action');
    
    grid.innerHTML = "";
    submitBtn.style.display = "block";
    actionPanel.classList.remove('hidden');

    switch (role) {
        case "werewolf":
            title.innerText = "พรรคพวกหมาป่าของคุณ";
            if (werewolvesList.length > 0) {
                // Display fellow wolves
                const text = document.createElement('div');
                text.style.gridColumn = "1 / -1";
                text.style.textAlign = "center";
                text.style.padding = "10px";
                text.innerHTML = `พบเพื่อนหมาป่าของคุณคือ:<br><strong class="role-highlight" style="font-size:1.3rem;">${werewolvesList.join(", ")}</strong>`;
                grid.appendChild(text);
                submitBtn.style.display = "none"; // No action needed
            } else {
                // Lone wolf - look at center card
                title.innerText = "คุณเป็นหมาป่าตัวเดียว! เลือกส่องการ์ดตรงกลาง 1 ใบ";
                for (let i = 0; i < 3; i++) {
                    const btn = document.createElement('button');
                    btn.className = "action-btn";
                    btn.dataset.index = i;
                    btn.innerHTML = `<span class="icon">📦</span><span>การ์ดกลางใบที่ ${i+1}</span>`;
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                    grid.appendChild(btn);
                }
            }
            break;

        case "seer":
            title.innerText = "เลือกสืบการ์ดเพื่อน 1 คน หรือ การ์ดกลาง 2 ใบ";
            
            // Player list block
            const pHeader = document.createElement('div');
            pHeader.style.gridColumn = "1 / -1";
            pHeader.style.fontSize = "0.8rem";
            pHeader.style.color = "var(--color-secondary)";
            pHeader.innerText = "เลือกสืบการ์ดผู้เล่นอื่น (1 คน)";
            grid.appendChild(pHeader);

            players.filter(p => p.id !== myPlayerId).forEach(p => {
                const btn = document.createElement('button');
                btn.className = "action-btn";
                btn.dataset.type = "player";
                btn.dataset.id = p.id;
                btn.innerHTML = `<span class="icon">👤</span><span>${p.name}</span>`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
                grid.appendChild(btn);
            });

            // Center list block
            const cHeader = document.createElement('div');
            cHeader.style.gridColumn = "1 / -1";
            cHeader.style.fontSize = "0.8rem";
            cHeader.style.color = "var(--color-secondary)";
            cHeader.style.marginTop = "10px";
            cHeader.innerText = "หรือ ตรวจดูการ์ดตรงกลาง (ต้องเลือกครบ 2 ใบ)";
            grid.appendChild(cHeader);

            for (let i = 0; i < 3; i++) {
                const btn = document.createElement('button');
                btn.className = "action-btn";
                btn.dataset.type = "center";
                btn.dataset.index = i;
                btn.innerHTML = `<span class="icon">📦</span><span>การ์ดกลางใบที่ ${i+1}</span>`;
                btn.addEventListener('click', () => {
                    // Deselect player selections first
                    document.querySelectorAll('.action-btn[data-type="player"]').forEach(b => b.classList.remove('selected'));
                    
                    btn.classList.toggle('selected');
                    // Ensure max 2 center cards
                    const selected = document.querySelectorAll('.action-btn[data-type="center"].selected');
                    if (selected.length > 2) {
                        btn.classList.remove('selected');
                    }
                });
                grid.appendChild(btn);
            }
            break;

        case "robber":
            title.innerText = "เลือกสลับการ์ดของคุณกับเพื่อน 1 คน";
            players.filter(p => p.id !== myPlayerId).forEach(p => {
                const btn = document.createElement('button');
                btn.className = "action-btn";
                btn.dataset.id = p.id;
                btn.innerHTML = `<span class="icon">👤</span><span>${p.name}</span>`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
                grid.appendChild(btn);
            });
            break;

        case "troublemaker":
            title.innerText = "เลือกสลับการ์ดของเพื่อน 2 คน (ห้ามแอบดู)";
            players.filter(p => p.id !== myPlayerId).forEach(p => {
                const btn = document.createElement('button');
                btn.className = "action-btn";
                btn.dataset.id = p.id;
                btn.innerHTML = `<span class="icon">👤</span><span>${p.name}</span>`;
                btn.addEventListener('click', () => {
                    btn.classList.toggle('selected');
                    // Ensure max 2 selected players
                    const selected = document.querySelectorAll('.action-btn.selected');
                    if (selected.length > 2) {
                        btn.classList.remove('selected');
                    }
                });
                grid.appendChild(btn);
            });
            break;

        case "minion":
            title.innerText = "รายชื่อเพื่อนร่วมทีมหมาป่าของคุณ";
            const minionText = document.createElement('div');
            minionText.style.gridColumn = "1 / -1";
            minionText.style.textAlign = "center";
            minionText.style.padding = "10px";
            if (werewolvesList.length > 0) {
                minionText.innerHTML = `พรรคพวกหมาป่าที่คุณต้องช่วยเหลือคือ:<br><strong class="role-highlight" style="font-size:1.3rem;">${werewolvesList.join(", ")}</strong>`;
            } else {
                minionText.innerHTML = `ไม่มีหมาป่าอยู่บนกระดานเล่นเกมเลย<br>(หมาป่าทั้งคู่คว่ำอยู่กลางกระดาน)`;
            }
            grid.appendChild(minionText);
            submitBtn.style.display = "none"; // No action needed
            break;

        case "drunk":
            title.innerText = "เลือกสลับการ์ดของคุณกับการ์ดตรงกลาง 1 ใบ (โดยไม่เปิดดู)";
            for (let i = 0; i < 3; i++) {
                const btn = document.createElement('button');
                btn.className = "action-btn";
                btn.dataset.index = i;
                btn.innerHTML = `<span class="icon">📦</span><span>การ์ดกลางใบที่ ${i+1}</span>`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
                grid.appendChild(btn);
            }
            break;

        case "insomniac":
            title.innerText = "ตรวจสอบการ์ดบทบาทสุดท้ายของคุณตอนนี้";
            const insomniacText = document.createElement('div');
            insomniacText.style.gridColumn = "1 / -1";
            insomniacText.style.textAlign = "center";
            insomniacText.style.padding = "10px";
            insomniacText.innerText = "กำลังตรวจสอบบทบาทล่าสุดจากระบบโฮสต์...";
            grid.appendChild(insomniacText);
            
            publishMessage(`werewolf/room/${roomCode}/host`, {
                type: "REQUEST_INSOMNIAC_VIEW",
                playerId: myPlayerId
            });
            submitBtn.style.display = "none";
            myActionSubmitted = true;
            break;
    }
}

// Client submits action choice to Host
function submitNightAction() {
    if (myActionSubmitted) return;

    playBeep(520, 0.15, 'sine');

    switch (myInitialRole) {
        case "werewolf":
            if (werewolvesList.length === 0) {
                const selected = document.querySelector('.action-btn.selected');
                if (!selected) {
                    showAlert("โปรดระบุ", "กรุณาเลือกการ์ดตรงกลาง 1 ใบ");
                    return;
                }
                const idx = parseInt(selected.dataset.index);
                publishMessage(`werewolf/room/${roomCode}/host`, {
                    type: "REQUEST_VIEW_CENTER",
                    playerId: myPlayerId,
                    index: idx
                });
                myActionSubmitted = true;
            }
            break;

        case "seer":
            const playerSel = document.querySelector('.action-btn[data-type="player"].selected');
            const centerSels = document.querySelectorAll('.action-btn[data-type="center"].selected');

            if (playerSel) {
                publishMessage(`werewolf/room/${roomCode}/host`, {
                    type: "REQUEST_SEER_VIEW",
                    playerId: myPlayerId,
                    targetPlayers: [playerSel.dataset.id],
                    targetCenters: []
                });
                myActionSubmitted = true;
            } else if (centerSels.length === 2) {
                const idxList = Array.from(centerSels).map(b => parseInt(b.dataset.index));
                publishMessage(`werewolf/room/${roomCode}/host`, {
                    type: "REQUEST_SEER_VIEW",
                    playerId: myPlayerId,
                    targetPlayers: [],
                    targetCenters: idxList
                });
                myActionSubmitted = true;
            } else {
                showAlert("สืบหาข้อมูล", "โปรดเลือกสืบการ์ดเพื่อน 1 คน หรือ การ์ดคว่ำตรงกลางครบ 2 ใบ");
                return;
            }
            break;

        case "robber":
            const robberTarget = document.querySelector('.action-btn.selected');
            if (!robberTarget) {
                showAlert("ลงมือสลับการ์ด", "โปรดเลือกเพื่อน 1 คนที่จะขโมยและสลับการ์ด");
                return;
            }
            publishMessage(`werewolf/room/${roomCode}/host`, {
                type: "REQUEST_ROBBER_SWAP",
                playerId: myPlayerId,
                targetId: robberTarget.dataset.id
            });
            myActionSubmitted = true;
            break;

        case "troublemaker":
            const tmTargets = document.querySelectorAll('.action-btn.selected');
            if (tmTargets.length !== 2) {
                showAlert("ป่วนกระดาน", "โปรดเลือกเพื่อนให้ครบ 2 คน เพื่อลงมือสลับการ์ดของพวกเขา");
                return;
            }
            publishMessage(`werewolf/room/${roomCode}/host`, {
                type: "REQUEST_TROUBLEMAKER_SWAP",
                playerId: myPlayerId,
                targetId1: tmTargets[0].dataset.id,
                targetId2: tmTargets[1].dataset.id
            });
            myActionSubmitted = true;
            break;

        case "drunk":
            const drunkTarget = document.querySelector('.action-btn.selected');
            if (!drunkTarget) {
                showAlert("เลือกสลับการ์ด", "โปรดเลือกการ์ดตรงกลาง 1 ใบเพื่อทำการสลับสับเปลี่ยน");
                return;
            }
            const drunkIdx = parseInt(drunkTarget.dataset.index);
            publishMessage(`werewolf/room/${roomCode}/host`, {
                type: "REQUEST_DRUNK_SWAP",
                playerId: myPlayerId,
                index: drunkIdx
            });
            myActionSubmitted = true;
            break;
    }

    if (myActionSubmitted) {
        // Disable controls and show waiting message
        document.getElementById('btn-submit-action').disabled = true;
        document.getElementById('action-panel-title').innerText = "ส่งคำสั่งของคุุณไปแล้ว...";
    }
}

// Client parses response from Host for their night query
function handleNightActionResponse(res) {
    const grid = document.getElementById('action-options-grid');
    grid.innerHTML = "";
    document.getElementById('btn-submit-action').style.display = "none";
    
    const displayCard = document.createElement('div');
    displayCard.style.gridColumn = "1 / -1";
    displayCard.style.textAlign = "center";
    displayCard.style.padding = "15px";
    displayCard.style.borderRadius = "12px";
    displayCard.style.background = "rgba(255,255,255,0.03)";
    displayCard.style.border = "1px solid rgba(255,255,255,0.08)";

    if (res.viewType === "center") {
        const meta = ROLE_DETAILS[res.role];
        displayCard.innerHTML = `การ์ดตรงกลางใบที่ ${res.index + 1} คือ:<br>
            <span style="font-size: 2rem;">${meta.icon}</span><br>
            <strong style="color: ${meta.color}; font-size:1.2rem;">${meta.name}</strong>`;
        speakThai(`การ์ดตรงกลางที่เลือกดูคือ ${meta.name}`);
    } 
    else if (res.viewType === "seer") {
        let text = "";
        if (Object.keys(res.playerRoles).length > 0) {
            const pId = Object.keys(res.playerRoles)[0];
            const pName = getPlayerNameById(pId);
            const role = res.playerRoles[pId];
            const meta = ROLE_DETAILS[role];
            text = `การ์ดของ ${pName} คือ:<br>
                <span style="font-size: 2rem;">${meta.icon}</span><br>
                <strong style="color: ${meta.color}; font-size:1.2rem;">${meta.name}</strong>`;
            speakThai(`การ์ดของ ${pName} คือ ${meta.name}`);
        } else {
            const indices = Object.keys(res.centerRoles);
            const r0 = res.centerRoles[indices[0]];
            const r1 = res.centerRoles[indices[1]];
            const m0 = ROLE_DETAILS[r0];
            const m1 = ROLE_DETAILS[r1];
            text = `การ์ดตรงกลางทั้ง 2 ใบคือ:<br>
                ใบที่ ${parseInt(indices[0])+1}: <strong style="color:${m0.color}">${m0.name}</strong><br>
                ใบที่ ${parseInt(indices[1])+1}: <strong style="color:${m1.color}">${m1.name}</strong>`;
            speakThai(`การ์ดตรงกลางทั้งสองใบคือ ${m0.name} และ ${m1.name}`);
        }
        displayCard.innerHTML = text;
    } 
    else if (res.viewType === "robber") {
        const meta = ROLE_DETAILS[res.targetRole];
        myCurrentRole = res.targetRole; // Client tracks their new role
        displayCard.innerHTML = `คุณสลับกับ ${res.targetName} เรียบร้อย!<br>บทบาทลับใหม่ของคุณตอนนี้คือ:<br>
            <span style="font-size: 2.2rem;">${meta.icon}</span><br>
            <strong style="color: ${meta.color}; font-size:1.3rem;">${meta.name}</strong>`;
        speakThai(`คุณได้รับการ์ดใหม่คือบทบาท ${meta.name}`);
    } 
    else if (res.viewType === "troublemaker") {
        displayCard.innerHTML = `<span style="font-size: 2.2rem;">⚡</span><br>สับการ์ดสลับตำแหน่งของ <strong>${res.targetName1}</strong> และ <strong>${res.targetName2}</strong> เรียบร้อยแล้ว!`;
        speakThai(`สลับตำแหน่งการ์ดของเพื่อนทั้งสองคนเรียบร้อย`);
    }
    else if (res.viewType === "drunk") {
        displayCard.innerHTML = `<span style="font-size: 2.2rem;">🍺</span><br>คุณทำการสลับการ์ดตัวเองกับการ์ดตรงกลางใบที่ <strong>${res.centerIndex + 1}</strong> เรียบร้อย!<br><span style="font-size:0.75rem; color:var(--color-slate-400)">(ระบบสลับตำแหน่งให้คุณแล้ว โดยไม่ให้คุณรู้ว่าเป็นบทใดตามกติกาคนเมา)</span>`;
        speakThai(`สลับการ์ดของคุณกับตรงกลางเสร็จสิ้น`);
    }
    else if (res.viewType === "insomniac") {
        const meta = ROLE_DETAILS[res.role];
        myCurrentRole = res.role;
        displayCard.innerHTML = `ตรวจสอบการ์ดเสร็จสิ้น!<br>บทบาทลับปัจจุบันของคุณในตอนนี้คือ:<br>
            <span style="font-size: 2.2rem;">${meta.icon}</span><br>
            <strong style="color: ${meta.color}; font-size:1.3rem;">${meta.name}</strong>`;
        speakThai(`บทบาทลับปัจจุบันของคุณคือ ${meta.name}`);
    }

    grid.appendChild(displayCard);
}

// Shows fingerprint-decrypted role details
function showMyInitialRole() {
    const meta = ROLE_DETAILS[myInitialRole];
    document.getElementById('decrypted-role-icon').innerText = meta.icon;
    document.getElementById('decrypted-role-title').innerText = "บทบาทเริ่มต้นของคุณ";
    document.getElementById('decrypted-role-name').innerText = meta.name;
    document.getElementById('decrypted-role-name').style.color = meta.color;
    document.getElementById('decrypted-role-desc').innerText = meta.desc;
    
    // Custom borders and glow matching the role
    const rPanel = document.getElementById('role-panel');
    rPanel.querySelector('.decrypted-card').style.borderColor = meta.color;
    rPanel.querySelector('.decrypted-card').style.boxShadow = `0 0 25px ${meta.color}50`;
    
    rPanel.classList.remove('hidden');
}

// Transition to Day discussion
let dayTimerInterval = null;
function startDayPhase() {
    console.log("Starting Day Phase...");
    
    document.getElementById('game-phase-banner').classList.add('day-phase');
    document.getElementById('game-phase-text').innerText = "รุ่งอรุณสว่างไสว: ช่วงเวลาสืบหาคนร้าย ☀️";
    
    document.getElementById('view-night').classList.add('hidden');
    document.getElementById('view-day').classList.remove('hidden');
    
    // Render list for voting
    renderVotePlayers();
    
    // Start discussion timer count down
    let timeLeft = currentSettings.duration * 60; // in seconds
    
    const updateTimerDisplay = () => {
        const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const secs = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('day-timer').innerText = `${mins}:${secs}`;
    };
    
    updateTimerDisplay();
    
    if (dayTimerInterval) clearInterval(dayTimerInterval);
    dayTimerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(dayTimerInterval);
            dayTimerInterval = null;
            speakThai("หมดเวลากลางวันแล้ว ทุกคนต้องลงมติเลือกคนที่ต้องการประหารชีวิตทันที!");
            showAlert("หมดเวลา", "หมดเวลาปรึกษา! กรุณาลงคะแนนโหวตแขวนคอหมาป่าด่วน");
        }
    }, 1000);
}

// Render voting player cards
let selectedVotePlayerId = null;
function renderVotePlayers() {
    const grid = document.getElementById('vote-players-grid');
    grid.innerHTML = "";
    selectedVotePlayerId = null;

    // List all players to vote for
    players.forEach(p => {
        const card = document.createElement('div');
        card.className = "vote-card";
        card.dataset.id = p.id;
        
        // Disable voting for yourself
        if (p.id === myPlayerId) {
            card.style.opacity = "0.5";
            card.style.cursor = "not-allowed";
            card.innerHTML = `<span style="font-size:1.5rem;">👤</span><span class="name">${p.name} (คุณ)</span>`;
        } else {
            card.innerHTML = `<span style="font-size:1.5rem;">👤</span><span class="name">${p.name}</span>`;
            card.addEventListener('click', () => {
                document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedVotePlayerId = p.id;
                
                // Instantly cast/update vote
                playBeep(450, 0.1, 'sine');
                publishMessage(`werewolf/room/${roomCode}/host`, {
                    type: "VOTE_SUBMIT",
                    playerId: myPlayerId,
                    targetId: selectedVotePlayerId
                });
            });
        }
        grid.appendChild(card);
    });
}

// Host resolves final game outcomes
function concludeGameAndReveal() {
    if (hostGameState.revealed) return;
    hostGameState.revealed = true;

    console.log("Concluding game. Evaluating votes...");
    
    // 1. Compile vote tallies
    const voteCounts = {}; // playerId -> vote count
    players.forEach(p => voteCounts[p.id] = 0);
    
    let totalVotesCast = 0;
    Object.values(hostGameState.votes).forEach(targetId => {
        if (voteCounts[targetId] !== undefined) {
            voteCounts[targetId]++;
            totalVotesCast++;
        }
    });

    // 2. Find max vote count
    let maxVotes = 0;
    let hangedPlayers = [];
    
    Object.entries(voteCounts).forEach(([pId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            hangedPlayers = [pId];
        } else if (count === maxVotes && count > 0) {
            hangedPlayers.push(pId);
        }
    });

    // One Night Rule: If everyone gets <= 1 vote, no one is hanged
    let someoneHanged = (maxVotes >= 2);
    if (!someoneHanged) {
        hangedPlayers = [];
    }

    // 3. Determine winner
    let winner = "werewolves"; // Werewolves win by default if villagers fail
    
    // Check if there are active wolves on the board
    const boardWolves = Object.entries(hostGameState.currentRoles)
        .filter(([key, role]) => !key.startsWith("center-") && role === "werewolf")
        .map(([pId, _]) => pId);
    const hasBoardWolves = (boardWolves.length > 0);

    // Check if there are active minions on the board
    const boardMinions = Object.entries(hostGameState.currentRoles)
        .filter(([key, role]) => !key.startsWith("center-") && role === "minion")
        .map(([pId, _]) => pId);
    const hasBoardMinions = (boardMinions.length > 0);

    // Determine Tanner win first
    const caughtTanner = hangedPlayers.some(pId => hostGameState.currentRoles[pId] === "tanner");

    if (caughtTanner) {
        winner = "tanner";
    } else {
        if (someoneHanged) {
            const hangedRoles = hangedPlayers.map(pId => hostGameState.currentRoles[pId]);
            const caughtWolf = hangedRoles.some(r => r === "werewolf");
            
            if (caughtWolf) {
                winner = "villagers"; // Villagers caught a wolf!
            } else {
                // If there are no wolves, but there is a minion
                if (!hasBoardWolves && hasBoardMinions) {
                    const caughtMinion = hangedRoles.some(r => r === "minion");
                    if (caughtMinion) {
                        winner = "villagers"; // Villagers win because they killed the evil minion
                    } else {
                        winner = "werewolves"; // Minion/wolves win because a villager was killed
                    }
                } else {
                    winner = "werewolves"; // Killed someone else (a villager), so wolves win
                }
            }
        } else {
            // No one hanged
            if (!hasBoardWolves && !hasBoardMinions) {
                winner = "villagers"; // No wolves/minions in play, and no one hanged!
            } else {
                winner = "werewolves"; // Wolves/minions in play, and no one hanged!
            }
        }
    }

    // 4. Compile payload and broadcast GAME_OVER
    publishMessage(`werewolf/room/${roomCode}/lobby`, {
        type: "GAME_OVER",
        winner: winner,
        votes: hostGameState.votes,
        initialRoles: hostGameState.initialRoles,
        finalRoles: hostGameState.currentRoles,
        centerCards: [
            hostGameState.currentRoles["center-0"],
            hostGameState.currentRoles["center-1"],
            hostGameState.currentRoles["center-2"]
        ],
        swaps: hostGameState.swaps,
        hangedPlayers: hangedPlayers
    });
}

// Client parses and renders game results screen
function handleGameOverMessage(data) {
    if (dayTimerInterval) {
        clearInterval(dayTimerInterval);
        dayTimerInterval = null;
    }

    playBeep(winnerBeepFreq(data.winner), 0.5, 'sine');

    document.getElementById('view-day').classList.add('hidden');
    document.getElementById('view-reveal').classList.remove('hidden');

    // Title configuration
    const winTitle = document.getElementById('reveal-winner-title');
    const winDesc = document.getElementById('reveal-winner-desc');
    
    let descriptionText = "";
    
    if (data.winner === "villagers") {
        winTitle.innerText = "ฝ่ายชาวบ้านชนะ! 🎉";
        winTitle.style.color = "var(--color-emerald)";
        winTitle.style.textShadow = "0 0 15px rgba(16, 185, 129, 0.4)";
        speakThai("ขอแสดงความยินดีด้วย ฝ่ายชาวบ้านเป็นฝ่ายชนะการประหาร!");
        
        if (data.hangedPlayers && data.hangedPlayers.length > 0) {
            const names = data.hangedPlayers.map(pId => getPlayerNameById(pId));
            descriptionText = `บทบาทชั่วร้ายถูกเปิดโปงและแขวนคอสำเร็จ: <strong>${names.join(", ")}</strong>`;
        } else {
            descriptionText = "ไม่มีใครถูกประหารชีวิต และไม่มีทั้งหมาป่าหรือสมุนหมาป่าในเกมเลย";
        }
    } else if (data.winner === "tanner") {
        winTitle.innerText = "ตัวตลกชนะ! 🏆";
        winTitle.style.color = "var(--color-accent)";
        winTitle.style.textShadow = "0 0 15px rgba(245, 158, 11, 0.4)";
        speakThai("ตัวตลกถูกโหวตประหารชีวิตสำเร็จ ได้รับชัยชนะแต่เพียงผู้เดียว!");
        
        const names = data.hangedPlayers.map(pId => getPlayerNameById(pId));
        descriptionText = `ตัวตลกทำการหลอกล่อให้สมาคมแขวนคอเขาสำเร็จ: <strong>${names.join(", ")}</strong> (คนอื่นพ่ายแพ้ทั้งหมด)`;
    } else {
        winTitle.innerText = "ฝ่ายหมาป่าชนะ! 🐺";
        winTitle.style.color = "var(--color-primary)";
        winTitle.style.textShadow = "0 0 15px rgba(239, 68, 68, 0.4)";
        speakThai("คืนล่าหมาป่าจบลง ฝ่ายหมาป่าหลบหนีลอยนวลและคว้าชัยชนะ!");
        
        if (data.hangedPlayers && data.hangedPlayers.length > 0) {
            const names = data.hangedPlayers.map(pId => getPlayerNameById(pId));
            descriptionText = `โชคร้ายที่ประชากรชาวบ้านถูกแขวนคอผิดคน: <strong>${names.join(", ")}</strong>`;
        } else {
            descriptionText = "ไม่มีใครถูกโหวตประหารชีวิต ทั้งที่มีหมาป่าหรือผู้ช่วยแฝงตัวอยู่";
        }
    }

    winDesc.innerHTML = descriptionText;

    // Render Table rows
    const tbody = document.getElementById('reveal-players-table-body');
    tbody.innerHTML = "";
    
    players.forEach(p => {
        const initRole = data.initialRoles[p.id];
        const finRole = data.finalRoles[p.id];
        const voteTargetId = data.votes[p.id];
        const voteTargetName = voteTargetId ? getPlayerNameById(voteTargetId) : "ไม่ได้โหวต";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.name}</strong><br><span style="font-size:0.75rem; color:var(--color-slate-400)">โหวตให้: ${voteTargetName}</span></td>
            <td><span class="role-badge ${initRole}">${ROLE_DETAILS[initRole].name}</span></td>
            <td><span class="role-badge ${finRole}">${ROLE_DETAILS[finRole].name}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Render Center Cards
    const centerGrid = document.getElementById('reveal-center-cards');
    centerGrid.innerHTML = "";
    
    data.centerCards.forEach((role, idx) => {
        const meta = ROLE_DETAILS[role];
        const card = document.createElement('div');
        card.className = "center-card-reveal";
        card.innerHTML = `
            <span class="idx">ใบที่ ${idx+1}</span>
            <span style="font-size: 1.5rem;">${meta.icon}</span>
            <span class="val" style="color: ${meta.color}">${meta.name}</span>
        `;
        centerGrid.appendChild(card);
    });

    // Display swap logs if any special swaps happened
    if (data.swaps && data.swaps.length > 0) {
        const logsDiv = document.createElement('div');
        logsDiv.style.gridColumn = "1 / -1";
        logsDiv.style.marginTop = "15px";
        logsDiv.style.background = "rgba(0,0,0,0.25)";
        logsDiv.style.padding = "10px 15px";
        logsDiv.style.borderRadius = "10px";
        
        let logsHtml = `<h4 style="font-size:0.9rem; color:var(--color-secondary); margin-bottom:8px;">บันทึกการสับเปลี่ยนคืนนี้:</h4>`;
        logsHtml += `<ul style="list-style:none; padding-left:0; font-size:0.8rem; display:flex; flex-direction:column; gap:4px;">`;
        data.swaps.forEach(sw => {
            logsHtml += `<li style="color:var(--color-slate-300)">🔸 ${sw.detail}</li>`;
        });
        logsHtml += `</ul>`;
        logsDiv.innerHTML = logsHtml;
        
        // Append at end of reveal section
        document.querySelector('.reveal-board-section').appendChild(logsDiv);
    }

    // Restart button only available to original Host
    const restartBtn = document.getElementById('btn-restart-game');
    if (isHost) {
        restartBtn.style.display = "block";
        restartBtn.onclick = () => {
            speakThai("เริ่มเกมนัดล้างตาแจกบทบาทใหม่");
            setupAndStartGame();
        };
    } else {
        restartBtn.style.display = "none";
    }
}

function winnerBeepFreq(winner) {
    if (winner === "villagers") return 880;
    if (winner === "tanner") return 660;
    return 330;
}

// Leave game & disconnect helpers
function leaveGame() {
    playBeep(220, 0.2, 'sawtooth');
    
    if (client && connectionState === "connected") {
        if (isHost) {
            // Tell everyone host is closing room
            publishMessage(`werewolf/room/${roomCode}/lobby`, {
                type: "HOST_CLOSE"
            });
        } else {
            // Tell host you're leaving
            publishMessage(`werewolf/room/${roomCode}/lobby`, {
                type: "LEAVE_ANNOUNCEMENT",
                playerId: myPlayerId
            });
        }
        
        try {
            client.disconnect();
        } catch (e) {}
    }
    
    resetGameState();
    showScreen('screen-welcome');
}

function resetGameState() {
    connectionState = "disconnected";
    client = null;
    players = [];
    myInitialRole = null;
    myCurrentRole = null;
    werewolvesList = [];
    myActionSubmitted = false;
    nightActionData = null;
    currentSlotIndex = -1;
    spokenTimeline = {};
    if (timelineTimer) {
        clearInterval(timelineTimer);
        timelineTimer = null;
    }
    if (dayTimerInterval) {
        clearInterval(dayTimerInterval);
        dayTimerInterval = null;
    }
}

// Utility lookup helpers
function getPlayerNameById(id) {
    const p = players.find(x => x.id === id);
    return p ? p.name : "ผู้เล่นปริศนา";
}
