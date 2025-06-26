import React, { useEffect, useState } from 'react';
import { GameState } from '../lib/gameUtils';

interface GameBoardProps {
  gameState: GameState;
  isMyTurn: boolean;
  onCellClick: (index: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, isMyTurn, onCellClick }) => {
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | null>(null);

  // Calculate winning line when the game ends
  useEffect(() => {
    if (gameState.gameOver && gameState.winner !== 'draw') {
      // Check rows
      for (let i = 0; i < 3; i++) {
        if (
          gameState.board[i * 3] &&
          gameState.board[i * 3] === gameState.board[i * 3 + 1] &&
          gameState.board[i * 3] === gameState.board[i * 3 + 2]
        ) {
          setWinningLine([i * 3, i * 3 + 1, i * 3 + 2]);
          return;
        }
      }
      
      // Check columns
      for (let i = 0; i < 3; i++) {
        if (
          gameState.board[i] &&
          gameState.board[i] === gameState.board[i + 3] &&
          gameState.board[i] === gameState.board[i + 6]
        ) {
          setWinningLine([i, i + 3, i + 6]);
          return;
        }
      }
      
      // Check diagonal top-left to bottom-right
      if (
        gameState.board[0] &&
        gameState.board[0] === gameState.board[4] &&
        gameState.board[0] === gameState.board[8]
      ) {
        setWinningLine([0, 4, 8]);
        return;
      }
      
      // Check diagonal top-right to bottom-left
      if (
        gameState.board[2] &&
        gameState.board[2] === gameState.board[4] &&
        gameState.board[2] === gameState.board[6]
      ) {
        setWinningLine([2, 4, 6]);
        return;
      }
    } else if (!gameState.gameOver) {
      setWinningLine(null);
    }
  }, [gameState.gameOver, gameState.winner, gameState.board]);

  // Update last move
  useEffect(() => {
    const prevBoard = Array(9).fill('');
    let moveFound = -1;
    
    for (let i = 0; i < 9; i++) {
      if (prevBoard[i] !== gameState.board[i] && gameState.board[i] !== '') {
        moveFound = i;
        break;
      }
    }
    
    if (moveFound >= 0) {
      setLastMove(moveFound);
    }
  }, [gameState.board]);

  return (
    <div className="relative">
      <div className="game-board">
        {gameState.board.map((cell, index) => (
          <button
            key={index}
            onClick={() => isMyTurn && !cell && !gameState.gameOver && onCellClick(index)}
            disabled={!isMyTurn || !!cell || gameState.gameOver}
            className={`cell ${
              cell ? (cell === 'X' ? 'x-cell' : 'o-cell') : ''
            } ${winningLine && winningLine.includes(index) ? 'winning-cell' : ''} ${
              lastMove === index ? 'last-move' : ''
            } ${!cell && isMyTurn && !gameState.gameOver ? 'cell-hover' : ''}`}
            aria-label={`Cell ${index + 1}${cell ? ` marked with ${cell}` : ''}`}
          >
            {cell && (
              <span className="cell-content">
                {cell === 'X' ? (
                  <svg className="x-mark" viewBox="0 0 24 24" width="60" height="60">
                    <path
                      d="M6,6 L18,18 M6,18 L18,6"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg className="o-mark" viewBox="0 0 24 24" width="60" height="60">
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                  </svg>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="game-grid-lines">
        <div className="h-line h-line-1"></div>
        <div className="h-line h-line-2"></div>
        <div className="v-line v-line-1"></div>
        <div className="v-line v-line-2"></div>
      </div>
      
      {/* Game state overlay */}
      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {gameState.winner === 'draw' ? (
              <span className="text-yellow-500">It's a Draw!</span>
            ) : (
              <span className={`${gameState.winner === 'X' ? 'text-red-500' : 'text-blue-500'}`}>
                {gameState.winner} Wins!
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Turn indicator for mobile */}
      <div className="turn-indicator md:hidden">
        {!gameState.gameOver && (
          <div className={`turn-badge ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
            {isMyTurn ? 'Your Turn' : 'Waiting...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard; 