"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Piece {
  id: number; // Correct target slot index (0 to tileCount - 1)
  currentSlot: number | null; // index of the grid slot, or null if in deck
}

interface JigsawPuzzleProps {
  imageSrc: string;
  clueText: string;
  groupName: string;
  rows: number;
  cols: number;
  onBack: () => void;
  onComplete: () => void;
}

export default function JigsawPuzzle({
  imageSrc,
  clueText,
  groupName,
  rows,
  cols,
  onBack,
  onComplete,
}: JigsawPuzzleProps) {
  const tileCount = rows * cols;

  const [boardSlots, setBoardSlots] = useState<(Piece | null)[]>(
    Array(tileCount).fill(null)
  );
  const [, setDeck] = useState<Piece[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState<{
    pieceId: number;
    source: "deck" | number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Initialize Audio Context lazily
  const playSound = (type: "click" | "snap" | "win") => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "snap") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "win") {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C chord arpeggio
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
        });
      }
    } catch (e) {
      console.warn("Audio Context not allowed or supported by browser.", e);
    }
  };

  // Start new game
  const startNewGame = useCallback(() => {
    // Generate sequential pieces and randomly place them directly into board slots
    const pieces: Piece[] = Array.from({ length: tileCount }, (_, i) => ({
      id: i,
      currentSlot: i,
    }));

    // Shuffle pieces and assign one to each board slot
    const shuffled = [...pieces].sort(() => Math.random() - 0.5);
    const initialBoard = Array.from({ length: tileCount }, (_, idx) => ({
      id: shuffled[idx].id,
      currentSlot: idx,
    })) as (Piece | null)[];

    setDeck([]);
    setBoardSlots(initialBoard);
    setIsWon(false);
    
    // Stop confetti if running
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [tileCount]);

  // Trigger start when image/props/dimensions change
  useEffect(() => {
    const timeoutId = window.setTimeout(startNewGame, 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [startNewGame, imageSrc]);

  // Canvas confetti effect
  const runConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#818cf8", "#38bdf8", "#34d399", "#f43f5e", "#fbbf24", "#a78bfa"];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // HTML5 Drag handlers
  const handleDragStart = (
    e: React.DragEvent,
    pieceId: number,
    source: "deck" | number
  ) => {
    playSound("click");
    setDraggedPiece({ pieceId, source });
    e.dataTransfer.setData("text/plain", JSON.stringify({ pieceId, source }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlotIndex: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { pieceId, source } = data;

      playSound("snap");

      setBoardSlots((prev) => {
        const next = [...prev];

        // If source was deck (shouldn't happen anymore), just place and clear nothing
        if (source === "deck") {
          next[targetSlotIndex] = { id: pieceId, currentSlot: targetSlotIndex };
          checkWinCondition(next);
          return next;
        }

        const prevSlotIndex = source as number;
        const targetPiece = next[targetSlotIndex];

        // Place dragged piece into the target
        next[targetSlotIndex] = { id: pieceId, currentSlot: targetSlotIndex };

        // If there was a piece in target, move it into the original source slot (swap)
        if (targetPiece) {
          next[prevSlotIndex] = { id: targetPiece.id, currentSlot: prevSlotIndex };
        } else {
          // Otherwise the source slot becomes empty
          next[prevSlotIndex] = null;
        }

        checkWinCondition(next);
        return next;
      });
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const checkWinCondition = (currentSlots: (Piece | null)[]) => {
    const totalPlaced = currentSlots.filter(Boolean).length;
    if (totalPlaced !== tileCount) return;

    const isCorrect = currentSlots.every(
      (piece, index) => piece !== null && piece.id === index
    );

    if (isCorrect) {
      setIsWon(true);
      playSound("win");
      runConfetti();
      onComplete();
    }
  };

  // Helper values for background position calculations
  // Avoid division by zero for 1x1 grids (safeguard)
  const xDenom = cols > 1 ? cols - 1 : 1;
  const yDenom = rows > 1 ? rows - 1 : 1;

  return (
    <div className="game-container">
      {/* Background canvas for particle effects */}
      <canvas ref={canvasRef} className="confetti-canvas" />

      <div className="game-header">
        <button onClick={onBack} className="btn-secondary">
          ← Back to Groups
        </button>
        <div className="title-group">
          <h2 className="puzzle-title">{groupName} Jigsaw</h2>
          <p className="puzzle-subtitle">
            Fit the {tileCount} segments into their coordinates ({rows} rows, {cols} columns) to reveal the hidden clue.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={startNewGame} className="btn-secondary">
            Reset Grid
          </button>
        </div>
      </div>

      {isWon && (
        <div className="clue-banner animate-fade-in">
          <div className="clue-tag">🔐 UNLOCKED CLUE</div>
          <div className="clue-text glowing-text">{clueText}</div>
          <p className="clue-instruction">Keep this clue safe to solve the ultimate challenge!</p>
        </div>
      )}

      <div className="workspace-layout">
        {/* Board Section */}
        <div className="canvas-section">
          <div className="section-label">Target Jigsaw Grid ({rows}x{cols})</div>
          <div
            className="jigsaw-board"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              aspectRatio: `${cols} / ${rows}`, // Dynamic aspect ratio based on shape
            }}
          >
            {boardSlots.map((piece, index) => {
              const rIdx = Math.floor(index / cols);
              const cIdx = index % cols;
              const isOver = draggedPiece && draggedPiece.source !== index;

              return (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnSlot(e, index)}
                  className={`board-slot ${isOver ? "slot-highlight" : ""}`}
                >
                  {piece ? (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, piece.id, index)}
                      onDragEnd={handleDragEnd}
                      className={`puzzle-piece ${
                        piece.id === index ? "piece-locked" : ""
                      }`}
                      style={{
                        backgroundImage: `url(${imageSrc})`,
                        backgroundSize: `${cols * 100}% ${rows * 100}%`,
                        backgroundPosition: `${(piece.id % cols) * (100 / xDenom)}% ${
                          Math.floor(piece.id / cols) * (100 / yDenom)
                        }%`,
                      }}
                    />
                  ) : (
                    <div className="slot-coordinate">
                      {rIdx + 1},{cIdx + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* deck/tray removed for production - pieces are placed on the board */}
      </div>
    </div>
  );
}
