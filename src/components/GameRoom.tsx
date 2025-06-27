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

// PeerJS configuration options
// We'll try multiple configurations if one fails
const peerConfigs = [
  // Option 1: Default PeerJS server with minimal config (most reliable)
  {
    debug: 1,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  },
  
  // Option 2: Custom server with more options
  {
    debug: 1,
    secure: true,
    host: 'peerjs.herokuapp.com', // Different server
    port: 443,
    path: '/',
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    }
  }
];

// Add additional PeerJS server option
const peerJSServers = [
  undefined, // Default PeerJS server
  {
    host: 'peerjs.herokuapp.com',
    secure: true,
    port: 443,
    path: '/'
  },
  {
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443,
    path: '/'
  }
];

// We'll select the config based on reconnect attempts

// Add a helper function to validate gameId format
const isValidPeerIdFormat = (id: string): boolean => {
  // PeerJS ID should be alphanumeric and reasonable length
  // Accept UUIDs and other common formats
  return /^[a-zA-Z0-9-_]{4,36}$/.test(id);
};

// Type for PeerJS errors
interface PeerJSError {
  type?: string;
  message?: string;
}

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
  
  // Maximum number of reconnection attempts
  const maxReconnectAttempts = 5; // Increased from 3 to 5
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Track if component is still mounted
  const isMountedRef = useRef(true);
  
  // For SSR compatibility
  useEffect(() => {
    setIsClient(true);
    return () => {
      isMountedRef.current = false;
    };
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
      if (!isMountedRef.current) return;
      setOpponentConnected(false);
      setError('Opponent disconnected');
    });
    
    connection.on('error', (err) => {
      if (!isMountedRef.current) return;
      console.error('Connection error:', err);
      setError(`Connection error: ${(err as any).message || 'Unknown error'}`);
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
    let connectionTimeout: NodeJS.Timeout | null = null;
    let peerInstance: PeerType | null = null;

    // Dynamically import PeerJS to avoid SSR issues
    const initPeer = async () => {
      try {
        // Clean up any existing peer before creating a new one
        if (peer && !peer.destroyed) {
          console.log('Destroying existing peer before creating a new one');
          try {
            peer.destroy();
          } catch (err) {
            console.error('Error destroying existing peer:', err);
          }
        }
        
        // Import PeerJS on the client-side only
        const { Peer } = await import('peerjs');
        
        // Use the gameId as the peer ID for the host, or generate a random ID for guest
        const peerId = isHost ? gameId : Math.random().toString(36).substring(2, 15);
        
        // Select which configuration to use based on reconnect attempts
        // This allows us to try different configurations if the first one fails
        const configIndex = Math.min(reconnectAttempts % peerConfigs.length, peerConfigs.length - 1);
        const selectedConfig = JSON.parse(JSON.stringify(peerConfigs[configIndex]));
        
        // Try different PeerJS servers
        const serverIndex = Math.floor(reconnectAttempts / peerConfigs.length) % peerJSServers.length;
        const selectedServer = peerJSServers[serverIndex];
        
        if (selectedServer) {
          Object.assign(selectedConfig, selectedServer);
        }
        
        console.log(`Initializing peer with ID: ${peerId} (${isHost ? 'host' : 'guest'})`);
        console.log(`Using config #${configIndex + 1} with server #${serverIndex + 1}, retry attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
        console.log('Selected config:', selectedConfig);
        
        setConnectionStatus('connecting');
        
        // Mobile optimization - detect if running on mobile
        const userAgent = navigator.userAgent as string;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        // Create a copy of the selected peer config we can modify
        const currentPeerConfig = selectedConfig;
        
        if (isMobile) {
          console.log('Mobile device detected, optimizing PeerJS config');
          
          // First prioritize TURN servers, then STUN servers
          const turnServers = currentPeerConfig.config.iceServers.filter((server: RTCIceServer) => {
            const urls = server.urls;
            return typeof urls === 'string' 
              ? urls.includes('turn:') 
              : Array.isArray(urls) && urls.some(url => url.includes('turn:'));
          });
          
          const stunServers = currentPeerConfig.config.iceServers.filter((server: RTCIceServer) => {
            const urls = server.urls;
            return typeof urls === 'string' 
              ? urls.includes('stun:') 
              : Array.isArray(urls) && urls.some(url => url.includes('stun:'));
          });
          
          // Update the ICE servers with TURN first, then STUN
          currentPeerConfig.config.iceServers = [...turnServers, ...stunServers];
          currentPeerConfig.debug = 0; // Reduce debug logging on mobile to improve performance
        }
        
        // Add a random value to avoid ID conflicts on reconnection attempts
        const peerIdWithSuffix = reconnectAttempts > 0 ? `${peerId}-${Date.now().toString().slice(-4)}` : peerId;
        
        // Initialize PeerJS with the selected configuration
        console.log(`Creating peer with ID ${peerIdWithSuffix}`);
        const newPeer = new Peer(peerIdWithSuffix, currentPeerConfig);
        peerInstance = newPeer;
        
        // Track if the peer connection was successful
        let peerConnected = false;
        
        // Set a global timeout to abandon this attempt if it takes too long
        connectionTimeout = setTimeout(() => {
          if (!isMountedRef.current) return;
          
          if (!peerConnected && reconnectAttempts < maxReconnectAttempts - 1) {
            console.log('Connection timed out, retrying...');
            setConnectionStatus('retrying');
            setReconnectAttempts(prev => prev + 1);
            
            // Clean up the peer that didn't connect properly
            if (newPeer && !newPeer.destroyed) {
              try {
                newPeer.destroy();
              } catch (err) {
                console.error('Error destroying peer:', err);
              }
            }
            
            // Retry with a delay - increase delay with each attempt
            const retryDelay = 1500 + (reconnectAttempts * 500);
            setTimeout(initPeer, retryDelay);
          } else if (!peerConnected) {
            setConnectionStatus('failed');
            setError('Failed to connect after multiple attempts. Please check your internet connection and try again.');
          }
        }, 12000); // 12 seconds timeout for connection attempt
        
        // Handle successful open event
        newPeer.on('open', (id) => {
          console.log('Peer connection established with ID:', id);
          peerConnected = true;
          setPeer(newPeer);
          
          // Clear the timeout since we're connected
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          // For host: set up connection handlers
          if (isHost) {
            setConnectionStatus('connecting'); // Waiting for opponent
            
            newPeer.on('connection', (connection) => {
              console.log('Received connection from:', connection.peer);
              setOpponentConnected(true);
              setConnectionStatus('connected');
              setConn(connection);
              setupConnectionHandlers(connection);
              
              // Send current game state to the opponent
              connection.on('open', () => {
                console.log('Connection opened with opponent');
                connection.send({
                  type: 'gameState',
                  gameState: gameState
                });
              });
            });
          }
        });
        
        // Handle disconnection from server
        newPeer.on('disconnected', () => {
          console.log('Peer disconnected from server, attempting to reconnect');
          
          // Don't try to reconnect if we're unmounting or already failed
          if (!isMountedRef.current || connectionStatus === 'failed') return;
          
          // Try to reconnect to the signaling server
          try {
            newPeer.reconnect();
          } catch (err) {
            console.error('Failed to reconnect:', err);
            
            // If reconnect fails, destroy and recreate peer
            if (reconnectAttempts < maxReconnectAttempts - 1) {
              setConnectionStatus('retrying');
              setReconnectAttempts(prev => prev + 1);
              
              // Clean up
              try {
                if (!newPeer.destroyed) {
                  newPeer.destroy();
                }
              } catch (err) {
                console.error('Error destroying peer during reconnect:', err);
              }
              
              // Retry with delay
              setTimeout(initPeer, 2000);
            } else {
              setConnectionStatus('failed');
              setError('Connection to server lost and could not be reestablished.');
            }
          }
        });
        
        // Handle errors
        newPeer.on('error', (err) => {
          console.error('PeerJS error:', err);
          
          // Try another attempt if connection failed
          if (!peerConnected && reconnectAttempts < maxReconnectAttempts - 1) {
            console.log(`Connection attempt failed, retrying...`);
            setConnectionStatus('retrying');
            
            // Clean up
            if (newPeer && !newPeer.destroyed) {
              try {
                newPeer.destroy();
              } catch (err) {
                console.error('Error destroying peer:', err);
              }
            }
            
            // Exponential backoff for retry
            const retryDelay = Math.min(1500 * Math.pow(1.5, reconnectAttempts), 8000);
            setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              initPeer();
            }, retryDelay);
          } else {
            // Format a user-friendly error message
            let errorMessage = 'Connection failed.';
            const errorType = (err as PeerJSError)?.type || '';
            const errorMsg = (err as PeerJSError)?.message || '';
            
            console.log('Error details:', { type: errorType, message: errorMsg });
            
            if (errorMsg.includes('Could not connect to peer') || errorType === 'peer-unavailable') {
              // This is the most common error - the peer ID doesn't exist or can't be reached
              errorMessage = 'Could not connect to game. The host may be offline or behind a restrictive firewall.';
              
              // For hosts, this is likely a server connection issue
              if (isHost) {
                errorMessage = 'Could not establish connection with the PeerJS server. Please try again.';
              }
            } else if (errorType === 'network' || errorType === 'server-error' || 
                errorMsg.includes('server') || errorMsg.includes('network')) {
              errorMessage = 'Network or server error. Please check your internet connection and try again.';
            } else if (errorType === 'browser-incompatible') {
              errorMessage = 'Your browser may not fully support WebRTC. Please try a different browser.';
            } else if (errorType === 'disconnected' || errorMsg.includes('disconnect')) {
              errorMessage = 'Connection was lost. Please try again.';
            } else if (errorType === 'invalid-id') {
              errorMessage = 'Invalid game ID format. Please create a new game.';
            } else if (errorType === 'unavailable-id') {
              errorMessage = 'This game ID is already in use. Please try another ID.';
            }
            
            setError(errorMessage);
            setConnectionStatus('failed');
          }
        });
        
      } catch (error) {
        console.error('Error initializing PeerJS:', error);
        
        // Try another attempt if an exception occurred
        if (reconnectAttempts < maxReconnectAttempts - 1) {
          setConnectionStatus('retrying');
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            initPeer();
          }, 1500);
        } else {
          setConnectionStatus('failed');
          setError(`Could not initialize connection: ${(error as Error).message || 'Unknown error'}`);
        }
      }
    };
  
    initPeer();
    
    // Clean up on component unmount
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Properly clean up peer instance
      if (peerInstance && !peerInstance.destroyed) {
        try {
          console.log('Destroying peer on unmount');
          peerInstance.destroy();
        } catch (err) {
          console.error('Error destroying peer on unmount:', err);
        }
      }
    };
  }, [isClient, isHost, gameId, setupConnectionHandlers, reconnectAttempts, maxReconnectAttempts, gameState]);

  // For the guest (joinee), establish connection to host
  useEffect(() => {
    if (!isClient || isHost || !peer) return;

    // Check if already connected
    if (opponentConnected) return;

    // Clear any previous error if we're retrying
    if (error) setError(null);
    
    // Prevent repeated connection attempts
    if (connectionStatus !== 'connecting') return;
    
    let connectionTimeout: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptConnection = () => {
      try {
        // Validate the gameId before attempting to connect
        if (!isValidPeerIdFormat(gameId)) {
          console.error('Invalid game ID format:', gameId);
          setConnectionStatus('failed');
          setError('Invalid game ID format. Please check the game ID and try again.');
          return;
        }
        
        // Select which configuration to use based on retry count
        const configIndex = Math.min(retryCount, peerConfigs.length - 1);
        const selectedConfig = peerConfigs[configIndex];
        
        console.log(`Guest attempting to connect to host: ${gameId}`);
        console.log(`Using config #${configIndex + 1} with retry attempt ${retryCount + 1}/${maxRetries}`);
        console.log('Selected config:', selectedConfig);
        
        // Set a timeout for this connection attempt
        connectionTimeout = setTimeout(() => {
          if (!opponentConnected) {
            console.log('Connection attempt timed out');
            
            if (retryCount < maxRetries) {
              retryCount++;
              setConnectionStatus('retrying');
              console.log(`Connection timed out, retrying (${retryCount}/${maxRetries})...`);
              // Increase delay with each retry
              const retryDelay = 2000 + (retryCount * 500);
              retryTimeout = setTimeout(attemptConnection, retryDelay);
            } else {
              setConnectionStatus('failed');
              setError('Could not connect to host. The game may have ended or the host is offline.');
            }
          }
        }, 8000); // Reduced timeout for faster feedback
        
        // Using the selected config for this connection attempt
        
        // Connect to the host with additional options
        console.log(`Connecting to host ${gameId} with config #${configIndex + 1}`);
        
        // Check if peer is valid before connecting
        if (!peer || peer.destroyed) {
          console.error('Peer is not valid or has been destroyed');
          setConnectionStatus('failed');
          setError('Connection error: Peer object is not valid. Please refresh and try again.');
          return;
        }
        
        const connection = peer.connect(gameId, {
          reliable: true,
          serialization: 'json', // Explicitly use JSON serialization
          metadata: { 
            playerSymbol,
            configIndex,
            timestamp: Date.now()
          }
        });
        
        if (!connection) {
          console.error('Failed to create connection object');
          setConnectionStatus('failed');
          setError('Failed to establish connection. Please try again.');
          return;
        }
        
        // Handle connection open
        connection.on('open', () => {
          console.log('Connection established with host');
          if (connectionTimeout) clearTimeout(connectionTimeout);
          
          setOpponentConnected(true);
          setConnectionStatus('connected');
          setupConnectionHandlers(connection);
          
          // Welcome message for guest
          setChatMessages([{
            text: "Connected to host. You can now chat with your opponent!",
            sender: "system",
            timestamp: Date.now()
          }]);
        });
        
        // Handle connection error
        connection.on('error', (err) => {
          console.error('Connection error:', err);
          
          // Provide more user-friendly error messages based on error type
          let errorMessage = 'Failed to connect to host.';
          
          // Handle different error types in a more type-safe way
          const errorType = (err as PeerJSError)?.type || '';
          const errorMsg = (err as PeerJSError)?.message || '';
          
          console.log('Guest connection error details:', { type: errorType, message: errorMsg });
          
          if (errorType === 'peer-unavailable' || errorMsg.includes('Could not connect to peer')) {
            errorMessage = 'Host not found. The game ID may be incorrect or the host is offline.';
            
            // For this specific error, we might want to try a different approach
            if (retryCount === 0) {
              // On first attempt with this error, try connecting with a different peer server
              console.log('Attempting to connect with a different peer server configuration');
              retryCount++;
              setConnectionStatus('retrying');
              
              // Try a different server configuration immediately
              if (connectionTimeout) clearTimeout(connectionTimeout);
              retryTimeout = setTimeout(attemptConnection, 1000);
              return;
            }
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
            // Exponential backoff for retry
            const retryDelay = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
            retryTimeout = setTimeout(attemptConnection, retryDelay);
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
          retryTimeout = setTimeout(attemptConnection, 2000);
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
  }, [isHost, peer, gameId, isClient, setupConnectionHandlers, connectionStatus, error, opponentConnected]);
  
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
    // Ensure proper cleanup of connections
    if (conn) {
      try {
        conn.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
    
    if (peer) {
      try {
        if (!peer.destroyed) {
          console.log('Destroying peer on leave game');
          peer.destroy();
        }
      } catch (err) {
        console.error('Error destroying peer on leave game:', err);
      }
    }
    
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
        return `Connection attempt failed, retrying... (Attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`;
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
            {connectionStatus === 'failed' ? 'Connection Failed' : 
             connectionStatus === 'retrying' ? 'Retrying Connection' : 'Connecting'}
          </h2>
          
          {connectionStatus !== 'failed' && (
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">{getConnectionStatusMessage()}</p>
              {connectionStatus === 'retrying' && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  Having trouble connecting. Please check your internet connection.
                </p>
              )}
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
                  className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
                >
                  Return to Home
                </button>
                <p className="text-sm text-gray-500 mt-3 px-4">
                  If you continue to have issues, try using a different device or network.
                </p>
              </div>
            </>
          )}
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