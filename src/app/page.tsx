'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const GameSetup = dynamic(() => import('@/components/GameSetup'), { ssr: false });
const GameRoom = dynamic(() => import('@/components/GameRoom'), { ssr: false });

export default function Home() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Create a new game (as host)
  const handleCreateGame = (newGameId: string) => {
    setGameId(newGameId);
    setIsHost(true);
  };

  // Join an existing game (as guest)
  const handleJoinGame = (existingGameId: string) => {
    setGameId(existingGameId);
    setIsHost(false);
  };

  // Leave the current game
  const handleLeaveGame = () => {
    setGameId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {!gameId ? (
        <GameSetup 
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
        />
      ) : (
        <GameRoom 
          gameId={gameId}
          isHost={isHost}
          onLeaveGame={handleLeaveGame}
        />
      )}
    </div>
  );
}
