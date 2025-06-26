import React from 'react';
import { GameState } from '@/lib/gameUtils';

interface GameStatusProps {
  gameState: GameState;
  isHost: boolean;
  playerSymbol: 'X' | 'O';
  opponentConnected: boolean;
  onResetGame: () => void;
}

export default function GameStatus({ 
  gameState, 
  isHost, 
  playerSymbol, 
  opponentConnected,
  onResetGame 
}: GameStatusProps) {
  const { currentPlayer, winner, isDraw, gameOver } = gameState;

  const isMyTurn = currentPlayer === playerSymbol;

  return (
    <div className="game-info">
      {!opponentConnected && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
          Waiting for opponent to join...
        </div>
      )}

      {opponentConnected && !gameOver && (
        <p className="text-xl mb-2">
          {isMyTurn ? "Your turn" : "Opponent's turn"}
          <span className={`ml-2 font-bold ${currentPlayer === 'X' ? 'text-red-500' : 'text-blue-500'}`}>
            ({currentPlayer})
          </span>
        </p>
      )}

      {winner && (
        <div className="mb-4">
          <p className="text-xl font-bold">
            {winner === playerSymbol ? "You won! 🎉" : "Opponent won"}
          </p>
        </div>
      )}

      {isDraw && (
        <div className="mb-4">
          <p className="text-xl font-bold">It&apos;s a draw!</p>
        </div>
      )}

      {gameOver && isHost && (
        <button 
          className="btn mt-4" 
          onClick={onResetGame}
        >
          Play Again
        </button>
      )}

      {gameOver && !isHost && (
        <p className="text-sm mt-2">Waiting for host to start a new game...</p>
      )}
    </div>
  );
} 