// Serverless Multiplayer Client for Forbidden Word using MQTT

let roomCode = null;
let myName = null;
let myToken = null; // Generated locally to identify client
let mySecretKey = null; // Generated locally (unused but kept for architectural compatibility)
let userRole = null; // 'OWNER' or 'MEMBER'
let gameState = 'LOBBY'; // 'LOBBY' | 'PLAYING' | 'ENDED'

// MQTT connection variables
let mqttClient = null;
let currentBrokerIndex = 0;
const BROKERS = [
    { host: "broker.hivemq.com", port: 8884 },
    { host: "broker.emqx.io", port: 8084 }
];

// In-memory databases
let players = {}; // For OWNER: token -> { name, lastActive, score, eliminated, word }
let playersList = []; // For MEMBER: array of player objects
let gameDuration = 300; // default 5 minutes (300 seconds)
let gameMode = 'survival'; // 'survival' | 'score'
let activeCategories = []; // selected categories keys
let wordAssignments = {}; // token -> base64 word
let myWord = ""; // decrypted word for myself
let gameEventsLog = []; // list of events

// Game loops and intervals
let lobbyHeartbeatInterval = null;
let localTimerInterval = null;
let consecutiveErrors = 0;

// Base64 helper for masking words in raw MQTT feeds
function encodeWord(text) {
    try {
        return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
        return text;
    }
}

function decodeWord(encodedText) {
    try {
        return decodeURIComponent(escape(atob(encodedText)));
    } catch (e) {
        return encodedText;
    }
}

// 1. INITIALIZATION ON DOM LOAD
document.addEventListener("DOMContentLoaded", () => {
    // Populate categories checklist
    const catContainer = document.getElementById("lobby-categories-list");
    if (catContainer && window.FORBIDDEN_WORDS) {
        catContainer.innerHTML = "";
        activeCategories = Object.keys(window.FORBIDDEN_WORDS); // select all by default
        
        Object.keys(window.FORBIDDEN_WORDS).forEach(key => {
            const cat = window.FORBIDDEN_WORDS[key];
            const label = document.createElement("label");
            label.className = "category-checkbox-label active";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = key;
            checkbox.checked = true;
            
            checkbox.addEventListener("change", (e) => {
                if (userRole !== 'OWNER') {
                    e.target.checked = !e.target.checked; // members can't change
                    return;
                }
                if (e.target.checked) {
                    if (!activeCategories.includes(key)) activeCategories.push(key);
                } else {
                    activeCategories = activeCategories.filter(item => item !== key);
                }
                label.classList.toggle('active', e.target.checked);
                document.getElementById("selected-categories-count").innerText = activeCategories.length;
                broadcastSettings();
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(cat.name));
            catContainer.appendChild(label);
        });
        document.getElementById("selected-categories-count").innerText = activeCategories.length;
    }

    // Check query params for auto-joining
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.length === 4) {
        document.getElementById("input-room-code").value = roomParam.toUpperCase();
    }

    // Check if running on file:// protocol
    if (window.location.protocol === 'file:') {
        const warningEl = document.getElementById("protocol-warning");
        if (warningEl) warningEl.style.display = "block";
    }

    // Setup input listeners
    document.getElementById("input-player-name").addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("input-room-code").focus();
    });
    document.getElementById("input-room-code").addEventListener("keypress", (e) => {
        if (e.key === "Enter") joinRoom();
    });

    // Generate tokens
    myToken = "token_" + Math.random().toString(36).substring(2, 15);
    mySecretKey = "key_" + Math.random().toString(36).substring(2, 12);
});

// Sound Synthesizer (Web Audio API)
function playSynthSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'busted') {
            // Descending buzzer sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
            if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
        } else if (type === 'win') {
            // Ascending chord sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.36); // C6
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
            if (navigator.vibrate) navigator.vibrate([300]);
        } else if (type === 'click') {
            // Click sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        }
    } catch (e) {
        console.warn("Web AudioContext blocked or not supported:", e);
    }
}

function updateDurationLabel(val) {
    document.getElementById("lbl-duration").innerText = `${val} นาที`;
    gameDuration = val * 60;
}

function onSettingChanged() {
    if (userRole !== 'OWNER') return;
    gameMode = document.getElementById("select-game-mode").value;
    broadcastSettings();
}

// 2. MQTT CLIENT CONNECTION
function connectMQTT(onSuccess, onFailure) {
    const broker = BROKERS[currentBrokerIndex];
    console.log(`Connecting to MQTT broker: ${broker.host}:${broker.port}`);
    
    const client = new Paho.MQTT.Client(broker.host, broker.port, "forbidden_" + Math.random().toString(36).substring(2, 12));
    
    client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
            console.error("Connection lost:", responseObject.errorMessage);
            setTimeout(() => {
                connectMQTT(onSuccess, onFailure);
            }, 3000);
        }
    };
    
    client.onMessageArrived = (message) => {
        try {
            const payload = JSON.parse(message.payloadString);
            handleIncomingMessage(payload);
        } catch (e) {
            console.error("Failed to parse MQTT payload:", e);
        }
    };
    
    const options = {
        useSSL: true,
        onSuccess: () => {
            console.log("Connected successfully to " + broker.host);
            mqttClient = client;
            consecutiveErrors = 0;
            onSuccess(client);
        },
        onFailure: (err) => {
            console.error("Broker connection failed, fallback:", err);
            consecutiveErrors++;
            if (consecutiveErrors > 5) {
                showAlert("ข้อผิดพลาด", "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้งภายหลัง");
                return;
            }
            currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
            setTimeout(() => {
                connectMQTT(onSuccess, onFailure);
            }, 1000);
        }
    };
    
    client.connect(options);
}

function publishMessage(payload) {
    if (!mqttClient || !mqttClient.isConnected() || !roomCode) return;
    const topic = `forbidden_lobby/rooms/v1/${roomCode}`;
    const message = new Paho.MQTT.Message(JSON.stringify(payload));
    message.destinationName = topic;
    message.qos = 0;
    mqttClient.send(message);
}

// 3. ACTIONS
async function createRoom() {
    playSynthSound('click');
    const nameInput = document.getElementById("input-player-name").value.trim();
    if (!nameInput) {
        showAlert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อของคุณ");
        return;
    }
    
    // Generate 4-character Room Code
    roomCode = Array.from({length: 4}, () => "BCDFGHJKLMNPQRSTVWXYZ"[Math.floor(Math.random() * 21)]).join("");
    myName = nameInput;
    userRole = 'OWNER';
    gameState = 'LOBBY';
    
    document.getElementById("lobby-code").innerText = roomCode;
    document.getElementById("lobby-owner-info").style.display = "block";
    document.getElementById("lobby-player-info").style.display = "none";
    document.getElementById("btn-start-game").style.display = "block";
    
    enableSettingsInputs(true);
    
    players = {};
    players[myToken] = {
        name: myName,
        lastActive: Date.now(),
        score: 0,
        eliminated: false,
        word: ""
    };
    
    showScreen("screen-lobby");
    updateLobbyPlayersUI();
    generateQR();

    connectMQTT((client) => {
        client.subscribe(`forbidden_lobby/rooms/v1/${roomCode}`);
        
        if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
        lobbyHeartbeatInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (let token in players) {
                if (token !== myToken && now - players[token].lastActive > 6000) {
                    console.log(`Player ${players[token].name} timed out`);
                    delete players[token];
                    changed = true;
                }
            }
            if (changed) {
                updateLobbyPlayersUI();
            }
            broadcastState();
        }, 2000);
        
    }, (err) => {
        showAlert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ระบบเล่นร่วมกันได้");
        leaveRoom();
    });
}

async function joinRoom() {
    playSynthSound('click');
    const nameInput = document.getElementById("input-player-name").value.trim();
    const codeInput = document.getElementById("input-room-code").value.trim().toUpperCase();
    
    if (!nameInput) {
        showAlert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อของคุณ");
        return;
    }
    if (!codeInput || codeInput.length !== 4) {
        showAlert("ข้อมูลไม่ครบ", "กรุณากรอกรหัสห้อง 4 หลัก");
        return;
    }
    
    roomCode = codeInput;
    myName = nameInput;
    userRole = 'MEMBER';
    gameState = 'LOBBY';
    
    document.getElementById("lobby-code").innerText = roomCode;
    document.getElementById("lobby-owner-info").style.display = "none";
    document.getElementById("lobby-player-info").style.display = "block";
    document.getElementById("lobby-my-name-badge").innerText = `ผู้เล่น: ${myName}`;
    document.getElementById("game-player-name").innerText = `ผู้เล่น: ${myName}`;
    document.getElementById("btn-start-game").style.display = "none";
    
    enableSettingsInputs(false);
    showScreen("screen-lobby");
    
    connectMQTT((client) => {
        client.subscribe(`forbidden_lobby/rooms/v1/${roomCode}`);
        
        publishMessage({
            type: "JOIN",
            sender: myName,
            token: myToken
        });
        
        if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
        lobbyHeartbeatInterval = setInterval(() => {
            publishMessage({
                type: "HEARTBEAT",
                sender: myName,
                token: myToken
            });
        }, 2000);
        
    }, (err) => {
        showAlert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ระบบเล่นร่วมกันได้");
        leaveRoom();
    });
}

function leaveRoom() {
    playSynthSound('click');
    if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
    if (localTimerInterval) clearInterval(localTimerInterval);
    
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.disconnect();
    }
    
    roomCode = null;
    myName = null;
    userRole = null;
    gameState = 'LOBBY';
    players = {};
    playersList = [];
    
    showScreen("screen-welcome");
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
}

function enableSettingsInputs(enable) {
    document.getElementById("select-game-mode").disabled = !enable;
    document.getElementById("range-duration").disabled = !enable;
}

function generateQR() {
    const qrDiv = document.getElementById("lobby-qr-code");
    if (!qrDiv) return;
    qrDiv.innerHTML = "";
    
    let joinUrl = window.location.origin + window.location.pathname + "?room=" + roomCode;
    let isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol) {
        joinUrl = "https://teacher-neutron-boardgames.pages.dev/games/forbidden-word/index.html?room=" + roomCode;
    }
    
    try {
        const qrCanvasContainer = document.createElement("div");
        qrCanvasContainer.style.margin = "0 auto";
        qrCanvasContainer.style.display = "inline-block";
        qrDiv.appendChild(qrCanvasContainer);
        
        new QRCode(qrCanvasContainer, {
            text: joinUrl,
            width: 120,
            height: 120,
            colorDark: "#090613",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
        
        if (isFileProtocol) {
            const note = document.createElement("div");
            note.style.cssText = "font-size: 0.75rem; color: var(--warning-color); margin-top: 8px; line-height: 1.4; max-width: 240px; margin-left: auto; margin-right: auto;";
            note.innerText = "💡 เปิดไฟล์โดยตรงในเครื่อง ให้เพื่อนสลับเข้าเว็บบอร์ดเกมแล้วกรอกรหัสห้องแทน";
            qrDiv.appendChild(note);
        }
    } catch (e) {
        console.error("Failed to generate QR code:", e);
    }
}

// 4. MQTT STATE BROADCASTS (OWNER ONLY)
function broadcastState() {
    if (userRole !== 'OWNER' || gameState !== 'LOBBY') return;
    
    publishMessage({
        type: "LOBBY_STATE",
        players: Object.values(players).map(p => ({
            token: p.token || Object.keys(players).find(k => players[k] === p),
            name: p.name
        })),
        settings: {
            duration: gameDuration,
            gameMode: gameMode,
            categories: activeCategories
        }
    });
}

function broadcastSettings() {
    if (userRole !== 'OWNER') return;
    broadcastState();
}

// 5. INCOMING MESSAGE ROUTER
function handleIncomingMessage(msg) {
    if (!msg || !msg.type) return;
    
    // ================= OWNER HANDLERS =================
    if (userRole === 'OWNER') {
        if (msg.type === "JOIN") {
            console.log(`Player ${msg.sender} joined`);
            players[msg.token] = {
                name: msg.sender,
                lastActive: Date.now(),
                score: 0,
                eliminated: false,
                word: ""
            };
            updateLobbyPlayersUI();
            broadcastState();
        }
        else if (msg.type === "HEARTBEAT") {
            if (players[msg.token]) {
                players[msg.token].lastActive = Date.now();
            } else {
                publishMessage({ type: "REQUEST_REJOIN" });
            }
        }
        else if (msg.type === "BUSTED") {
            handleBustedEventOnOwner(msg.targetToken, msg.bustedBy, msg.word);
        }
    }
    
    // ================= MEMBER HANDLERS =================
    if (userRole === 'MEMBER') {
        if (msg.type === "LOBBY_STATE") {
            playersList = msg.players;
            updateLobbyPlayersUI();
            
            gameDuration = msg.settings.duration;
            gameMode = msg.settings.gameMode;
            activeCategories = msg.settings.categories;
            
            document.getElementById("select-game-mode").value = gameMode;
            document.getElementById("range-duration").value = gameDuration / 60;
            document.getElementById("lbl-duration").innerText = `${gameDuration / 60} นาที`;
            
            updateMemberCategoriesCheckboxes();
        }
        else if (msg.type === "REQUEST_REJOIN") {
            publishMessage({
                type: "JOIN",
                sender: myName,
                token: myToken
            });
        }
    }

    // ================= SHARED HANDLERS =================
    if (msg.type === "START") {
        if (gameState !== 'PLAYING') {
            gameState = 'PLAYING';
            setupGameScreen(msg);
        }
    }
    else if (msg.type === "STOP") {
        if (gameState === 'PLAYING') {
            gameState = 'ENDED';
            showRevealPanel(msg.scoreboard, msg.gameMode);
        }
    }
    else if (msg.type === "BUST_ALERT") {
        handleBustAlertOnClient(msg);
    }
    else if (msg.type === "NEW_WORD_BROADCAST") {
        handleNewWordOnClient(msg);
    }
}

// 6. UI SYNCHRONIZERS
function updateLobbyPlayersUI() {
    const listContainer = document.getElementById("lobby-players-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    const list = userRole === 'OWNER' ? Object.values(players).map(p => p.name) : playersList.map(p => p.name);
    document.getElementById("lobby-players-count").innerText = list.length;
    
    if (list.length === 0) {
        listContainer.innerHTML = `<li style="grid-column: 1/-1; color: var(--text-muted);">กำลังรอผู้เล่นเข้าร่วม...</li>`;
        return;
    }
    
    list.forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        if (name === myName) {
            li.style.borderColor = "var(--primary-color)";
            li.style.color = "var(--primary-color)";
            li.style.boxShadow = "0 0 10px rgba(244, 63, 94, 0.15)";
        }
        listContainer.appendChild(li);
    });
}

function updateMemberCategoriesCheckboxes() {
    document.querySelectorAll("#lobby-categories-list input").forEach(cb => {
        const active = activeCategories.includes(cb.value);
        cb.checked = active;
        cb.parentElement.classList.toggle('active', active);
    });
}

// 7. GAME ENGINE
function getRandomWord() {
    // Pick random category key from active categories
    if (activeCategories.length === 0) return "ความรัก"; // fallback
    const randomCatKey = activeCategories[Math.floor(Math.random() * activeCategories.length)];
    const wordList = window.FORBIDDEN_WORDS[randomCatKey].words;
    return wordList[Math.floor(Math.random() * wordList.length)];
}

function startGame() {
    if (userRole !== 'OWNER') return;
    
    const plist = Object.keys(players);
    if (plist.length < 2) {
        showAlert("เริ่มเกมไม่ได้", "ต้องมีผู้เล่นอย่างน้อย 2 คนขึ้นไป");
        return;
    }
    
    if (activeCategories.length === 0) {
        showAlert("เริ่มเกมไม่ได้", "กรุณาเลือกหมวดหมู่คำอย่างน้อย 1 หมวด");
        return;
    }
    
    // Assign words
    let assigned = {};
    for (let token in players) {
        const word = getRandomWord();
        players[token].word = word;
        players[token].score = 0;
        players[token].eliminated = false;
        assigned[token] = encodeWord(word);
    }
    
    const timerEndTime = (Date.now() / 1000) + gameDuration;
    
    publishMessage({
        type: "START",
        timer_end: timerEndTime,
        duration: gameDuration,
        gameMode: gameMode,
        words: assigned,
        players: Object.keys(players).map(t => ({
            token: t,
            name: players[t].name,
            score: 0,
            eliminated: false
        }))
    });
}

function setupGameScreen(msg) {
    showScreen("screen-game");
    
    document.getElementById("post-game-reveal-panel").style.display = "none";
    document.getElementById("game-events-feed").innerHTML = `<div class="event-item event-system">เริ่มการประลองคำต้องห้าม!</div>`;
    gameEventsLog = [];
    
    if (userRole === 'OWNER') {
        document.getElementById("btn-owner-stop-game").style.display = "block";
    } else {
        document.getElementById("btn-owner-stop-game").style.display = "none";
    }
    
    gameMode = msg.gameMode;
    const modeLabel = gameMode === 'survival' ? 'โหมด: เอาชีวิตรอด 💀' : 'โหมด: เก็บคะแนน 🏆';
    document.getElementById("game-mode-indicator").innerText = modeLabel;
    
    // Parse word assignments
    wordAssignments = msg.words;
    playersList = msg.players;
    
    // Decrypt my word
    const myEncodedWord = wordAssignments[myToken];
    myWord = myEncodedWord ? decodeWord(myEncodedWord) : "???";
    
    // Populate normal game screen
    updateGameGridUI();
    
    // Setup timer
    startLocalTimer(msg.timer_end, msg.duration);
}

function updateGameGridUI() {
    const grid = document.getElementById("game-words-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    playersList.forEach(p => {
        const isMe = p.token === myToken;
        const card = document.createElement("div");
        card.className = `player-word-card ${isMe ? 'my-card' : ''} ${p.eliminated ? 'busted-card' : ''}`;
        card.id = `card-${p.token}`;
        
        // Header (Name and Score)
        const header = document.createElement("div");
        header.className = "card-player-header";
        
        const nameSpan = document.createElement("span");
        nameSpan.className = "card-player-name";
        nameSpan.innerText = p.name;
        header.appendChild(nameSpan);
        
        const scoreSpan = document.createElement("span");
        scoreSpan.className = `score-badge ${p.score < 0 ? 'minus' : ''}`;
        scoreSpan.id = `score-${p.token}`;
        scoreSpan.innerText = `${p.score} แต้ม`;
        header.appendChild(scoreSpan);
        
        card.appendChild(header);
        
        // Word display area
        const wordDiv = document.createElement("div");
        wordDiv.className = "card-word-display";
        wordDiv.id = `word-display-${p.token}`;
        
        if (isMe) {
            // My card - hide the word in normal view
            wordDiv.innerHTML = `
                <div class="word-hidden-display">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-lock"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span>คำต้องห้ามของคุณ (ซ่อนไว้)</span>
                </div>
            `;
        } else {
            // Other players - show their word
            const word = decodeWord(wordAssignments[p.token]);
            wordDiv.innerText = p.eliminated ? `[ ${word} ]` : word;
        }
        card.appendChild(wordDiv);
        
        // Busted / Control button
        if (!isMe && !p.eliminated && gameState === 'PLAYING') {
            const btn = document.createElement("button");
            btn.className = "btn-busted";
            btn.innerText = "🚨 จับได้แล้ว!";
            btn.onclick = () => reportBusted(p.token, p.name);
            card.appendChild(btn);
        }
        
        // Add eliminated visual banner
        if (p.eliminated) {
            const banner = document.createElement("div");
            banner.className = "busted-banner";
            banner.innerText = "ตกรอบ";
            card.appendChild(banner);
        }
        
        grid.appendChild(card);
    });
}

// 8. BUSTED ACTION LOGIC
function reportBusted(targetToken, targetName) {
    playSynthSound('click');
    const word = decodeWord(wordAssignments[targetToken]);
    
    // Publish a BUSTED request
    publishMessage({
        type: "BUSTED",
        targetToken: targetToken,
        bustedBy: myName,
        word: word
    });
}

// Owner Logic for Busted
function handleBustedEventOnOwner(targetToken, bustedBy, word) {
    if (gameState !== 'PLAYING') return;
    
    const playerObj = players[targetToken];
    if (!playerObj || playerObj.eliminated) return;
    
    if (gameMode === 'survival') {
        playerObj.eliminated = true;
        
        publishMessage({
            type: "BUST_ALERT",
            targetToken: targetToken,
            targetName: playerObj.name,
            bustedBy: bustedBy,
            word: word,
            eliminated: true,
            score: playerObj.score
        });
        
        // Check if game should end (only 1 player remaining)
        const survivors = Object.values(players).filter(p => !p.eliminated);
        if (survivors.length <= 1) {
            setTimeout(() => {
                requestStopGame();
            }, 1500);
        }
    } else {
        // Score Mode: deduct point and assign new word
        playerObj.score -= 1;
        const newWord = getRandomWord();
        playerObj.word = newWord;
        
        publishMessage({
            type: "BUST_ALERT",
            targetToken: targetToken,
            targetName: playerObj.name,
            bustedBy: bustedBy,
            word: word,
            eliminated: false,
            score: playerObj.score
        });
        
        // Broadcast new word after brief delay to show animation
        setTimeout(() => {
            publishMessage({
                type: "NEW_WORD_BROADCAST",
                targetToken: targetToken,
                targetName: playerObj.name,
                word: encodeWord(newWord),
                score: playerObj.score
            });
        }, 1200);
    }
}

// Client logic for Bust Alert
function handleBustAlertOnClient(msg) {
    playSynthSound('busted');
    
    // Add to logs feed
    const logContainer = document.getElementById("game-events-feed");
    if (logContainer) {
        const item = document.createElement("div");
        item.className = "event-item event-busted";
        item.innerHTML = `<strong>${msg.bustedBy}</strong> จับได้ว่า <strong>${msg.targetName}</strong> พูดคำต้องห้าม <em>"${msg.word}"</em>!`;
        logContainer.prepend(item);
    }
    
    // Update local players list copy
    const playerIdx = playersList.findIndex(p => p.token === msg.targetToken);
    if (playerIdx !== -1) {
        playersList[playerIdx].eliminated = msg.eliminated;
        playersList[playerIdx].score = msg.score;
    }
    
    // Animate Busted player card
    const card = document.getElementById(`card-${msg.targetToken}`);
    if (card) {
        card.classList.add("busted-card");
        card.style.transform = "scale(0.96)";
        
        // Remove button
        const btn = card.querySelector(".btn-busted");
        if (btn) btn.remove();
        
        // Add banner
        if (msg.eliminated && !card.querySelector(".busted-banner")) {
            const banner = document.createElement("div");
            banner.className = "busted-banner";
            banner.innerText = "ตกรอบ";
            card.appendChild(banner);
        }
        
        // Update score badge
        const scoreBadge = document.getElementById(`score-${msg.targetToken}`);
        if (scoreBadge) {
            scoreBadge.innerText = `${msg.score} แต้ม`;
            scoreBadge.className = `score-badge minus`;
        }
        
        // Strikethrough the word
        const wDisplay = document.getElementById(`word-display-${msg.targetToken}`);
        if (wDisplay && msg.targetToken !== myToken) {
            wDisplay.innerText = `[ ${msg.word} ]`;
            wDisplay.style.textDecoration = "line-through";
            wDisplay.style.color = "var(--danger-color)";
        }
    }
    
    // If it is myself, alert on screen
    if (msg.targetToken === myToken) {
        if (msg.eliminated) {
            showAlert("คุณตกรอบแล้ว!", `คุณเผลอพูดคำว่า "${msg.word}" และถูกเพื่อนจับได้!`);
            toggleForeheadMode(false); // turn off forehead mode
        } else {
            // Just score decrease warning, wait for new word
            const alertBox = document.createElement("div");
            alertBox.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(239, 68, 68, 0.95); padding:10px 20px; border-radius:10px; z-index:99999; color:white; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.5);";
            alertBox.innerText = `คุณเผลอพูดคำว่า "${msg.word}"! (-1 คะแนน)`;
            document.body.appendChild(alertBox);
            setTimeout(() => alertBox.remove(), 2500);
        }
    }
}

// Client logic for new word
function handleNewWordOnClient(msg) {
    wordAssignments[msg.targetToken] = msg.word;
    
    const playerIdx = playersList.findIndex(p => p.token === msg.targetToken);
    if (playerIdx !== -1) {
        playersList[playerIdx].score = msg.score;
    }
    
    // Update grid UI card
    const card = document.getElementById(`card-${msg.targetToken}`);
    if (card) {
        card.classList.remove("busted-card");
        card.style.transform = "scale(1)";
        
        // Update score badge
        const scoreBadge = document.getElementById(`score-${msg.targetToken}`);
        if (scoreBadge) {
            scoreBadge.innerText = `${msg.score} แต้ม`;
            scoreBadge.className = `score-badge ${msg.score < 0 ? 'minus' : ''}`;
        }
        
        // Re-inject Busted Button and word
        const word = decodeWord(msg.word);
        const wDisplay = document.getElementById(`word-display-${msg.targetToken}`);
        
        if (msg.targetToken === myToken) {
            // Update my secret word
            myWord = word;
            document.getElementById("forehead-my-word").innerText = myWord;
        } else {
            wDisplay.innerText = word;
            wDisplay.style.textDecoration = "";
            wDisplay.style.color = "";
            
            // Re-add button
            let btn = card.querySelector(".btn-busted");
            if (!btn) {
                btn = document.createElement("button");
                btn.className = "btn-busted";
                btn.innerText = "🚨 จับได้แล้ว!";
                btn.onclick = () => reportBusted(msg.targetToken, msg.targetName);
                card.appendChild(btn);
            }
        }
        
        // Flash glow animation
        card.style.borderColor = "var(--success-color)";
        card.style.boxShadow = "0 0 15px var(--success-glow)";
        setTimeout(() => {
            card.style.borderColor = "";
            card.style.boxShadow = "";
        }, 1000);
    }
    
    const logContainer = document.getElementById("game-events-feed");
    if (logContainer) {
        const item = document.createElement("div");
        item.className = "event-item event-system";
        item.innerText = `ระบบสุ่มคำใบ้ใหม่ให้ ${msg.targetName} เรียบร้อยแล้ว`;
        logContainer.prepend(item);
    }
}

// 9. TIMERcountdown ENGINE
function startLocalTimer(timerEnd, duration) {
    if (localTimerInterval) clearInterval(localTimerInterval);
    const displayElement = document.getElementById("game-timer");
    
    function updateTimer() {
        const now = Date.now() / 1000;
        const remaining = Math.max(0, Math.floor(timerEnd - now));
        
        const min = String(Math.floor(remaining / 60)).padStart(2, '0');
        const sec = String(remaining % 60).padStart(2, '0');
        
        displayElement.innerText = `${min}:${sec}`;
        
        // Progress ring logic
        const circle = document.querySelector(".timer-ring__circle");
        if (circle) {
            const circumference = 2 * Math.PI * 21; // r=21
            const percent = remaining / duration;
            const offset = circumference - (percent * circumference);
            circle.style.strokeDashoffset = offset;
            
            if (percent < 0.2) {
                circle.style.stroke = "#ef4444";
            } else if (percent < 0.5) {
                circle.style.stroke = "#f59e0b";
            } else {
                circle.style.stroke = "#f43f5e";
            }
        }
        
        if (remaining <= 0) {
            clearInterval(localTimerInterval);
            displayElement.innerText = "หมดเวลา!";
            
            if (userRole === 'OWNER') {
                requestStopGame();
            }
        }
    }
    
    updateTimer();
    localTimerInterval = setInterval(updateTimer, 1000);
}

// 10. FOREHEAD MODE OVERLAY
function toggleForeheadMode(active) {
    playSynthSound('click');
    const overlay = document.getElementById("forehead-mode-overlay");
    if (!overlay) return;
    
    if (active) {
        if (gameState !== 'PLAYING') return;
        
        document.getElementById("forehead-my-name").innerText = myName;
        document.getElementById("forehead-my-word").innerText = myWord;
        overlay.classList.add("active");
    } else {
        overlay.classList.remove("active");
    }
}

// 11. END GAME & REVEAL SCOREBOARD
function requestStopGame() {
    if (userRole !== 'OWNER') return;
    
    // Sort players list for reveal scoreboard
    let scoreboard = Object.keys(players).map(token => ({
        name: players[token].name,
        word: players[token].word,
        score: players[token].score,
        eliminated: players[token].eliminated
    }));
    
    // Sort logic
    if (gameMode === 'survival') {
        // Survivors first, then higher scores
        scoreboard.sort((a, b) => {
            if (a.eliminated !== b.eliminated) {
                return a.eliminated ? 1 : -1;
            }
            return b.score - a.score;
        });
    } else {
        // Higher scores first
        scoreboard.sort((a, b) => b.score - a.score);
    }
    
    publishMessage({
        type: "STOP",
        scoreboard: scoreboard,
        gameMode: gameMode
    });
}

function showRevealPanel(scoreboard, mode) {
    if (localTimerInterval) clearInterval(localTimerInterval);
    playSynthSound('win');
    
    gameState = 'ENDED';
    toggleForeheadMode(false); // turn off forehead mode if on
    
    const panel = document.getElementById("post-game-reveal-panel");
    const listContainer = document.getElementById("reveal-scoreboard-list");
    const modeLabel = document.getElementById("reveal-mode-label");
    
    if (!panel || !listContainer) return;
    
    modeLabel.innerText = mode === 'survival' ? 'โหมด: เอาชีวิตรอด 💀' : 'โหมด: เก็บคะแนน 🏆';
    listContainer.innerHTML = "";
    
    scoreboard.forEach((p, index) => {
        const div = document.createElement("div");
        div.className = `reveal-card ${index === 0 && (!p.eliminated || mode !== 'survival') ? 'highlight' : ''}`;
        
        // Rank medal/label
        let rank = `#${index + 1}`;
        if (index === 0 && (!p.eliminated || mode !== 'survival')) rank = "🥇 ชนะเลิศ";
        else if (index === 1) rank = "🥈 รองชนะเลิศ";
        
        div.innerHTML = `
            <div>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:bold; display:block;">${rank}</span>
                <span class="reveal-player">${p.name} ${p.eliminated ? '💀' : '💖'}</span>
            </div>
            <div style="text-align:right;">
                <span class="reveal-word">${p.word}</span>
                <span class="reveal-score" style="display:block;">${p.score} แต้ม</span>
            </div>
        `;
        listContainer.appendChild(div);
    });
    
    panel.style.display = "block";
    
    // Scroll down to see results
    setTimeout(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
}

// 12. UTILS
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(scr => scr.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");
}

function toggleWelcomeRules() {
    playSynthSound('click');
    const rules = document.getElementById("rules-content");
    const icon = document.getElementById("rules-toggle-icon");
    if (!rules || !icon) return;
    
    if (rules.style.display === "none") {
        rules.style.display = "block";
        icon.innerText = "▲";
    } else {
        rules.style.display = "none";
        icon.innerText = "▼";
    }
}

// Custom alert modal
function showAlert(title, msg) {
    document.getElementById("alert-title").innerText = title;
    document.getElementById("alert-message").innerText = msg;
    document.getElementById("alert-modal").style.display = "flex";
}

function closeAlert() {
    playSynthSound('click');
    document.getElementById("alert-modal").style.display = "none";
}
