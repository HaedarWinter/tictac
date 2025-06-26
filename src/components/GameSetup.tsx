import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface GameSetupProps {
  onCreateGame: (gameId: string) => void;
  onJoinGame: (gameId: string) => void;
}

export default function GameSetup({ onCreateGame, onJoinGame }: GameSetupProps) {
  const [joinGameId, setJoinGameId] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameIdToShare, setGameIdToShare] = useState('');

  const handleCreateGame = () => {
    const newGameId = uuidv4().substring(0, 8); // Use shorter ID for easier sharing
    setGameIdToShare(newGameId);
    onCreateGame(newGameId);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinGameId.trim()) {
      onJoinGame(joinGameId.trim());
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gameIdToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy game ID:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Tic Tac Toe</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Create New Game</h2>
        <button 
          className="btn w-full" 
          onClick={handleCreateGame}
        >
          Create Game
        </button>

        {gameIdToShare && (
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="mb-2 text-sm">Share this Game ID with your friend:</p>
            <div className="flex items-center">
              <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded mr-2 text-sm overflow-auto">
                {gameIdToShare}
              </code>
              <button 
                className="btn btn-secondary text-sm px-3 py-1" 
                onClick={copyToClipboard}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-3">Join Existing Game</h2>
        <form onSubmit={handleJoinGame}>
          <input
            type="text"
            className="input mb-3"
            placeholder="Enter Game ID"
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value)}
            required
          />
          <button 
            type="submit" 
            className="btn w-full"
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
} 