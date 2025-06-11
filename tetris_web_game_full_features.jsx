// 테트리스 웹사이트: 키보드 컨트롤 + 일시정지 + 블록 미리보기 + 모바일 지원
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

const ROWS = 20;
const COLS = 10;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const getRandomShape = () => {
  const keys = Object.keys(SHAPES);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return { shape: SHAPES[randomKey], type: randomKey };
};

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const playSound = (id, soundEnabled) => {
  if (!soundEnabled) return;
  const audio = document.getElementById(id);
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
};

export default function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [current, setCurrent] = useState(getRandomShape());
  const [next, setNext] = useState(getRandomShape());
  const [pos, setPos] = useState({ x: 3, y: 0 });
  const [saved, setSaved] = useState(null);
  const [canSave, setCanSave] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("highScore")) || 0);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [paused, setPaused] = useState(false);

  const merge = (board, shape, pos) => {
    const newBoard = board.map(row => [...row]);
    shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) newBoard[y + pos.y][x + pos.x] = val;
      });
    });
    return newBoard;
  };

  const isValidMove = (shape, pos) => shape.every((row, y) =>
    row.every((val, x) => {
      const newY = y + pos.y;
      const newX = x + pos.x;
      return !val || (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS && board[newY][newX] === 0);
    })
  );

  const drop = useCallback(() => {
    if (gameOver || paused) return;
    const newPos = { x: pos.x, y: pos.y + 1 };
    if (isValidMove(current.shape, newPos)) {
      setPos(newPos);
    } else {
      const newBoard = merge(board, current.shape, pos);
      const cleared = clearLines(newBoard);
      const newScore = score + cleared.lines * 100;
      setBoard(cleared.board);
      setScore(newScore);
      playSound(cleared.lines > 0 ? "line" : "drop", soundEnabled);
      if (!isValidMove(next.shape, { x: 3, y: 0 })) {
        setGameOver(true);
        playSound("gameover", soundEnabled);
        if (newScore > highScore) {
          localStorage.setItem("highScore", newScore);
          setHighScore(newScore);
        }
      } else {
        setCurrent(next);
        setNext(getRandomShape());
        setPos({ x: 3, y: 0 });
        setCanSave(true);
      }
    }
  }, [board, current, pos, score, gameOver, highScore, soundEnabled, paused, next]);

  const clearLines = (board) => {
    let lines = 0;
    const newBoard = board.filter(row => {
      const full = row.every(cell => cell !== 0);
      if (full) lines++;
      return !full;
    });
    while (newBoard.length < ROWS) newBoard.unshift(Array(COLS).fill(0));
    return { board: newBoard, lines };
  };

  const move = (dir) => {
    const newPos = { x: pos.x + dir, y: pos.y };
    if (isValidMove(current.shape, newPos)) {
      setPos(newPos);
    }
  };

  const rotateShape = () => {
    const rotated = rotate(current.shape);
    if (isValidMove(rotated, pos)) {
      setCurrent({ ...current, shape: rotated });
      playSound("rotate", soundEnabled);
    }
  };

  const saveBlock = () => {
    if (!canSave || gameOver || paused) return;
    if (saved) {
      const temp = saved;
      setSaved(current);
      setCurrent(temp);
    } else {
      setSaved(current);
      setCurrent(next);
      setNext(getRandomShape());
    }
    setPos({ x: 3, y: 0 });
    setCanSave(false);
    playSound("save", soundEnabled);
  };

  const hardDrop = () => {
    if (gameOver || paused) return;
    let dropY = pos.y;
    while (isValidMove(current.shape, { x: pos.x, y: dropY + 1 })) {
      dropY++;
    }
    setPos({ ...pos, y: dropY });
    drop();
  };

  const handleKeyDown = useCallback((e) => {
    if (gameOver || paused) return;
    if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowUp") rotateShape();
    else if (e.key === "ArrowDown") drop();
    else if (e.key === " ") hardDrop();
    else if (e.key.toLowerCase() === "s") saveBlock();
  }, [move, rotateShape, drop, hardDrop, saveBlock, gameOver, paused]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const interval = setInterval(drop, 1000);
    return () => clearInterval(interval);
  }, [drop]);

  return (
    <div className="flex flex-col items-center p-4 space-y-4 md:flex-row md:space-x-4 md:space-y-0">
      <div className="grid grid-rows-20 grid-cols-10 gap-0.5">
        {board.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className={`w-6 h-6 ${cell ? "bg-blue-500" : "bg-gray-200"} border`}
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-2 items-center">
        <div className="text-lg font-bold">점수: {score}</div>
        <div className="text-sm">최고 점수: {highScore}</div>
        {gameOver && <div className="text-red-600 font-bold">게임 오버</div>}
        {paused && <div className="text-yellow-600 font-bold">일시 정지 중</div>}

        <div className="text-md mt-2">미리보기:</div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${next.shape[0].length}, 1.5rem)` }}>
          {next.shape.flat().map((val, i) => (
            <div
              key={i}
              className={`w-6 h-6 ${val ? "bg-purple-500" : "bg-gray-100"} border`}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 w-full">
          <Button onClick={() => move(-1)} disabled={gameOver || paused}>⬅️</Button>
          <Button onClick={() => move(1)} disabled={gameOver || paused}>➡️</Button>
          <Button onClick={rotateShape} disabled={gameOver || paused}>🔄</Button>
          <Button onClick={drop} disabled={gameOver || paused}>⬇️</Button>
        </div>

        <Button onClick={hardDrop} disabled={gameOver || paused}>⏬ 하드 드롭</Button>
        <Button onClick={saveBlock} disabled={gameOver || paused}>💾 저장</Button>
        <Button onClick={() => setSoundEnabled(!soundEnabled)}>
          🔈 사운드 {soundEnabled ? "끄기" : "켜기"}
        </Button>
        <Button onClick={() => setPaused(!paused)} disabled={gameOver}>
          {paused ? "▶️ 재개" : "⏸️ 일시정지"}
        </Button>
      </div>

      {/* 사운드 */}
      <audio id="rotate" src="/sounds/rotate.mp3" preload="auto" />
      <audio id="drop" src="/sounds/drop.mp3" preload="auto" />
      <audio id="line" src="/sounds/line.mp3" preload="auto" />
      <audio id="save" src="/sounds/save.mp3" preload="auto" />
      <audio id="gameover" src="/sounds/gameover.mp3" preload="auto" />
    </div>
  );
}
