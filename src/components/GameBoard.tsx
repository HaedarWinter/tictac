import React from 'react';
import { GameState } from '@/lib/gameUtils';

interface GameBoardProps {
  gameState: GameState;
  isMyTurn: boolean;
  onCellClick: (index: number) => void;
}

export default function GameBoard({ gameState, isMyTurn, onCellClick }: GameBoardProps) {
  const { board, gameOver } = gameState;
  
  const handleCellClick = (index: number) => {
    if (!gameOver && isMyTurn && board[index] === null) {
      onCellClick(index);
    }
  };

  return (
    <div className="game-board">
      {board.map((cell, index) => (
        <div 
          key={index}
          className={`cell ${cell?.toLowerCase() || ''} ${!gameOver && isMyTurn && !cell ? 'cursor-pointer' : ''}`}
          onClick={() => handleCellClick(index)}
        >
          {cell}
        </div>
      ))}
    </div>
  );
} 