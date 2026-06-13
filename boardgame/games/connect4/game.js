// Standalone Connect Four Game Logic with Integrated Web Audio Synthesizer

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

class Connect4Game {
    constructor() {
        this.container = null;
        this.rows = 6;
        this.cols = 7;
        this.board = [];
        this.currentPlayer = 1; // 1: Red, 2: Yellow
        this.gameMode = 'pvp'; // pvp or pve
        this.aiDifficulty = 'medium'; // easy, medium, hard
        this.gameActive = true;
    }

    init(container) {
        this.container = container;
        this.reset();
    }

    reset() {
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.currentPlayer = 1;
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
        boardElem.className = 'connect4-board';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'connect4-cell';
                cell.dataset.col = c;
                
                const val = this.board[r][c];
                if (val !== 0) {
                    const piece = document.createElement('div');
                    piece.className = 'connect4-piece ' + (val === 1 ? 'red-piece' : 'yellow-piece');
                    cell.appendChild(piece);
                }

                cell.addEventListener('click', () => this.handleColumnClick(c));
                boardElem.appendChild(cell);
            }
        }

        this.container.appendChild(boardElem);
    }

    handleColumnClick(col) {
        if (!this.gameActive) return;
        if (this.gameMode === 'pve' && this.currentPlayer === 2) return;

        const row = this.getAvailableRow(col);
        if (row === -1) return;

        this.makeMove(col, row);

        if (this.gameActive && this.gameMode === 'pve' && this.currentPlayer === 2) {
            this.sendStatusUpdate();
            setTimeout(() => this.makeAIMove(), 700);
        }
    }

    getAvailableRow(col) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === 0) {
                return r;
            }
        }
        return -1;
    }

    makeMove(col, row) {
        this.board[row][col] = this.currentPlayer;
        audio.playPlace();
        this.renderBoard();

        if (this.checkWin(row, col, this.currentPlayer)) {
            this.gameActive = false;
            const winnerName = this.currentPlayer === 1 ? 'ผู้เล่น 1 (สีแดง)' : (this.gameMode === 'pve' ? 'AI (สีเหลือง)' : 'ผู้เล่น 2 (สีเหลือง)');
            
            let resultType = 'win';
            if (this.gameMode === 'pve' && this.currentPlayer === 2) {
                resultType = 'lose';
            }

            showResult({
                type: resultType,
                title: `${winnerName} ชนะ! 🥳`,
                text: `ต่อเรียงกันครบ 4 เหรียญเรียบร้อย! เป็นการวางหมากที่เฉียบคมมาก`
            });
            return;
        }

        if (this.checkDraw()) {
            this.gameActive = false;
            showResult({
                type: 'draw',
                title: 'เสมอทัดเทียม! 🤝',
                text: 'กระดานเต็มแล้ว แต่ไม่มีใครเรียงได้ครบ 4 ชิ้น มาสู้กันอีกสักตั้ง!'
            });
            return;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.sendStatusUpdate();
    }

    sendStatusUpdate() {
        const turnText = document.querySelector('.turn-text');
        const turnDot = document.querySelector('.turn-dot');
        
        let playerText = '';
        let dotColor = '';

        if (this.currentPlayer === 1) {
            playerText = 'ตาของ ผู้เล่น 1 (เหรียญแดง)';
            dotColor = 'var(--color-accent)';
        } else {
            playerText = this.gameMode === 'pve' ? 'ตาของ AI (เหรียญเหลือง)... กำลังคิด' : 'ตาของ ผู้เล่น 2 (เหรียญเหลือง)';
            dotColor = 'var(--color-amber)';
        }

        if (turnText) turnText.textContent = playerText;
        if (turnDot) {
            turnDot.style.backgroundColor = dotColor;
            turnDot.style.boxShadow = `0 0 8px ${dotColor}`;
        }
    }

    checkWin(r, c, player) {
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];

        for (const [dr, dc] of directions) {
            let count = 1;

            let row = r + dr;
            let col = c + dc;
            while (row >= 0 && row < this.rows && col >= 0 && col < this.cols && this.board[row][col] === player) {
                count++;
                row += dr;
                col += dc;
            }

            row = r - dr;
            col = c - dc;
            while (row >= 0 && row < this.rows && col >= 0 && col < this.cols && this.board[row][col] === player) {
                count++;
                row -= dr;
                col -= dc;
            }

            if (count >= 4) return true;
        }
        return false;
    }

    checkDraw() {
        return this.board[0].every(cell => cell !== 0);
    }

    makeAIMove() {
        if (!this.gameActive) return;

        let col;
        if (this.aiDifficulty === 'easy') {
            col = this.getRandomColumn();
        } else if (this.aiDifficulty === 'medium') {
            col = this.getMediumMove();
        } else {
            col = this.getBestMove();
        }

        if (col !== null) {
            const row = this.getAvailableRow(col);
            this.makeMove(col, row);
        }
    }

    getRandomColumn() {
        const validCols = [];
        for (let c = 0; c < this.cols; c++) {
            if (this.board[0][c] === 0) validCols.push(c);
        }
        if (validCols.length === 0) return null;
        return validCols[Math.floor(Math.random() * validCols.length)];
    }

    getMediumMove() {
        for (let c = 0; c < this.cols; c++) {
            const r = this.getAvailableRow(c);
            if (r !== -1) {
                if (this.checkWinStateTemp(r, c, 2)) return c;
            }
        }
        for (let c = 0; c < this.cols; c++) {
            const r = this.getAvailableRow(c);
            if (r !== -1) {
                if (this.checkWinStateTemp(r, c, 1)) return c;
            }
        }
        const center = 3;
        if (this.board[0][center] === 0 && Math.random() < 0.7) {
            return center;
        }
        return this.getRandomColumn();
    }

    getBestMove() {
        let bestScore = -Infinity;
        let bestCol = 3;

        const validCols = [];
        for (let c = 0; c < this.cols; c++) {
            if (this.board[0][c] === 0) validCols.push(c);
        }
        validCols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

        for (const col of validCols) {
            const row = this.getAvailableRow(col);
            this.board[row][col] = 2;
            let score = this.minimax(4, -Infinity, Infinity, false);
            this.board[row][col] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }
        return this.board[0][bestCol] === 0 ? bestCol : this.getRandomColumn();
    }

    minimax(depth, alpha, beta, isMaximizing) {
        const scores = this.evaluateBoard();
        if (scores.aiWin) return 1000 + depth;
        if (scores.playerWin) return -1000 - depth;
        if (this.checkDraw()) return 0;
        if (depth === 0) return scores.score;

        const validCols = [];
        for (let c = 0; c < this.cols; c++) {
            if (this.board[0][c] === 0) validCols.push(c);
        }
        validCols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const col of validCols) {
                const row = this.getAvailableRow(col);
                this.board[row][col] = 2;
                let evaluation = this.minimax(depth - 1, alpha, beta, false);
                this.board[row][col] = 0;
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const col of validCols) {
                const row = this.getAvailableRow(col);
                this.board[row][col] = 1;
                let evaluation = this.minimax(depth - 1, alpha, beta, true);
                this.board[row][col] = 0;
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard() {
        let score = 0;
        let aiWin = false;
        let playerWin = false;

        for (let r = 0; r < this.rows; r++) {
            if (this.board[r][3] === 2) score += 3;
            else if (this.board[r][3] === 1) score -= 3;
        }

        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 3; c++) {
                const window = [this.board[r][c], this.board[r][c+1], this.board[r][c+2], this.board[r][c+3]];
                const winEval = this.evaluateWindow(window);
                score += winEval.score;
                if (winEval.aiWin) aiWin = true;
                if (winEval.playerWin) playerWin = true;
            }
        }

        // Vertical
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 3; r++) {
                const window = [this.board[r][c], this.board[r+1][c], this.board[r+2][c], this.board[r+3][c]];
                const winEval = this.evaluateWindow(window);
                score += winEval.score;
                if (winEval.aiWin) aiWin = true;
                if (winEval.playerWin) playerWin = true;
            }
        }

        // Diagonals
        for (let r = 0; r < this.rows - 3; r++) {
            for (let c = 0; c < this.cols - 3; c++) {
                const window = [this.board[r][c], this.board[r+1][c+1], this.board[r+2][c+2], this.board[r+3][c+3]];
                const winEval = this.evaluateWindow(window);
                score += winEval.score;
                if (winEval.aiWin) aiWin = true;
                if (winEval.playerWin) playerWin = true;
            }
        }

        for (let r = 0; r < this.rows - 3; r++) {
            for (let c = 3; c < this.cols; c++) {
                const window = [this.board[r][c], this.board[r+1][c-1], this.board[r+2][c-2], this.board[r+3][c-3]];
                const winEval = this.evaluateWindow(window);
                score += winEval.score;
                if (winEval.aiWin) aiWin = true;
                if (winEval.playerWin) playerWin = true;
            }
        }

        return { score, aiWin, playerWin };
    }

    evaluateWindow(window) {
        let score = 0;
        let ai = 0;
        let player = 0;
        let empty = 0;

        window.forEach(cell => {
            if (cell === 2) ai++;
            else if (cell === 1) player++;
            else empty++;
        });

        if (ai === 4) return { score: 100, aiWin: true, playerWin: false };
        if (player === 4) return { score: -100, aiWin: false, playerWin: true };

        if (ai === 3 && empty === 1) score += 5;
        else if (ai === 2 && empty === 2) score += 2;

        if (player === 3 && empty === 1) score -= 4;
        else if (player === 2 && empty === 2) score -= 1;

        return { score, aiWin: false, playerWin: false };
    }

    checkWinStateTemp(r, c, player) {
        this.board[r][c] = player;
        const won = this.checkWin(r, c, player);
        this.board[r][c] = 0;
        return won;
    }
}

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
    game = new Connect4Game();
    game.init(document.getElementById('gameBoardContainer'));

    document.getElementById('resetGameBtn').addEventListener('click', () => {
        audio.playClick();
        game.reset();
    });

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

    document.getElementById('aiDiffSelect').addEventListener('change', (e) => {
        audio.playClick();
        game.setAIDifficulty(e.target.value);
    });

    document.getElementById('resultResetBtn').addEventListener('click', () => {
        audio.playClick();
        document.getElementById('resultModal').classList.add('hidden');
        game.reset();
    });
});
