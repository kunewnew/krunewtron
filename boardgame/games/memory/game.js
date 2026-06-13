// Standalone Memory Card Match Game Logic with Integrated Web Audio Synthesizer

class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
            this.enabled = false;
        }
    }

    playTone(frequency, type, duration, volume, slideTo = 0) {
        if (!this.enabled) return;
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        if (slideTo > 0) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playClick() {
        this.playTone(800, 'sine', 0.08, 0.2, 300);
    }

    playPlace() {
        this.playTone(400, 'triangle', 0.15, 0.3, 150);
    }

    playFlip() {
        this.playTone(300, 'sine', 0.2, 0.25, 600);
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 0.3, 0.25, freq * 1.5);
            }, index * 100);
        });
    }

    playLose() {
        if (!this.enabled) return;
        this.init();
        const notes = [392.00, 349.23, 311.13, 246.94]; // G4, F4, Eb4, B3
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.4, 0.15, freq * 0.5);
            }, index * 150);
        });
    }
}

const audio = new AudioSynth();

class MemoryMatchGame {
    constructor() {
        this.container = null;
        this.icons = ['🎲', '♟️', '🧩', '🃏', '🎯', '🏆', '🎨', '📚'];
        this.cards = [];
        this.flippedCards = [];
        this.matchedCount = 0;
        this.moves = 0;
        this.gameActive = true;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
    }

    init(container) {
        this.container = container;
        this.reset();
    }

    reset() {
        this.stopTimer();
        this.matchedCount = 0;
        this.moves = 0;
        this.elapsedSeconds = 0;
        this.flippedCards = [];
        this.gameActive = true;
        
        const cardValues = [...this.icons, ...this.icons];
        this.shuffle(cardValues);
        
        this.cards = cardValues.map((val, idx) => ({
            id: idx,
            val: val,
            flipped: false,
            matched: false
        }));

        this.renderBoard();
        this.startTimer();
        this.sendStatusUpdate();
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            if (this.gameActive) {
                this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
                this.sendStatusUpdate();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    renderBoard() {
        this.container.innerHTML = '';
        const boardElem = document.createElement('div');
        boardElem.className = 'memory-board';

        this.cards.forEach(card => {
            const cardContainer = document.createElement('div');
            cardContainer.className = 'memory-card-container';
            cardContainer.dataset.id = card.id;

            if (card.flipped || card.matched) {
                cardContainer.classList.add('flipped');
            }
            if (card.matched) {
                cardContainer.classList.add('matched');
            }

            const memoryCard = document.createElement('div');
            memoryCard.className = 'memory-card';

            const cardBack = document.createElement('div');
            cardBack.className = 'memory-card-face memory-card-back';
            cardBack.textContent = '?';

            const cardFront = document.createElement('div');
            cardFront.className = 'memory-card-face memory-card-front';
            
            const iconSpan = document.createElement('span');
            iconSpan.className = 'memory-card-icon';
            iconSpan.textContent = card.val;
            
            cardFront.appendChild(iconSpan);
            memoryCard.appendChild(cardBack);
            memoryCard.appendChild(cardFront);
            cardContainer.appendChild(memoryCard);

            cardContainer.addEventListener('click', () => this.handleCardClick(card.id));
            boardElem.appendChild(cardContainer);
        });

        this.container.appendChild(boardElem);
    }

    handleCardClick(cardId) {
        if (!this.gameActive) return;
        
        const card = this.cards.find(c => c.id === cardId);
        if (!card || card.flipped || card.matched || this.flippedCards.length >= 2) return;

        card.flipped = true;
        this.flippedCards.push(card);
        audio.playFlip();
        this.renderBoard();

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.sendStatusUpdate();
            this.checkMatch();
        }
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;

        if (card1.val === card2.val) {
            card1.matched = true;
            card2.matched = true;
            this.matchedCount++;
            this.flippedCards = [];
            
            setTimeout(() => {
                audio.playPlace();
                this.renderBoard();
                if (this.matchedCount === this.icons.length) {
                    this.endGame();
                }
            }, 300);
        } else {
            setTimeout(() => {
                card1.flipped = false;
                card2.flipped = false;
                this.flippedCards = [];
                this.renderBoard();
            }, 1000);
        }
    }

    endGame() {
        this.gameActive = false;
        this.stopTimer();

        const timeBonus = Math.max(0, 300 - this.elapsedSeconds);
        const movePenalty = this.moves * 5;
        const finalScore = Math.max(10, 1000 + timeBonus - movePenalty);

        showResult({
            type: 'win',
            title: 'ยินดีด้วย จับคู่ครบแล้ว! 🏆',
            text: `คุณจับคู่ทั้งหมดสำเร็จด้วยความรวดเร็ว! \nใช้จำนวนย้าย: ${this.moves} ครั้ง | เวลา: ${this.formatTime(this.elapsedSeconds)} | คะแนน: ${finalScore} คะแนน`
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    sendStatusUpdate() {
        const turnText = document.querySelector('.turn-text');
        const countMoves = document.getElementById('countMoves');
        const countMatches = document.getElementById('countMatches');

        if (turnText) turnText.textContent = `เวลา: ${this.formatTime(this.elapsedSeconds)}`;
        if (countMoves) countMoves.textContent = `${this.moves} ครั้ง`;
        if (countMatches) countMatches.textContent = `${this.matchedCount} / ${this.icons.length} คู่`;
    }
}

let game = null;

function showResult(result) {
    audio.playWin();
    document.getElementById('resultIcon').className = "result-icon-wrapper win";
    document.getElementById('resultIcon').innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
    `;
    
    document.getElementById('resultTitle').textContent = result.title;
    document.getElementById('resultText').textContent = result.text;
    document.getElementById('resultModal').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    game = new MemoryMatchGame();
    game.init(document.getElementById('gameBoardContainer'));

    document.getElementById('resetGameBtn').addEventListener('click', () => {
        audio.playClick();
        game.reset();
    });

    document.getElementById('resultResetBtn').addEventListener('click', () => {
        audio.playClick();
        document.getElementById('resultModal').classList.add('hidden');
        game.reset();
    });
});
