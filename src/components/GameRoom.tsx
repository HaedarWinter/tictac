'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameBoard from './GameBoard';
import GameStatus from './GameStatus';
import { GameState, createNewGame, makeMove } from '@/lib/gameUtils';

// Use type only imports for PeerJS types
import type { Peer as PeerType, DataConnection } from 'peerjs';

interface GameRoomProps {
  gameId: string;
  isHost: boolean;
  onLeaveGame: () => void;
}

// Define data type for message communication
interface GameMessage {
  type: 'gameState' | 'move' | 'resetGame' | 'chatMessage';
  gameState?: GameState;
  position?: number;
  chatMessage?: {
    text: string;
    sender: string;
    timestamp: number;
  };
}

// PeerJS configuration
const peerConfig = {
  // Primary PeerJS server
  host: 'peerjs-server.herokuapp.com',
  secure: true,
  port: 443,
  path: '/',
  debug: 3,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      // Public TURN servers
      { 
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
};

// Backup PeerJS servers in case the primary fails
const backupPeerConfig = {
  host: '0.peerjs.com',
  secure: true,
  port: 443,
  debug: 3,
  config: peerConfig.config // Reuse the same ICE servers
};

// CloudFlare backup server
const cloudflareBackupConfig = {
  host: 'peerjs.cloudflare.com',
  secure: true,
  port: 443,
  path: '/',
  debug: 3, 
  config: peerConfig.config
};

// Add a helper function to validate gameId format
const isValidPeerIdFormat = (id: string): boolean => {
  // PeerJS ID should be alphanumeric and reasonable length
  // Typical UUID pattern shortened is a common format for our gameIds
  return /^[a-zA-Z0-9-_]{4,16}$/.test(id);
};

export default function GameRoom({ gameId, isHost, onLeaveGame }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState>(createNewGame());
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [peer, setPeer] = useState<PeerType | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerSymbol = isHost ? 'X' : 'O';
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{text: string, sender: string, timestamp: number}[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  // Ref for auto-scrolling chat
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Connection status tracking
  const [connectionStatus, setConnectionStatus] = useState<'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'>('initializing');
  
  // Add new states for connection attempts
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [serverConfigs] = useState([peerConfig, backupPeerConfig, cloudflareBackupConfig]);
  
  // For SSR compatibility
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Handle opponent's move
  const handleOpponentMove = useCallback((position: number) => {
    setGameState(currentState => makeMove(currentState, position));
  }, []);

  // Setup connection event handlers
  const setupConnectionHandlers = useCallback((connection: DataConnection) => {
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
      else if (message.type === 'chatMessage' && message.chatMessage) {
        setChatMessages(prev => [...prev, message.chatMessage!]);
      }
    });

    connection.on('close', () => {
      setOpponentConnected(false);
      setError('Opponent disconnected');
    });
  }, [handleOpponentMove]);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize PeerJS - only on client-side
  useEffect(() => {
    if (!isClient) return;

    // Validate gameId format to catch obviously incorrect formats
    if (isHost && !isValidPeerIdFormat(gameId)) {
      console.error('Invalid game ID format:', gameId);
      setConnectionStatus('failed');
      setError('Invalid game ID format. Please create a new game.');
      return;
    }

    setConnectionStatus('initializing');
    
    // Dynamically import PeerJS to avoid SSR issues
    const initPeer = async () => {
      try {
        // Import PeerJS on the client-side only
        const { Peer } = await import('peerjs');
        
        // Use the gameId as the peer ID for the host, or generate a random ID for guest
        const peerId = isHost ? gameId : Math.random().toString(36).substring(2, 15);
        console.log(`Initializing peer with ID: ${peerId} (${isHost ? 'host' : 'guest'})`);
        console.log(`Using server config attempt ${connectionAttempt + 1}/${serverConfigs.length}`);
        
        setConnectionStatus('connecting');
        
        // Use current server config based on connection attempt
        const currentConfig = serverConfigs[connectionAttempt % serverConfigs.length];
        const newPeer = new Peer(peerId, currentConfig);
        
        let peerConnected = false;

        newPeer.on('open', (id) => {
          console.log(`Peer opened with ID: ${id}`);
          peerConnected = true;
          setPeer(newPeer);
          
          // If we're the host, we're "connected" as soon as the peer is open
          // Guests need to actually establish a connection to the host
          if (isHost) {
            setConnectionStatus('connected');
          }
        });

        newPeer.on('error', (err) => {
          console.error('PeerJS error:', err);
          // Try another server if connection failed
          if (!peerConnected && connectionAttempt < serverConfigs.length - 1) {
            console.log(`Connection attempt failed, trying next server...`);
            setConnectionStatus('retrying');
            setTimeout(() => {
              setConnectionAttempt(prev => prev + 1);
            }, 1000);
          } else {
            setConnectionStatus('failed');
          }
          setError(`Connection error: ${err.type}: ${err.message}`);
        });

        // Handle incoming connections
        newPeer.on('connection', (connection) => {
          console.log('Incoming connection received');
          setConn(connection);
          setOpponentConnected(true);
          setConnectionStatus('connected');
          setupConnectionHandlers(connection);
        });

        // Cleanup on unmount
        return () => {
          if (newPeer && !newPeer.destroyed) {
            console.log('Destroying peer connection');
            newPeer.destroy();
          }
        };
      } catch (err) {
        console.error('Error initializing PeerJS:', err);
        setError('Failed to initialize connection');
        
        // Try another server if an exception occurred
        if (connectionAttempt < serverConfigs.length - 1) {
          setConnectionStatus('retrying');
          setTimeout(() => {
            setConnectionAttempt(prev => prev + 1);
          }, 1000);
        } else {
          setConnectionStatus('failed');
        }
      }
    };

    initPeer();
  }, [isClient, isHost, gameId, setupConnectionHandlers, connectionAttempt, serverConfigs]);

  // For the guest (joinee), establish connection to host
  useEffect(() => {
    // Only attempt to connect if we're the joiner, peer is initialized, and on client side
    if (!isHost && peer && gameId && isClient) {
      // Validate gameId format to catch obviously incorrect formats
      if (!isValidPeerIdFormat(gameId)) {
        console.error('Invalid game ID format:', gameId);
        setConnectionStatus('failed');
        setError('Invalid game ID format. Please go back and enter a valid game code.');
        return;
      }
      
      let retryCount = 0;
      const maxRetries = 3;
      let retryTimeout: NodeJS.Timeout | null = null;
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      setConnectionStatus('connecting');
      
      // Set a global timeout for the entire connection process
      connectionTimeout = setTimeout(() => {
        if (connectionStatus !== 'connected') {
          console.error('Connection timed out after all retries');
          setConnectionStatus('failed');
          setError('Connection timed out. The host may have left the game or is offline. Please try again or create a new game.');
        }
      }, 20000); // 20 seconds total for all retries
      
      const attemptConnection = () => {
        try {
          console.log(`Attempting to connect to host with ID: ${gameId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
          const connection = peer.connect(gameId, {
            reliable: true, // Ensure reliable connection
            serialization: 'json', // Explicitly use JSON serialization for compatibility
            metadata: { guest: true } // Add metadata for identification
          });
          
          // Handle connection events
          connection.on('open', () => {
            console.log('Connection to host established successfully');
            if (retryTimeout) clearTimeout(retryTimeout);
            if (connectionTimeout) clearTimeout(connectionTimeout);
            setOpponentConnected(true);
            setConnectionStatus('connected');
            setupConnectionHandlers(connection);
            
            // Add welcome message for guest
            setChatMessages([{
              text: "Connected to game host. You can now chat with your opponent!",
              sender: "system",
              timestamp: Date.now()
            }]);
          });
  
          connection.on('error', (err) => {
            console.error('Connection error:', err);
            
            // Provide more user-friendly error messages based on error type
            let errorMessage = 'Failed to connect to host.';
            
            // Handle different error types in a more type-safe way
            const errorType = (err as any)?.type || '';
            const errorMsg = (err as any)?.message || '';
            
            if (errorType === 'peer-unavailable' || errorMsg.includes('Could not connect to peer')) {
              errorMessage = 'Host not found. The game may have ended or the host is offline.';
            } else if (errorType === 'disconnected' || errorMsg.includes('disconnect')) {
              errorMessage = 'Connection lost. The host may have left the game.';
            } else if (errorType === 'network' || errorType === 'server-error' || 
                       errorMsg.includes('network') || errorMsg.includes('server')) {
              errorMessage = 'Network or server error. Please check your internet connection and try again.';
            }
            
            setError(errorMessage);
            
            // Try to reconnect if we haven't exceeded maxRetries
            if (retryCount < maxRetries) {
              retryCount++;
              setConnectionStatus('retrying');
              console.log(`Connection failed, retrying (${retryCount}/${maxRetries})...`);
              retryTimeout = setTimeout(() => {
                attemptConnection();
              }, 2000); // Wait 2 seconds before retrying
            } else {
              setConnectionStatus('failed');
            }
          });
  
          // Set connection with better error handling
          connection.on('close', () => {
            console.log('Connection closed');
            setOpponentConnected(false);
            setError('Connection to host closed');
            setConnectionStatus('failed');
          });
          
          setConn(connection);
        } catch (err) {
          console.error('Failed to connect:', err);
          setError(`Failed to connect to game host: ${(err as Error).message || 'Unknown error'}`);
          
          // Try to reconnect if we haven't exceeded maxRetries
          if (retryCount < maxRetries) {
            retryCount++;
            setConnectionStatus('retrying');
            console.log(`Connection failed, retrying (${retryCount}/${maxRetries})...`);
            retryTimeout = setTimeout(() => {
              attemptConnection();
            }, 2000); // Wait 2 seconds before retrying
          } else {
            setConnectionStatus('failed');
          }
        }
      };
      
      // Start connection attempt
      attemptConnection();
      
      // Clean up on unmount
      return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
        if (connectionTimeout) clearTimeout(connectionTimeout);
      };
    }
  }, [isHost, peer, gameId, isClient, setupConnectionHandlers, connectionStatus]);
  
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

  // Function to send chat message
  const sendChatMessage = () => {
    if (!messageInput.trim() || !conn) return;
    
    const newMessage = {
      text: messageInput,
      sender: playerSymbol,
      timestamp: Date.now()
    };
    
    // Add message to local chat
    setChatMessages(prev => [...prev, newMessage]);
    
    // Send to opponent
    conn.send({
      type: 'chatMessage',
      chatMessage: newMessage
    });
    
    // Clear input
    setMessageInput('');
  };

  // Handle incoming connections - add welcome message for host
  useEffect(() => {
    if (opponentConnected && isHost) {
      // Add welcome message for host
      setChatMessages([{
        text: "Opponent connected. You can now chat with your opponent!",
        sender: "system",
        timestamp: Date.now()
      }]);
    }
  }, [opponentConnected, isHost]);

  // Connection error handling helper
  const getConnectionStatusMessage = () => {
    switch (connectionStatus) {
      case 'initializing':
        return 'Initializing connection...';
      case 'connecting':
        return isHost ? 'Waiting for opponent to join...' : 'Connecting to game host...';
      case 'retrying':
        return 'Connection failed, retrying...';
      case 'failed':
        return `Connection failed: ${error || 'Unknown error'}`;
      default:
        return null;
    }
  };

  if (!isClient) {
    return <div className="loading">Loading...</div>;
  }

  // Show connection error if there is one and no opponent is connected
  if (connectionStatus !== 'connected' && !opponentConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            {connectionStatus === 'failed' ? 'Connection Failed' : 'Connecting'}
          </h2>
          
          {connectionStatus !== 'failed' && (
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">{getConnectionStatusMessage()}</p>
            </div>
          )}
          
          {connectionStatus === 'failed' && (
            <>
              <p className="mb-6 text-red-500">{error || 'Unable to establish connection'}</p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleLeaveGame}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Game ID: {gameId}</p>
            <p>Role: {isHost ? 'Host (X)' : 'Guest (O)'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-room">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 text-transparent bg-clip-text">Game Room</h1>
        <button 
          className="btn btn-danger flex items-center gap-2" 
          onClick={handleLeaveGame}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 11.586V7z" clipRule="evenodd" />
          </svg>
          <span className="sm:inline hidden">Leave Game</span>
          <span className="sm:hidden inline">Leave</span>
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded flex items-center animate-fadeIn">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse md:flex-row gap-6 landscape:flex-row">
        <div className="flex-1">
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

          <div className="game-info mt-6 card p-4 text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">You are playing as</span>
              <span className={`ml-2 inline-block px-3 py-1 rounded-full text-white font-bold ${playerSymbol === 'X' ? 'bg-red-500' : 'bg-blue-500'}`}>
                {playerSymbol}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-2l2.257-2.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
              </svg>
              <span>Game ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">{gameId}</code></span>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-window w-full md:w-80 landscape:w-1/3">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-3 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <span>Chat with Opponent</span>
              {!opponentConnected && (
                <span className="ml-2 text-xs bg-yellow-400 text-yellow-800 px-2 py-0.5 rounded-full">Waiting</span>
              )}
            </h3>
            <button 
              onClick={() => setShowChat(!showChat)}
              className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
              aria-label={showChat ? "Minimize chat" : "Expand chat"}
            >
              {showChat ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {showChat && (
            <>
              {/* Chat messages */}
              <div 
                className="h-64 md:h-72 landscape:h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800" 
                ref={chatContainerRef}
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                    </svg>
                    <p className="text-center text-sm">
                      No messages yet. <br/>Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div 
                        key={msg.timestamp + i} 
                        className={`mb-2 ${
                          msg.sender === "system" 
                            ? "text-center" 
                            : msg.sender === playerSymbol 
                              ? "flex justify-end" 
                              : "flex justify-start"
                        }`}
                      >
                        {msg.sender === "system" ? (
                          <div className="message-bubble system">
                            {msg.text}
                          </div>
                        ) : (
                          <div 
                            className={`message-bubble ${msg.sender === playerSymbol ? 'sent' : 'received'} animate-fadeIn`}
                          >
                            <p className="break-words">{msg.text}</p>
                            <span className={`text-xs block text-right mt-1 ${
                              msg.sender === playerSymbol ? 'opacity-70 text-gray-100' : 'opacity-70 dark:text-gray-300 text-gray-600'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Message input */}
              <div className="border-t p-2 flex bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={opponentConnected ? "Type a message..." : "Waiting for opponent to join..."}
                  className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-gray-800"
                  disabled={!opponentConnected}
                />
                <button 
                  onClick={sendChatMessage}
                  disabled={!opponentConnected || !messageInput.trim()}
                  className={`px-3 py-2 rounded-r-md flex items-center justify-center
                    ${opponentConnected && messageInput.trim() 
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  title="Send message"
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Mobile game info section that shows in chat area when chat is closed */}
          {!showChat && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg md:hidden">
              <div className="flex items-center justify-center mb-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Game Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${gameState.gameOver ? 'bg-gray-500' : isMyTurn ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {gameState.gameOver ? 'Game Over' : isMyTurn ? 'Your Turn' : 'Waiting'}
                </span>
              </div>
              
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>Tap the chat button above to chat with your opponent</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 