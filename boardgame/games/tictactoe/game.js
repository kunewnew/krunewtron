// Standalone Tic-Tac-Toe Game Logic with Integrated Web Audio Synthesizer

// Sound effects synth
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

    playDraw() {
        if (!this.enabled) return;
        this.init();
        this.playTone(300, 'square', 0.25, 0.1);
        setTimeout(() => {
            this.playTone(300, 'square', 0.25, 0.1);
        }, 150);
    }
}

const audio = new AudioSynth();

class TicTacToeGame {
    constructor() {
        this.container = null;
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameMode = 'pvp'; // pvp or pve
        this.aiDifficulty = 'medium'; // easy, medium, hard
        this.gameActive = true;
    }

    init(container) {
        this.container = container;
        this.reset();
    }

    reset() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.renderBoard();
        this.sendStatusUpdate();
    }

    setMode(mode) {
        this.gameMode = mode;
        this.reset();
    }

    setAIDifficulty(diff) {
        this.aiDifficulty = diff;
    }

    renderBoard() {
        this.container.innerHTML = '';
        const boardElem = document.createElement('div');
        boardElem.className = 'tictactoe-board';

        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'tictactoe-cell';
            cell.dataset.index = i;
            
            if (this.board[i] === 'X') {
                cell.textContent = 'X';
                cell.classList.add('x-piece');
            } else if (this.board[i] === 'O') {
                cell.textContent = 'O';
                cell.classList.add('o-piece');
            }

            cell.addEventListener('click', () => this.handleCellClick(i));
            boardElem.appendChild(cell);
        }

        this.container.appendChild(boardElem);
    }

    handleCellClick(index) {
        if (!this.gameActive || this.board[index] !== null) return;
        if (this.gameMode === 'pve' && this.currentPlayer === 'O') return;

        this.makeMove(index);

        if (this.gameActive && this.gameMode === 'pve' && this.currentPlayer === 'O') {
            this.sendStatusUpdate();
            setTimeout(() => this.makeAIMove(), 600);
        }
    }

    makeMove(index) {
        this.board[index] = this.currentPlayer;
        audio.playPlace();
        this.renderBoard();

        if (this.checkWin()) {
            this.gameActive = false;
            const winnerText = this.currentPlayer === 'X' ? 'ผู้เล่น 1 (X)' : (this.gameMode === 'pve' ? 'AI (O)' : 'ผู้เล่น 2 (O)');
            
            let resultType = 'win';
            if (this.gameMode === 'pve' && this.currentPlayer === 'O') {
                resultType = 'lose';
            }

            showResult({
                type: resultType,
                title: `${winnerText} ชนะ! 🎉`,
                text: `ยินดีด้วยกับชัยชนะในรอบนี้! คุณวางแผนได้อย่างดีเยี่ยม`
            });
            return;
        }

        if (this.checkDraw()) {
            this.gameActive = false;
            showResult({
                type: 'draw',
                title: 'เสมอกัน! 🤝',
                text: 'การประลองไหวพริบนี้คู่คี่สูสีมาก ลองแข่งอีกรอบไหม?'
            });
            return;
        }

        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.sendStatusUpdate();
    }

    sendStatusUpdate() {
        const turnText = document.querySelector('.turn-text');
        const turnDot = document.querySelector('.turn-dot');
        
        let playerText = '';
        let dotColor = '';

        if (this.currentPlayer === 'X') {
            playerText = 'ตาของ ผู้เล่น 1 (X)';
            dotColor = 'var(--color-primary)';
        } else {
            playerText = this.gameMode === 'pve' ? 'ตาของ AI (O)... กำลังคิด' : 'ตาของ ผู้เล่น 2 (O)';
            dotColor = 'var(--color-accent)';
        }

        if (turnText) turnText.textContent = playerText;
        if (turnDot) {
            turnDot.style.backgroundColor = dotColor;
            turnDot.style.boxShadow = `0 0 8px ${dotColor}`;
        }
    }

    checkWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        return winPatterns.some(pattern => {
            const [a, b, c] = pattern;
            return this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c];
        });
    }

    checkDraw() {
        return this.board.every(cell => cell !== null);
    }

    makeAIMove() {
        if (!this.gameActive) return;

        let moveIndex;
        if (this.aiDifficulty === 'easy') {
            moveIndex = this.getRandomMove();
        } else if (this.aiDifficulty === 'medium') {
            moveIndex = Math.random() < 0.6 ? this.getBestMove() : this.getRandomMove();
        } else {
            moveIndex = this.getBestMove();
        }

        if (moveIndex !== null) {
            this.makeMove(moveIndex);
        }
    }

    getRandomMove() {
        const available = this.board.map((cell, idx) => cell === null ? idx : null).filter(val => val !== null);
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    getBestMove() {
        let bestScore = -Infinity;
        let move = null;

        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                this.board[i] = 'O';
                let score = this.minimax(this.board, 0, false);
                this.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move !== null ? move : this.getRandomMove();
    }

    minimax(board, depth, isMaximizing) {
        if (this.checkWinState(board, 'O')) return 10 - depth;
        if (this.checkWinState(board, 'X')) return depth - 10;
        if (board.every(cell => cell !== null)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    checkWinState(board, player) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return winPatterns.some(pattern => {
            const [a, b, c] = pattern;
            return board[a] === player && board[b] === player && board[c] === player;
        });
    }
}

// Global UI management
let game = null;

function showResult(result) {
    if (result.type === 'win') {
        audio.playWin();
        document.getElementById('resultIcon').className = "result-icon-wrapper win";
        document.getElementById('resultIcon').innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
        `;
    } else if (result.type === 'lose') {
        audio.playLose();
        document.getElementById('resultIcon').className = "result-icon-wrapper lose";
        document.getElementById('resultIcon').innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    } else {
        audio.playDraw();
        document.getElementById('resultIcon').className = "result-icon-wrapper";
        document.getElementById('resultIcon').innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
        `;
    }

    document.getElementById('resultTitle').textContent = result.title;
    document.getElementById('resultText').textContent = result.text;
    document.getElementById('resultModal').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    game = new TicTacToeGame();
    game.init(document.getElementById('gameBoardContainer'));

    // Reset button
    document.getElementById('resetGameBtn').addEventListener('click', () => {
        audio.playClick();
        game.reset();
    });

    // PvP / PvE toggles
    const btnPvP = document.getElementById('btnPvP');
    const btnPvE = document.getElementById('btnPvE');
    const aiConfig = document.getElementById('aiDifficultyConfig');

    btnPvP.addEventListener('click', () => {
        if (!btnPvP.classList.contains('active')) {
            audio.playClick();
            btnPvP.classList.add('active');
            btnPvE.classList.remove('active');
            aiConfig.classList.add('hidden');
            game.setMode('pvp');
        }
    });

    btnPvE.addEventListener('click', () => {
        if (!btnPvE.classList.contains('active')) {
            audio.playClick();
            btnPvE.classList.add('active');
            btnPvP.classList.remove('active');
            aiConfig.classList.remove('hidden');
            game.setMode('pve');
        }
    });

    // AI Difficulty select
    document.getElementById('aiDiffSelect').addEventListener('change', (e) => {
        audio.playClick();
        game.setAIDifficulty(e.target.value);
    });

    // Result modal buttons
    document.getElementById('resultResetBtn').addEventListener('click', () => {
        audio.playClick();
        document.getElementById('resultModal').classList.add('hidden');
        game.reset();
    });
});
