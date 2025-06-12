// HTML 문서가 완전히 로드되면 게임 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', function() {

    // 캔버스 및 DOM 요소 가져오기
    const canvas = document.getElementById('tetris-canvas');
    const context = canvas.getContext('2d');
    const holdCanvas = document.getElementById('hold-canvas');
    const holdContext = holdCanvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextContext = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const pauseBtn = document.getElementById('pause-btn');

    // 만약 canvas를 찾지 못하면 에러를 막고 함수를 종료합니다. (안정성 추가)
    if (!canvas || !holdCanvas || !nextCanvas || !scoreElement || !pauseBtn) {
        console.error("게임에 필요한 HTML 요소를 찾을 수 없습니다. ID를 확인해주세요.");
        return;
    }

    // --- 여기부터는 기존 코드와 동일합니다. ---

    // 상수 정의
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 30;
    const COLORS = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877F5'];
    const SHAPES = [
        [], // 0번 인덱스는 비워둠
        [[1, 1, 1, 1]], // I
        [[2, 2], [2, 2]],   // O
        [[0, 3, 0], [3, 3, 3]], // T
        [[0, 4, 4], [4, 4, 0]], // S
        [[5, 5, 0], [0, 5, 5]], // Z
        [[6, 0, 0], [6, 6, 6]], // J
        [[0, 0, 7], [7, 7, 7]]  // L
    ];

    // 게임 상태 변수
    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let score = 0;
    let gameOver = false;
    let paused = false;
    let piece, nextPiece, heldPiece;
    let canHold = true;
    let dropCounter = 0;
    let dropInterval = 1000; // 1초마다 블록 하강
    let lastTime = 0;

    // 블록 객체 생성
    function createPiece(shape) {
        const colorIndex = SHAPES.indexOf(shape);
        return {
            shape: shape,
            color: COLORS[colorIndex],
            x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
            y: 0
        };
    }

    // 새 블록 생성 및 다음 블록 준비
    function resetPiece() {
        piece = nextPiece || createPiece(SHAPES[Math.floor(Math.random() * (SHAPES.length - 1)) + 1]);
        nextPiece = createPiece(SHAPES[Math.floor(Math.random() * (SHAPES.length - 1)) + 1]);
        canHold = true;
        if (isCollision(piece)) {
            gameOver = true;
        }
    }

    // 충돌 감지 함수
    function isCollision(p) {
        for (let y = 0; y < p.shape.length; y++) {
            for (let x = 0; x < p.shape[y].length; x++) {
                if (p.shape[y][x] !== 0) {
                    const newX = p.x + x;
                    const newY = p.y + y;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (board[newY] && board[newY][newX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 블록을 보드에 고정
    function freezePiece() {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[piece.y + y][piece.x + x] = COLORS.indexOf(piece.color);
                }
            });
        });
    }

    // 채워진 줄 제거
    function clearLines() {
        let linesCleared = 0;
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            linesCleared++;
            y++; // 같은 줄을 다시 검사
        }
        updateScore(linesCleared);
    }

    // 점수 업데이트
    function updateScore(lines) {
        if (lines > 0) {
            const lineScores = [0, 100, 300, 500, 800];
            score += lineScores[lines];
            scoreElement.innerText = score;
        }
    }

    // 블록 회전
    function rotatePiece() {
        const originalShape = piece.shape;
        const newShape = originalShape[0].map((_, colIndex) => originalShape.map(row => row[colIndex]).reverse());
        const originalX = piece.x;
        piece.shape = newShape;

        let offset = 1;
        while (isCollision(piece)) {
            piece.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > piece.shape[0].length) {
                piece.shape = originalShape;
                piece.x = originalX;
                return;
            }
        }
    }

    // 블록 아래로 이동
    function pieceDrop() {
        piece.y++;
        if (isCollision(piece)) {
            piece.y--;
            freezePiece();
            clearLines();
            resetPiece();
        }
        dropCounter = 0;
    }

    // 블록 좌우 이동
    function pieceMove(dir) {
        piece.x += dir;
        if (isCollision(piece)) {
            piece.x -= dir;
        }
    }

    // 블록 저장 (Hold) 기능
    function holdPiece() {
        if (!canHold) return;
        if (heldPiece) {
            [piece, heldPiece] = [heldPiece, piece];
            piece.x = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
            piece.y = 0;
        } else {
            heldPiece = piece;
            resetPiece();
        }
        canHold = false;
        drawSidePanel(holdContext, heldPiece);
    }

    // 그리기 함수
    function drawBlock(ctx, x, y, color, blockSize = BLOCK_SIZE) {
        ctx.fillStyle = color;
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
    }

    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(context, x, y, COLORS[value]);
                }
            });
        });
    }

    function drawPiece() {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(context, piece.x + x, piece.y + y, piece.color);
                }
            });
        });
    }

    function drawSidePanel(ctx, p) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (!p) return;
        const blockSize = 20;
        const xOffset = (ctx.canvas.width - p.shape[0].length * blockSize) / 2;
        const yOffset = (ctx.canvas.height - p.shape.length * blockSize) / 2;
        p.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, x + xOffset / blockSize, y + yOffset / blockSize, p.color, blockSize);
                }
            });
        });
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawPiece();
        drawSidePanel(nextContext, nextPiece);
        drawSidePanel(holdContext, heldPiece);
    }

    // 게임 루프
    function gameLoop(time = 0) {
        if (gameOver) {
            context.fillStyle = 'rgba(0, 0, 0, 0.75)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'white';
            context.font = '30px Arial';
            context.textAlign = 'center';
            context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
            return;
        }
        if (!paused) {
            const deltaTime = time - lastTime;
            lastTime = time;
            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                pieceDrop();
            }
            draw();
        }
        requestAnimationFrame(gameLoop);
    }

    // 일시정지
    function togglePause() {
        paused = !paused;
        pauseBtn.innerText = paused ? 'Resume' : 'Pause';
        if (paused) {
            context.fillStyle = 'rgba(0, 0, 0, 0.75)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'white';
            context.font = '30px Arial';
            context.textAlign = 'center';
            context.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }

    // 키보드 이벤트 리스너
    document.addEventListener('keydown', event => {
        if (gameOver || paused) return;
        if (event.key === 'ArrowLeft') pieceMove(-1);
        else if (event.key === 'ArrowRight') pieceMove(1);
        else if (event.key === 'ArrowDown') pieceDrop();
        else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'x') rotatePiece();
        else if (event.key.toLowerCase() === ' ') { // Hard Drop
            while (!isCollision(piece)) {
                piece.y++;
            }
            piece.y--;
            pieceDrop();
        }
        else if (event.key.toLowerCase() === 'c') holdPiece();
        else if (event.key.toLowerCase() === 'p') togglePause();
    });

    // 모바일 버튼 이벤트 리스너
    document.getElementById('left-btn').addEventListener('click', () => !paused && !gameOver && pieceMove(-1));
    document.getElementById('right-btn').addEventListener('click', () => !paused && !gameOver && pieceMove(1));
    document.getElementById('down-btn').addEventListener('click', () => !paused && !gameOver && pieceDrop());
    document.getElementById('rotate-btn').addEventListener('click', () => !paused && !gameOver && rotatePiece());
    document.getElementById('hold-btn').addEventListener('click', () => !paused && !gameOver && holdPiece());
    pauseBtn.addEventListener('click', togglePause);

    // 게임 시작
    resetPiece();
    gameLoop();
});
