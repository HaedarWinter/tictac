'use client';

import React, { useState, useEffect } from 'react';
import { Peer, DataConnection } from 'peerjs';
import GameBoard from './GameBoard';
import GameStatus from './GameStatus';
import { GameState, createNewGame, makeMove } from '@/lib/gameUtils';

interface GameRoomProps {
  gameId: string;
  isHost: boolean;
  onLeaveGame: () => void;
}

// Define data type for message communication
interface GameMessage {
  type: 'gameState' | 'move' | 'resetGame';
  gameState?: GameState;
  position?: number;
}

export default function GameRoom({ gameId, isHost, onLeaveGame }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState>(createNewGame());
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player symbol is X for host, O for guest
  const playerSymbol = isHost ? 'X' : 'O';

  // Initialize PeerJS
  useEffect(() => {
    const newPeer = new Peer();

    newPeer.on('open', () => {
      setPeer(newPeer);
    });

    newPeer.on('error', (err) => {
      setError(`Connection error: ${err.message}`);
      console.error('PeerJS error:', err);
    });

    // Handle incoming connections
    newPeer.on('connection', (connection) => {
      setConn(connection);
      setOpponentConnected(true);

      setupConnectionHandlers(connection);
    });

    // Cleanup on unmount
    return () => {
      if (conn) conn.close();
      if (newPeer && !newPeer.destroyed) newPeer.destroy();
    };
  }, []);

  // For the guest (joinee), establish connection to host
  useEffect(() => {
    // Only attempt to connect if we're the joiner and peer is initialized
    if (!isHost && peer && gameId) {
      try {
        const connection = peer.connect(gameId);
        setConn(connection);
        
        connection.on('open', () => {
          setOpponentConnected(true);
          setupConnectionHandlers(connection);
        });
      } catch (err) {
        setError('Failed to connect to game host');
        console.error('Connection error:', err);
      }
    }
  }, [isHost, peer, gameId]);
  
  // Setup connection event handlers
  const setupConnectionHandlers = (connection: DataConnection) => {
    // Use type assertion for the data to handle the PeerJS DataConnection type constraints
    connection.on('data', (data) => {
      const message = data as GameMessage;
      
      // Handle different message types
      if (message.type === 'gameState' && message.gameState) {
        setGameState(message.gameState);
      }
      else if (message.type === 'move' && typeof message.position === 'number') {
        handleOpponentMove(message.position);
      }
      else if (message.type === 'resetGame') {
        setGameState(createNewGame());
      }
    });

    connection.on('close', () => {
      setOpponentConnected(false);
      setError('Opponent disconnected');
    });
  };

  // Handle a player's move
  const handleCellClick = (position: number) => {
    if (!opponentConnected) return;
    
    // Only allow moves if it's the player's turn
    if (gameState.currentPlayer !== playerSymbol) return;
    
    // Make sure the position is valid
    if (gameState.board[position] !== null) return;
    
    // Update game locally
    const updatedGame = makeMove(gameState, position);
    setGameState(updatedGame);
    
    // Send move to opponent
    if (conn) {
      conn.send({
        type: 'move',
        position
      });
    }
  };

  // Handle opponent's move
  const handleOpponentMove = (position: number) => {
    setGameState(currentState => makeMove(currentState, position));
  };

  // Reset the game
  const handleResetGame = () => {
    const newGame = createNewGame();
    setGameState(newGame);
    
    if (conn) {
      conn.send({
        type: 'resetGame'
      });
    }
  };

  // Leave the game and disconnect
  const handleLeaveGame = () => {
    if (conn) conn.close();
    if (peer && !peer.destroyed) peer.destroy();
    onLeaveGame();
  };

  // Determine if it's the current player's turn
  const isMyTurn = gameState.currentPlayer === playerSymbol;

  return (
    <div className="game-room">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Game Room</h1>
        <button 
          className="btn btn-danger" 
          onClick={handleLeaveGame}
        >
          Leave Game
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <GameStatus 
        gameState={gameState}
        isHost={isHost}
        playerSymbol={playerSymbol}
        opponentConnected={opponentConnected}
        onResetGame={handleResetGame}
      />

      <GameBoard 
        gameState={gameState}
        isMyTurn={isMyTurn}
        onCellClick={handleCellClick}
      />

      <div className="game-info mt-6">
        <p>You are playing as <span className={playerSymbol === 'X' ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>{playerSymbol}</span></p>
        <p className="text-sm mt-1">Game ID: {gameId}</p>
      </div>
    </div>
  );
} 