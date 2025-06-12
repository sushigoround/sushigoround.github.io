const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
context.scale(20, 20); // 10x20 그리드에 맞춤

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highscore");

let board = createMatrix(12, 20);
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
highScoreEl.textContent = highScore;

const colors = [
  null,
  "#00f0f0", // I
  "#0000f0", // J
  "#f0a000", // L
  "#f0f000", // O
  "#00f000", // S
  "#a000f0", // T
  "#f00000", // Z
];

const pieces = {
  T: [[0, 1, 0], [1, 1, 1]],
  O: [[2, 2], [2, 2]],
  L: [[0, 0, 3], [3, 3, 3]],
  J: [[4, 0, 0], [4, 4, 4]],
  I: [[5, 5, 5, 5]],
  S: [[0, 6, 6], [6, 6, 0]],
  Z: [[7, 7, 0], [0, 7, 7]],
};

function createPiece(type) {
  return pieces[type];
}

function createMatrix(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(0));
}

function collide(board, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[y + player.pos.y][x + player.pos.x] = value;
    });
  });
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(board, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function playerDrop() {
  player.pos.y++;
  if (collide(board, player)) {
    player.pos.y--;
    merge(board, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(board, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const types = "TJLOSZI";
  player.matrix = createPiece(types[Math.floor(Math.random() * types.length)]);
  player.pos.y = 0;
  player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
  if (collide(board, player)) {
    board = createMatrix(12, 20);
    score = 0;
    updateScore();
  }
}

function playerRotate(dir) {
  const m = player.matrix;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [m[x][y], m[y][x]] = [m[y][x], m[x][y]];
    }
  }
  if (dir > 0) m.forEach(row => row.reverse());
  else m.reverse();

  if (collide(board, player)) {
    playerRotate(-dir);
  }
}

function arenaSweep() {
  outer: for (let y = board.length - 1; y >= 0; --y) {
    if (board[y].every(cell => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(board[0].length).fill(0));
      score += 10;
    }
  }
}

function updateScore() {
  scoreEl.textContent = score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    highScoreEl.textContent = highScore;
  }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

function restart() {
  board = createMatrix(12, 20);
  score = 0;
  updateScore();
  playerReset();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") playerMove(-1);
  else if (event.key === "ArrowRight") playerMove(1);
  else if (event.key === "ArrowDown") playerDrop();
  else if (event.key === "ArrowUp") playerRotate(1);
  else if (event.key === " ") {
    while (!collide(board, player)) {
      player.pos.y++;
    }
    player.pos.y--;
    playerDrop();
  }
});

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
};

playerReset();
update();
