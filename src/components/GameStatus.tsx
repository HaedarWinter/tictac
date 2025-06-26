import React from 'react';
import { GameState } from '../lib/gameUtils';

interface GameStatusProps {
  gameState: GameState;
  isHost: boolean;
  playerSymbol: string;
  opponentConnected: boolean;
  onResetGame: () => void;
}

const GameStatus: React.FC<GameStatusProps> = ({
  gameState,
  isHost,
  playerSymbol,
  opponentConnected,
  onResetGame,
}) => {
  const { currentPlayer, winner, gameOver } = gameState;
  const isMyTurn = currentPlayer === playerSymbol;

  const getStatusMessage = () => {
    if (gameOver) {
      if (winner === 'draw') {
        return 'Game ended in a draw!';
      } else if (winner === playerSymbol) {
        return 'You won the game!';
      } else {
        return 'Your opponent won the game!';
      }
    } else if (!opponentConnected) {
      return 'Waiting for opponent to connect...';
    } else if (isMyTurn) {
      return 'Your turn';
    } else {
      return "Opponent's turn";
    }
  };

  const getStatusClass = () => {
    if (gameOver) {
      if (winner === 'draw') {
        return 'text-yellow-500 dark:text-yellow-400';
      } else if (winner === playerSymbol) {
        return 'text-green-600 dark:text-green-400';
      } else {
        return 'text-red-600 dark:text-red-400';
      }
    } else if (!opponentConnected) {
      return 'text-gray-600 dark:text-gray-400';
    } else if (isMyTurn) {
      return 'text-indigo-600 dark:text-indigo-400';
    } else {
      return 'text-orange-600 dark:text-orange-400';
    }
  };

  return (
    <div className="game-status card p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="status-indicator flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            {gameOver ? (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            ) : isMyTurn ? (
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            )}
          </svg>
          <h2 className={`font-bold text-lg ${getStatusClass()}`}>
            {getStatusMessage()}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className={`status-indicator ${opponentConnected ? 'text-green-500' : 'text-yellow-500'} flex items-center`}>
            <span className={`inline-block w-2 h-2 rounded-full ${opponentConnected ? 'bg-green-500' : 'bg-yellow-500'} mr-1 animate-pulse`}></span>
            <span className="text-sm hidden sm:inline">{opponentConnected ? 'Opponent connected' : 'Waiting for opponent'}</span>
          </div>
          
          {gameOver && isHost && (
            <button 
              onClick={onResetGame} 
              className="btn btn-primary btn-sm flex items-center gap-1"
              aria-label="Reset game"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span className="sm:inline hidden">New Game</span>
              <span className="sm:hidden inline">Reset</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="player-info flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span>You:</span>
          <span className={`inline-block px-1.5 py-0.5 rounded ${playerSymbol === 'X' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'}`}>
            {playerSymbol}
          </span>
        </div>
        
        {opponentConnected && (
          <div className="flex items-center gap-1">
            <span>Opponent:</span>
            <span className={`inline-block px-1.5 py-0.5 rounded ${playerSymbol === 'O' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'}`}>
              {playerSymbol === 'X' ? 'O' : 'X'}
            </span>
          </div>
        )}
      </div>
      
      {/* Turn progress indicator */}
      {!gameOver && opponentConnected && (
        <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${isMyTurn ? 'bg-indigo-500' : 'bg-orange-500'}`}
            style={{ width: isMyTurn ? '100%' : '0', transitionProperty: 'width, background-color', transitionDuration: '1s' }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default GameStatus; 