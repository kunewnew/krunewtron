// Serverless Multiplayer Client for Spy Agent using MQTT

let roomCode = null;
let myName = null;
let myToken = null; // Generated locally to identify client
let mySecretKey = null; // Private key for XOR encryption
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
let players = {}; // For OWNER: token -> { name, lastActive, key }
let playersList = []; // For MEMBER: array of player names
let gameDuration = 480; // default 8 minutes
let spiesCount = 1;
let activeLocations = [];

// Game loops and intervals
let lobbyHeartbeatInterval = null;
let localTimerInterval = null;
let consecutiveErrors = 0;

// Encryption helpers
function encryptXOR(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(unescape(encodeURIComponent(result))); // Safe unicode base64 encoding
}

function decryptXOR(encodedText, key) {
    try {
        let text = decodeURIComponent(escape(atob(encodedText)));
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch (e) {
        return null;
    }
}

// 1. BOOTSTRAP INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    // Populate locations list checkboxes at start
    allLocations = window.LOCATIONS.map(loc => loc.name);
    activeLocations = [...allLocations];
    renderSettingsLocationsList();

    // Check if running on file protocol
    if (window.location.protocol === 'file:') {
        document.getElementById("protocol-warning").style.display = "block";
        const btnJoin = document.getElementById("btn-join-room");
        const btnCreate = document.getElementById("btn-create-room");
        if (btnJoin) {
            btnJoin.disabled = true;
            btnJoin.style.opacity = "0.5";
        }
        if (btnCreate) {
            btnCreate.disabled = true;
            btnCreate.style.opacity = "0.5";
        }
        return; // Skip setup
    }

    // Support Enter keys on inputs
    document.getElementById("input-player-name").addEventListener("keypress", (e) => {
        if (e.key === "Enter") document.getElementById("input-room-code").focus();
    });
    document.getElementById("input-room-code").addEventListener("keypress", (e) => {
        if (e.key === "Enter") joinRoom();
    });

    // Generate locally unique token & private key
    myToken = "token_" + Math.random().toString(36).substring(2, 15);
    mySecretKey = "key_" + Math.random().toString(36).substring(2, 12);
});

// Render the 100 locations list checkbox in the lobby settings pane
function renderSettingsLocationsList() {
    const listContainer = document.getElementById("lobby-locations-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    window.LOCATIONS.forEach((loc) => {
        const label = document.createElement("label");
        label.className = `loc-checkbox-label ${activeLocations.includes(loc.name) ? 'active' : ''}`;
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = loc.name;
        checkbox.checked = activeLocations.includes(loc.name);
        
        checkbox.addEventListener("change", (e) => {
            if (userRole !== 'OWNER') {
                e.target.checked = !e.target.checked; // Disable changing for members
                return;
            }
            if (e.target.checked) {
                if (!activeLocations.includes(loc.name)) activeLocations.push(loc.name);
            } else {
                activeLocations = activeLocations.filter(item => item !== loc.name);
            }
            label.classList.toggle('active', e.target.checked);
            document.getElementById("selected-locs-count").innerText = activeLocations.length;
            broadcastSettings();
        });
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(loc.name.split(" (")[0])); // Show only Thai name in checkbox list to save space
        listContainer.appendChild(label);
    });
    
    document.getElementById("selected-locs-count").innerText = activeLocations.length;
}

function toggleAllLocations(select) {
    if (userRole !== 'OWNER') return;
    activeLocations = select ? [...allLocations] : [];
    document.querySelectorAll("#lobby-locations-list input").forEach(cb => {
        cb.checked = select;
        cb.parentElement.classList.toggle('active', select);
    });
    document.getElementById("selected-locs-count").innerText = activeLocations.length;
    broadcastSettings();
}

function updateDurationLabel(val) {
    document.getElementById("lbl-duration").innerText = `${val} นาที`;
    gameDuration = val * 60;
}

function onSettingChanged() {
    if (userRole !== 'OWNER') return;
    spiesCount = parseInt(document.getElementById("select-spies").value);
    broadcastSettings();
}

// 2. MQTT CONNECTION & MANAGEMENT
function connectMQTT(onSuccess, onFailure) {
    const broker = BROKERS[currentBrokerIndex];
    console.log(`Connecting to MQTT broker: ${broker.host}:${broker.port}`);
    
    const client = new Paho.MQTT.Client(broker.host, broker.port, "spy_" + Math.random().toString(36).substring(2, 12));
    
    client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
            console.error("Connection lost:", responseObject.errorMessage);
            // Trigger automatic retry/reconnect
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
            console.error("Failed to parse message payload:", e);
        }
    };
    
    const options = {
        useSSL: true,
        onSuccess: () => {
            console.log("Connected successfully to " + broker.host);
            mqttClient = client;
            onSuccess(client);
        },
        onFailure: (err) => {
            console.error("Broker connection failed, trying fallback:", err);
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
    const topic = `spygame_lobby/rooms/v1/${roomCode}`;
    const message = new Paho.MQTT.Message(JSON.stringify(payload));
    message.destinationName = topic;
    message.qos = 0;
    mqttClient.send(message);
}

// 3. ACTION HANDLERS
async function createRoom() {
    const nameInput = document.getElementById("input-player-name").value.trim();
    if (!nameInput) {
        showAlert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อของคุณ");
        return;
    }
    
    // Generate unique 4-character Room Code
    roomCode = randomChoices("BCDFGHJKLMNPQRSTVWXYZ", 4).join("");
    myName = nameInput;
    userRole = 'OWNER';
    gameState = 'LOBBY';
    
    document.getElementById("lobby-code").innerText = roomCode;
    document.getElementById("lobby-owner-info").style.display = "block";
    document.getElementById("lobby-player-info").style.display = "none";
    document.getElementById("btn-start-game").style.display = "block";
    document.getElementById("locs-select-controls").style.display = "inline";
    
    // Enable settings controls for Room Owner
    enableSettingsInputs(true);
    
    // Initialize players list with Owner
    players = {};
    players[myToken] = {
        name: myName,
        lastActive: Date.now(),
        key: mySecretKey
    };
    
    // Show Screen
    showScreen("screen-lobby");
    renderSettingsLocationsList();
    updateLobbyPlayersUI();

    // Connect to MQTT Broker
    connectMQTT((client) => {
        client.subscribe(`spygame_lobby/rooms/v1/${roomCode}`);
        
        // Owner heartbeat/state loop: publish room status every 2 seconds
        if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
        lobbyHeartbeatInterval = setInterval(() => {
            // Clean up players that haven't sent heartbeat for 6 seconds
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
        showAlert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อระบบแชร์บอร์ดได้: " + err.errorMessage);
        leaveRoom();
    });
}

async function joinRoom() {
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
    document.getElementById("locs-select-controls").style.display = "none";
    
    // Disable settings controls for normal players (view only)
    enableSettingsInputs(false);
    
    // Show Screen
    showScreen("screen-lobby");
    
    // Connect to MQTT Broker
    connectMQTT((client) => {
        client.subscribe(`spygame_lobby/rooms/v1/${roomCode}`);
        
        // Immediately publish a JOIN request
        publishMessage({
            type: "JOIN",
            sender: myName,
            token: myToken,
            key: mySecretKey
        });
        
        // Start sending periodic heartbeats to the room owner
        if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
        lobbyHeartbeatInterval = setInterval(() => {
            publishMessage({
                type: "HEARTBEAT",
                sender: myName,
                token: myToken
            });
        }, 2000);
        
    }, (err) => {
        showAlert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อระบบแชร์บอร์ดได้: " + err.errorMessage);
        leaveRoom();
    });
}

// Helper: Enable/Disable settings widgets
function enableSettingsInputs(enable) {
    document.getElementById("select-spies").disabled = !enable;
    document.getElementById("range-duration").disabled = !enable;
}

// 4. MQTT STATE BROADCASTS (OWNER ONLY)
function broadcastState() {
    if (userRole !== 'OWNER' || gameState !== 'LOBBY') return;
    
    publishMessage({
        type: "LOBBY_STATE",
        players: Object.values(players).map(p => p.name),
        settings: {
            duration: gameDuration,
            spies_count: spiesCount,
            locations: activeLocations
        }
    });
}

function broadcastSettings() {
    if (userRole !== 'OWNER') return;
    broadcastState();
}

// 5. INCOMING MESSAGE ROUTER
function handleIncomingMessage(msg) {
    // Ignore message if it is not related to this game
    if (!msg || !msg.type) return;
    
    // ================= OWNER MESSAGE HANDLERS =================
    if (userRole === 'OWNER') {
        if (msg.type === "JOIN") {
            console.log(`Player ${msg.sender} joined with key`);
            players[msg.token] = {
                name: msg.sender,
                lastActive: Date.now(),
                key: msg.key
            };
            updateLobbyPlayersUI();
            broadcastState(); // Instant update
        }
        else if (msg.type === "HEARTBEAT") {
            if (players[msg.token]) {
                players[msg.token].lastActive = Date.now();
            } else {
                // If player is sending heartbeat but owner doesn't have them (e.g. owner restarted), trigger join request
                publishMessage({ type: "REQUEST_REJOIN" });
            }
        }
    }
    
    // ================= MEMBER MESSAGE HANDLERS =================
    if (userRole === 'MEMBER') {
        if (msg.type === "LOBBY_STATE") {
            // Update lobby UI
            playersList = msg.players;
            updateLobbyPlayersUI();
            
            // Sync settings
            gameDuration = msg.settings.duration;
            spiesCount = msg.settings.spies_count;
            activeLocations = msg.settings.locations;
            
            // Sync UI widgets
            document.getElementById("select-spies").value = spiesCount;
            document.getElementById("range-duration").value = gameDuration / 60;
            document.getElementById("lbl-duration").innerText = `${gameDuration / 60} นาที`;
            
            // Re-render locations list to match owner's selections
            updateMemberLocationsCheckboxes();
        }
        else if (msg.type === "REQUEST_REJOIN") {
            // Re-send join credentials if owner lost state
            publishMessage({
                type: "JOIN",
                sender: myName,
                token: myToken,
                key: mySecretKey
            });
        }
    }

    // ================= SHARED MESSAGE HANDLERS =================
    if (msg.type === "START") {
        if (gameState !== 'PLAYING') {
            gameState = 'PLAYING';
            setupGameScreen(msg);
        }
    }
    else if (msg.type === "STOP") {
        if (gameState === 'PLAYING') {
            gameState = 'ENDED';
            showRevealPanel(msg.reveal);
        }
    }
}

// 6. UI SYNCHRONIZERS
function updateLobbyPlayersUI() {
    const listContainer = document.getElementById("lobby-players-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    const list = userRole === 'OWNER' ? Object.values(players).map(p => p.name) : playersList;
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
        }
        listContainer.appendChild(li);
    });
}

function updateMemberLocationsCheckboxes() {
    // For members: Recheck list checkboxes to match owner settings and make them read-only
    document.querySelectorAll("#lobby-locations-list input").forEach(cb => {
        const val = cb.value;
        const active = activeLocations.includes(val);
        cb.checked = active;
        cb.parentElement.classList.toggle('active', active);
    });
    document.getElementById("selected-locs-count").innerText = activeLocations.length;
}

// 7. GAME PLAY FUNCTIONS
function startGame() {
    if (userRole !== 'OWNER') return;
    
    const list = Object.values(players);
    if (list.length < 3) {
        showAlert("เริ่มเกมไม่ได้", "ต้องการผู้เล่นอย่างน้อย 3 คนในการสุ่มบทบาท");
        return;
    }
    
    if (spiesCount >= list.length) {
        showAlert("เริ่มเกมไม่ได้", "จำนวนสายลับต้องน้อยกว่าจำนวนผู้เล่นทั้งหมด");
        return;
    }

    if (activeLocations.length < 2) {
        showAlert("เริ่มเกมไม่ได้", "ต้องเปิดสถานที่ลับอย่างน้อย 2 แห่งในเกม");
        return;
    }
    
    // Select a random location from checked locations
    const locName = activeLocations[Math.floor(Math.random() * activeLocations.length)];
    const locationObj = window.LOCATIONS.find(loc => loc.name === locName);
    
    // Shuffle players
    let shuffled = [...list];
    shuffleArray(shuffled);
    
    // Select Spies
    const spies = shuffled.slice(0, spiesCount);
    const nonSpies = shuffled.slice(spiesCount);
    
    // Shuffle role cards
    let shuffledRoles = [...locationObj.roles];
    shuffleArray(shuffledRoles);
    
    // Assign roles & Encrypt payloads individually
    let encryptedData = {};
    let rawRevealRoles = [];
    
    // Encrypt for Spies
    spies.forEach(p => {
        const payload = JSON.stringify({
            location: null,
            role: "SPY"
        });
        encryptedData[p.name] = encryptXOR(payload, p.key);
        rawRevealRoles.push({ name: p.name, role: "SPY 🚨" });
    });
    
    // Encrypt for Normal Players
    nonSpies.forEach((p, idx) => {
        // Recycle roles if we have more players than roles in database
        const role = shuffledRoles[idx % shuffledRoles.length];
        const payload = JSON.stringify({
            location: locationObj.name,
            role: role
        });
        encryptedData[p.name] = encryptXOR(payload, p.key);
        rawRevealRoles.push({ name: p.name, role: role });
    });
    
    // Start game state details
    const timerEndTime = (Date.now() / 1000) + gameDuration;
    
    // Publish START payload
    publishMessage({
        type: "START",
        timer_end: timerEndTime,
        duration: gameDuration,
        locations: activeLocations,
        players: list.map(p => p.name),
        encrypted_data: encryptedData,
        // Host locally saves answers for final reveal
        reveal_data: {
            location: locationObj.name,
            spy: spies.map(p => p.name).join(", "),
            roles: rawRevealRoles
        }
    });
}

function setupGameScreen(msg) {
    showScreen("screen-game");
    
    // Clear previous game summary panel
    document.getElementById("post-game-reveal-panel").style.display = "none";
    
    // Owner game controller button
    if (userRole === 'OWNER') {
        document.getElementById("btn-owner-stop-game").style.display = "block";
        // Cache assignments locally on Owner's device
        document.getElementById("btn-owner-stop-game").dataset.revealData = JSON.stringify(msg.reveal_data);
    } else {
        document.getElementById("btn-owner-stop-game").style.display = "none";
    }
    
    // Render game players list
    const playerListContainer = document.getElementById("game-players-grid");
    playerListContainer.innerHTML = "";
    msg.players.forEach(name => {
        const li = document.createElement("li");
        li.innerText = name;
        if (name === myName) {
            li.style.borderColor = "var(--primary-color)";
        }
        playerListContainer.appendChild(li);
    });
    
    // Draw locations grid reference
    const locationsGrid = document.getElementById("game-locations-grid");
    locationsGrid.innerHTML = "";
    
    const sortedLocations = [...msg.locations].sort((a, b) => a.localeCompare(b, 'th'));
    sortedLocations.forEach(loc => {
        const li = document.createElement("li");
        li.innerText = loc.split(" (")[0]; // Short Thai name
        li.className = "active";
        
        // Tap to cross-off locally
        li.addEventListener("click", () => {
            li.style.textDecoration = li.style.textDecoration === "line-through" ? "" : "line-through";
            li.style.opacity = li.style.opacity === "0.3" ? "1" : "0.3";
        });
        
        locationsGrid.appendChild(li);
    });
    
    // Decrypt my secret role
    const myEncryptedPayload = msg.encrypted_data[myName];
    const roleCard = document.getElementById("role-card");
    const normalDisplay = document.getElementById("role-display-normal");
    const spyDisplay = document.getElementById("role-display-spy");
    
    if (myEncryptedPayload) {
        const decryptedStr = decryptXOR(myEncryptedPayload, mySecretKey);
        if (decryptedStr) {
            const data = JSON.parse(decryptedStr);
            if (data.role === 'SPY') {
                normalDisplay.style.display = "none";
                spyDisplay.style.display = "block";
                roleCard.classList.add("spy-card-active");
            } else {
                spyDisplay.style.display = "none";
                normalDisplay.style.display = "block";
                roleCard.classList.remove("spy-card-active");
                
                document.getElementById("display-location").innerText = data.location;
                document.getElementById("display-role").innerText = data.role;
            }
        } else {
            console.error("XOR decryption failed!");
        }
    }
    
    // Run countdown timer
    startLocalTimer(msg.timer_end, msg.duration);
}

// 8. CARD FINGERPRINT HELD INTERACTIONS
function revealRole(e) {
    if (e) e.preventDefault(); // prevents magnifier zoom on iOS Safari touch-hold
    document.getElementById("role-card").classList.add("revealed");
}

function hideRole(e) {
    if (e) e.preventDefault();
    document.getElementById("role-card").classList.remove("revealed");
}

// 9. TIMER ENGINE
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
            const radius = circle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            const percent = remaining / duration;
            const offset = circumference - (percent * circumference);
            circle.style.strokeDashoffset = offset;
            
            if (percent < 0.2) {
                circle.style.stroke = "#ef4444"; // Alarm Red
            } else if (percent < 0.5) {
                circle.style.stroke = "#f59e0b"; // Warning Amber
            } else {
                circle.style.stroke = "#06b6d4"; // Cyan
            }
        }
        
        if (remaining <= 0) {
            clearInterval(localTimerInterval);
            displayElement.innerText = "หมดเวลา!";
            displayElement.classList.add("spy-color");
            
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            
            // Auto stop/reveal when timer hits zero (triggered by Owner)
            if (userRole === 'OWNER') {
                requestStopGame();
            }
        }
    }
    
    updateTimer();
    localTimerInterval = setInterval(updateTimer, 1000);
}

function stopLocalTimer() {
    if (localTimerInterval) {
        clearInterval(localTimerInterval);
        localTimerInterval = null;
    }
}

// 10. GAME OVER & ANSWER REVEALS
function requestStopGame() {
    if (userRole !== 'OWNER') return;
    
    // Retrieve cached reveal details from dataset
    const btn = document.getElementById("btn-owner-stop-game");
    const revealData = JSON.parse(btn.dataset.revealData || "null");
    
    if (revealData) {
        publishMessage({
            type: "STOP",
            reveal: revealData
        });
    }
}

function showRevealPanel(reveal) {
    stopLocalTimer();
    
    // Show reveal panel in Game Screen
    const panel = document.getElementById("post-game-reveal-panel");
    panel.style.display = "block";
    
    document.getElementById("reveal-location").innerText = reveal.location;
    document.getElementById("reveal-spy").innerText = reveal.spy;
    
    // Populate role lists table
    const tbody = document.getElementById("reveal-roles-list");
    tbody.innerHTML = "";
    
    reveal.roles.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        
        const tdName = document.createElement("td");
        tdName.style.padding = "8px 6px";
        tdName.innerText = item.name;
        
        const tdRole = document.createElement("td");
        tdRole.style.padding = "8px 6px";
        if (item.role.includes("SPY")) {
            tdRole.innerHTML = `<span class="spy-color">${item.role}</span>`;
        } else {
            tdRole.innerText = item.role;
        }
        
        tr.appendChild(tdName);
        tr.appendChild(tdRole);
        tbody.appendChild(tr);
    });
    
    // Scroll window down to reveal panel so users notice it
    panel.scrollIntoView({ behavior: 'smooth' });
}

// 11. EXIT / DISCONNECT
function leaveRoom() {
    if (lobbyHeartbeatInterval) clearInterval(lobbyHeartbeatInterval);
    stopLocalTimer();
    
    // If Owner leaves, notify players to exit
    if (userRole === 'OWNER' && roomCode) {
        publishMessage({ type: "STOP", reveal: { location: "ห้องถูกยกเลิกเนื่องจากเจ้าของออกจากห้อง", spy: "-", roles: [] } });
    }
    
    // Clean states
    roomCode = null;
    myName = null;
    userRole = null;
    gameState = 'LOBBY';
    players = {};
    playersList = [];
    
    // Disconnect MQTT
    if (mqttClient) {
        try {
            mqttClient.disconnect();
        } catch (e) {}
        mqttClient = null;
    }
    
    // Reset role card classes
    const roleCard = document.getElementById("role-card");
    roleCard.classList.remove("revealed", "spy-card-active");
    document.getElementById("role-display-spy").style.display = "none";
    document.getElementById("role-display-normal").style.display = "block";
    
    showScreen("screen-welcome");
}

// 12. AUXILIARY HELPERS
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function randomChoices(chars, k) {
    let result = [];
    for (let i = 0; i < k; i++) {
        result.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    }
    return result;
}

// MODAL ALERT WINDOW
function showAlert(title, message) {
    document.getElementById("alert-title").innerText = title;
    document.getElementById("alert-message").innerText = message;
    document.getElementById("alert-modal").style.display = "flex";
}

function closeAlert() {
    document.getElementById("alert-modal").style.display = "none";
}

// 13. WELCOME SCREEN RULES TOGGLE
function toggleWelcomeRules() {
    const content = document.getElementById("rules-content");
    const icon = document.getElementById("rules-toggle-icon");
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        icon.innerText = "▲";
    } else {
        content.style.display = "none";
        icon.innerText = "▼";
    }
}
