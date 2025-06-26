// Game state interface
export interface GameState {
  board: Array<string | null>;
  currentPlayer: 'X' | 'O';
  winner: string | null;
  isDraw: boolean;
  gameOver: boolean;
  winningLine: number[] | null;
}

// Create a new game state
export function createNewGame(): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    isDraw: false,
    gameOver: false,
    winningLine: null
  };
}

// Check for a winner and return winning line if found
export function checkWinner(board: Array<string | null>): { winner: string | null; winningLine: number[] | null } {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { 
        winner: board[a] as string,
        winningLine: pattern
      };
    }
  }

  return { winner: null, winningLine: null };
}

// Check if the game is a draw
export function checkDraw(board: Array<string | null>): boolean {
  return board.every(cell => cell !== null);
}

// Make a move in the game
export function makeMove(game: GameState, position: number): GameState {
  // If the cell is already filled or game is over, return unchanged game
  if (game.board[position] !== null || game.gameOver) {
    return game;
  }

  // Create a new board with the player's move
  const newBoard = [...game.board];
  newBoard[position] = game.currentPlayer;

  // Check for winner
  const { winner, winningLine } = checkWinner(newBoard);
  const isDraw = !winner && checkDraw(newBoard);
  const gameOver = !!winner || isDraw;

  // Return updated game state
  return {
    board: newBoard,
    currentPlayer: game.currentPlayer === 'X' ? 'O' : 'X',
    winner,
    isDraw,
    gameOver,
    winningLine
  };
} 