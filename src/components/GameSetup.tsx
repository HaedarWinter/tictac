import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface GameSetupProps {
  onCreateGame: (gameId: string) => void;
  onJoinGame: (gameId: string) => void;
}

export default function GameSetup({ onCreateGame, onJoinGame }: GameSetupProps) {
  const [joinGameId, setJoinGameId] = useState('');
  const [copied, setCopied] = useState(false);
  const [gameIdToShare, setGameIdToShare] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [error, setError] = useState<string | null>(null);

  // Set isClient to true once component mounts to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCreateGame = () => {
    // Simulate a small delay for better user experience
    setTimeout(() => {
      const newGameId = uuidv4().substring(0, 8); // Use shorter ID for easier sharing
      setGameIdToShare(newGameId);
      onCreateGame(newGameId);
    }, 600);
  };

  const handleJoinGame = () => {
    if (!joinGameId.trim()) {
      setError('Please enter a game ID');
      return;
    }
    setError(null);
    onJoinGame(joinGameId.trim());
  };

  const copyToClipboard = async () => {
    if (!isClient) return; // Only try to copy on client-side

    try {
      await navigator.clipboard.writeText(gameIdToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy game ID:', err);
    }
  };

  return (
    <div className="game-setup p-6 md:p-8 card animate-fadeIn">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        <span className="bg-gradient-to-r from-indigo-600 to-blue-500 text-transparent bg-clip-text">
          Multiplayer Tic Tac Toe
        </span>
      </h1>

      <div className="mb-6">
        <div className="tab-navigation flex border-b">
          <button
            className={`tab-btn py-2 px-4 font-medium flex-1 ${activeTab === 'create' ? 'active text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={() => setActiveTab('create')}
          >
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Game
            </div>
          </button>
          <button
            className={`tab-btn py-2 px-4 font-medium flex-1 ${activeTab === 'join' ? 'active text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-600 dark:text-gray-400'}`}
            onClick={() => setActiveTab('join')}
          >
            <div className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Join Game
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message p-3 mb-4 bg-red-50 text-red-600 rounded-lg border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="tab-content">
        {activeTab === 'create' ? (
          <div className="create-game-panel animate-fadeIn">
            <p className="text-center mb-6 text-gray-600 dark:text-gray-300">
              Start a new game and invite a friend to join
            </p>
            
            <div className="instructions mb-6 p-4 bg-blue-50 rounded-lg dark:bg-blue-900">
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">How to play</h3>
              <ol className="list-decimal pl-5 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>Click &quot;Create Game&quot; to start</li>
                <li>Share your Game ID with a friend</li>
                <li>Wait for them to join</li>
                <li>Play the game!</li>
              </ol>
            </div>
            
            <div className="actions flex justify-center">
              <button 
                onClick={handleCreateGame} 
                className="btn btn-primary w-full md:w-auto animate-bounce"
                aria-label="Create new game"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Create New Game
                </div>
              </button>
            </div>

            {gameIdToShare && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-gray-700 rounded-lg border border-indigo-100 dark:border-gray-600 animate-fadeIn">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-2l2.257-2.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium text-sm">Share this Game ID with your friend:</p>
                </div>
                <div className="flex items-center mt-2">
                  <code className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-l-lg font-mono border border-r-0 border-gray-200 dark:border-gray-600 text-indigo-600 font-bold">
                    {gameIdToShare}
                  </code>
                  {isClient && (
                    <button 
                      className="p-3 bg-indigo-100 dark:bg-gray-600 hover:bg-indigo-200 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-600 rounded-r-lg transition-colors"
                      onClick={copyToClipboard}
                      aria-label="Copy game ID to clipboard"
                    >
                      {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 animate-scale" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {copied && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center animate-fadeIn">Copied to clipboard!</p>
                )}

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">How to play:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Share this Game ID with your friend</li>
                    <li>Wait for them to join using this ID</li>
                    <li>Once connected, you&apos;ll play as X and go first</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="join-game-panel animate-fadeIn">
            <p className="text-center mb-6 text-gray-600 dark:text-gray-300">
              Enter the Game ID shared by your friend
            </p>
            
            <div className="mb-4">
              <label htmlFor="gameId" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Game ID
              </label>
              <input
                type="text"
                id="gameId"
                placeholder="Enter game ID here"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>
            
            <div className="actions flex justify-center">
              <button 
                onClick={handleJoinGame} 
                disabled={!joinGameId.trim()}
                className={`btn w-full ${joinGameId.trim() ? 'btn-primary' : 'btn-disabled'}`}
                aria-label="Join game"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12 7a1 1 0 110 2H8a1 1 0 110-2h4zm0 4a1 1 0 110 2H8a1 1 0 110-2h4z" clipRule="evenodd" />
                  </svg>
                  Join Game
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Built with Next.js, PeerJS & WebSockets</p>
        <p className="mt-1">Works on desktop and mobile</p>
      </div>
    </div>
  );
} 