'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import GameSetup from '../components/GameSetup';
import GameRoom from '../components/GameRoom';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();

  // Initialize from URL param if available (for direct links)
  useEffect(() => {
    setIsLoading(true);
    const gameIdFromUrl = searchParams.get('gameId');
    
    if (gameIdFromUrl) {
      setGameId(gameIdFromUrl);
      setIsHost(false);
    }
    
    setIsLoading(false);
  }, [searchParams]);

  // Handle creating a new game
  const handleCreateGame = () => {
    const newGameId = uuidv4().substring(0, 8);
    setGameId(newGameId);
    setIsHost(true);
    
    // Update URL to be shareable
    const url = new URL(window.location.href);
    url.searchParams.set('gameId', newGameId);
    window.history.pushState({}, '', url);
  };

  // Handle joining an existing game
  const handleJoinGame = (id: string) => {
    setGameId(id);
    setIsHost(false);
    
    // Update URL to reflect the joined game
    const url = new URL(window.location.href);
    url.searchParams.set('gameId', id);
    window.history.pushState({}, '', url);
  };

  // Handle leaving the game
  const handleLeaveGame = () => {
    setGameId(null);
    setIsHost(false);
    
    // Remove gameId from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('gameId');
    window.history.pushState({}, '', url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="loading-spinner">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      {gameId ? (
        <GameRoom 
          gameId={gameId} 
          isHost={isHost}
          onLeaveGame={handleLeaveGame}
        />
      ) : (
        <GameSetup 
          onCreateGame={handleCreateGame} 
          onJoinGame={handleJoinGame}
        />
      )}
    </div>
  );
}
