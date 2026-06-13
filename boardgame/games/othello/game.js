// Standalone Othello Game Logic with Integrated Web Audio Synthesizer

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

class OthelloGame {
    constructor() {
        this.container = null;
        this.size = 8;
        this.board = Array(8).fill(null).map(() => Array(8).fill(0));
        this.currentPlayer = 1; // 1: Black, 2: White
        this.gameMode = 'pvp'; // pvp or pve
        this.aiDifficulty = 'medium'; // easy, medium, hard
        this.gameActive = true;
        this.validMoves = [];
    }

    init(container) {
        this.container = container;
        this.reset();
    }

    reset() {
        this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.board[3][3] = 2; // White
        this.board[3][4] = 1; // Black
        this.board[4][3] = 1; // Black
        this.board[4][4] = 2; // White
        
        this.currentPlayer = 1;
        this.gameActive = true;
        
        this.calculateValidMoves();
        this.renderBoard();
        this.sendStatusUpdate();
    }

    setMode(mode) {
        this.gameMode = mode;
        
        const label = document.getElementById('scoreWhiteLabel');
        if (label) {
            label.textContent = mode === 'pve' ? 'AI (ขาว):' : 'ผู้เล่น 2 (ขาว):';
        }
        
        this.reset();
    }

    setAIDifficulty(diff) {
        this.aiDifficulty = diff;
    }

    getDirections() {
        return [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
    }

    calculateValidMoves() {
        this.validMoves = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 0 && this.getFlipsForMove(r, c, this.currentPlayer).length > 0) {
                    this.validMoves.push({ r, c });
                }
            }
        }
    }

    getFlipsForMove(row, col, player) {
        const opponent = player === 1 ? 2 : 1;
        const flips = [];

        for (const [dr, dc] of this.getDirections()) {
            let r = row + dr;
            let c = col + dc;
            const tempFlips = [];

            while (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === opponent) {
                tempFlips.push({ r, c });
                r += dr;
                c += dc;
            }

            if (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === player) {
                flips.push(...tempFlips);
            }
        }
        return flips;
    }

    renderBoard() {
        this.container.innerHTML = '';
        const boardElem = document.createElement('div');
        boardElem.className = 'othello-board';

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const cell = document.createElement('div');
                cell.className = 'othello-cell';
                
                const isValid = this.validMoves.some(mv => mv.r === r && mv.c === c);
                const isHumanTurn = !(this.gameMode === 'pve' && this.currentPlayer === 2);
                
                if (isValid && isHumanTurn && this.gameActive) {
                    cell.classList.add('valid-move');
                }

                const val = this.board[r][c];
                if (val !== 0) {
                    const pieceWrapper = document.createElement('div');
                    pieceWrapper.className = 'othello-piece-wrapper';
                    
                    const piece = document.createElement('div');
                    piece.className = 'othello-piece ' + (val === 1 ? 'black' : 'white');

                    const blackFace = document.createElement('div');
                    blackFace.className = 'othello-disc-face black-face';
                    const whiteFace = document.createElement('div');
                    whiteFace.className = 'othello-disc-face white-face';

                    piece.appendChild(blackFace);
                    piece.appendChild(whiteFace);
                    pieceWrapper.appendChild(piece);
                    cell.appendChild(pieceWrapper);
                }

                cell.addEventListener('click', () => this.handleCellClick(r, c));
                boardElem.appendChild(cell);
            }
        }
        this.container.appendChild(boardElem);
    }

    handleCellClick(row, col) {
        if (!this.gameActive) return;
        if (this.gameMode === 'pve' && this.currentPlayer === 2) return;

        const isValid = this.validMoves.some(mv => mv.r === row && mv.c === col);
        if (!isValid) return;

        this.makeMove(row, col);
    }

    makeMove(row, col) {
        const flips = this.getFlipsForMove(row, col, this.currentPlayer);
        if (flips.length === 0) return;

        this.board[row][col] = this.currentPlayer;
        
        audio.playPlace();
        setTimeout(() => audio.playFlip(), 150);

        flips.forEach(pos => {
            this.board[pos.r][pos.c] = this.currentPlayer;
        });

        this.renderBoard();
        this.passOrNextTurn();
    }

    passOrNextTurn() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.calculateValidMoves();

        if (this.validMoves.length === 0) {
            const nextPlayer = this.currentPlayer === 1 ? 2 : 1;
            
            let otherPlayerHasMoves = false;
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.board[r][c] === 0 && this.getFlipsForMove(r, c, nextPlayer).length > 0) {
                        otherPlayerHasMoves = true;
                        break;
                    }
                }
                if (otherPlayerHasMoves) break;
            }

            if (!otherPlayerHasMoves) {
                this.endGame();
                return;
            } else {
                const passedPlayerName = this.currentPlayer === 1 ? 'หมากดำ' : 'หมากขาว';
                this.currentPlayer = nextPlayer;
                this.calculateValidMoves();
                this.renderBoard();
                this.sendStatusUpdate();
                alert(`ไม่มีช่องให้ ${passedPlayerName} วางหมาก! ข้ามตานี้ไปยังฝ่ายตรงข้าม`);
            }
        } else {
            this.renderBoard();
            this.sendStatusUpdate();
        }

        if (this.gameActive && this.gameMode === 'pve' && this.currentPlayer === 2) {
            setTimeout(() => this.makeAIMove(), 800);
        }
    }

    endGame() {
        this.gameActive = false;
        const scores = this.getScores();
        const blackCount = scores.black;
        const whiteCount = scores.white;

        let title = '';
        let resultType = 'win';
        let text = `หมากดำ: ${blackCount} | หมากขาว: ${whiteCount}`;

        if (blackCount > whiteCount) {
            title = 'หมากดำ ชนะ! 🏆';
            if (this.gameMode === 'pve') {
                resultType = 'win';
                text = `คุณชนะ AI! หมากดำ: ${blackCount} | หมากขาว: ${whiteCount}. ยอดเยี่ยมมาก!`;
            }
        } else if (whiteCount > blackCount) {
            title = 'หมากขาว ชนะ! 🏆';
            if (this.gameMode === 'pve') {
                resultType = 'lose';
                text = `AI หมากขาวชนะคุณ! หมากดำ: ${blackCount} | หมากขาว: ${whiteCount}. พยายามอีกครั้งนะครับ!`;
            }
        } else {
            title = 'เสมอกันอย่างสมบูรณ์! 🤝';
            resultType = 'draw';
        }

        showResult({
            type: resultType,
            title,
            text
        });
    }

    getScores() {
        let black = 0;
        let white = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 1) black++;
                if (this.board[r][c] === 2) white++;
            }
        }
        return { black, white };
    }

    sendStatusUpdate() {
        const turnText = document.querySelector('.turn-text');
        const turnDot = document.querySelector('.turn-dot');
        const countBlack = document.getElementById('scoreBlack');
        const countWhite = document.getElementById('scoreWhite');

        let playerText = '';
        let dotColor = '';

        if (this.currentPlayer === 1) {
            playerText = 'ตาของ ผู้เล่น 1 (หมากดำ)';
            dotColor = '#121824';
        } else {
            playerText = this.gameMode === 'pve' ? 'ตาของ AI (หมากขาว)... กำลังคิด' : 'ตาของ ผู้เล่น 2 (หมากขาว)';
            dotColor = '#e2e8f0';
        }

        if (turnText) turnText.textContent = playerText;
        if (turnDot) {
            turnDot.style.backgroundColor = dotColor;
            turnDot.style.boxShadow = `0 0 8px ${dotColor === '#121824' ? 'rgba(0,0,0,0.5)' : '#e2e8f0'}`;
        }

        const scores = this.getScores();
        if (countBlack) countBlack.textContent = scores.black;
        if (countWhite) countWhite.textContent = scores.white;
    }

    makeAIMove() {
        if (!this.gameActive) return;

        let move;
        if (this.aiDifficulty === 'easy') {
            move = this.validMoves[Math.floor(Math.random() * this.validMoves.length)];
        } else if (this.aiDifficulty === 'medium') {
            move = this.getMediumAIMove();
        } else {
            move = this.getHardAIMove();
        }

        if (move) {
            this.makeMove(move.r, move.c);
        }
    }

    getMediumAIMove() {
        let bestMove = null;
        let bestScore = -Infinity;

        const isCorner = (r, c) => (r === 0 || r === 7) && (c === 0 || c === 7);
        const isNearCorner = (r, c) => {
            return (r <= 1 || r >= 6) && (c <= 1 || c >= 6) && !isCorner(r, c);
        };

        for (const mv of this.validMoves) {
            const flips = this.getFlipsForMove(mv.r, mv.c, 2).length;
            let score = flips;

            if (isCorner(mv.r, mv.c)) {
                score += 50;
            } else if (isNearCorner(mv.r, mv.c)) {
                score -= 10;
            } else if (mv.r === 0 || mv.r === 7 || mv.c === 0 || mv.c === 7) {
                score += 8;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = mv;
            }
        }
        return bestMove || this.validMoves[0];
    }

    getHardAIMove() {
        const weights = [
            [100, -20,  10,   5,   5,  10, -20, 100],
            [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
            [ 10,  -2,   5,   1,   1,   5,  -2,  10],
            [  5,  -2,   1,   1,   1,   1,  -2,   5],
            [  5,  -2,   1,   1,   1,   1,  -2,   5],
            [ 10,  -2,   5,   1,   1,   5,  -2,  10],
            [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
            [100, -20,  10,   5,   5,  10, -20, 100]
        ];

        let bestMove = null;
        let bestScore = -Infinity;

        for (const mv of this.validMoves) {
            const flips = this.getFlipsForMove(mv.r, mv.c, 2);
            const originalBoard = this.board.map(row => [...row]);
            
            this.board[mv.r][mv.c] = 2;
            flips.forEach(pos => { this.board[pos.r][pos.c] = 2; });

            let score = this.minimax(3, -Infinity, Infinity, false, weights);
            this.board = originalBoard;

            if (score > bestScore) {
                bestScore = score;
                bestMove = mv;
            }
        }
        return bestMove || this.getMediumAIMove();
    }

    minimax(depth, alpha, beta, isMaximizing, weights) {
        if (depth === 0) {
            return this.evaluateBoard(weights);
        }

        const validMvs = [];
        const turn = isMaximizing ? 2 : 1;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 0 && this.getFlipsForMove(r, c, turn).length > 0) {
                    validMvs.push({ r, c });
                }
            }
        }

        if (validMvs.length === 0) {
            return this.evaluateBoard(weights);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const mv of validMvs) {
                const flips = this.getFlipsForMove(mv.r, mv.c, 2);
                const originalBoard = this.board.map(row => [...row]);
                
                this.board[mv.r][mv.c] = 2;
                flips.forEach(pos => { this.board[pos.r][pos.c] = 2; });

                let evaluation = this.minimax(depth - 1, alpha, beta, false, weights);
                this.board = originalBoard;

                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const mv of validMvs) {
                const flips = this.getFlipsForMove(mv.r, mv.c, 1);
                const originalBoard = this.board.map(row => [...row]);
                
                this.board[mv.r][mv.c] = 1;
                flips.forEach(pos => { this.board[pos.r][pos.c] = 1; });

                let evaluation = this.minimax(depth - 1, alpha, beta, true, weights);
                this.board = originalBoard;

                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard(weights) {
        let score = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === 2) {
                    score += weights[r][c];
                } else if (this.board[r][c] === 1) {
                    score -= weights[r][c];
                }
            }
        }
        return score;
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
    game = new OthelloGame();
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
