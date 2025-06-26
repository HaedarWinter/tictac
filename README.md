# Multiplayer Tic Tac Toe

A real-time multiplayer Tic Tac Toe game built with Next.js, PeerJS, and WebSockets. Play with friends anywhere in the world with a simple shareable link!

## Features

- 🎮 Real-time gameplay with WebSocket and P2P connections
- 💬 In-game chat system to communicate with your opponent
- 🎨 Beautiful responsive UI that works on desktop and mobile devices
- 🌓 Dark mode support
- 🔗 Shareable game links - just send the URL to invite a friend
- ⚡ Fast and smooth animations
- 📱 Works on all modern browsers and devices

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework with server-side rendering
- [PeerJS](https://peerjs.com/) - Simplified peer-to-peer connections with WebRTC
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - For real-time server communication
- [TailwindCSS](https://tailwindcss.com/) - For styling and responsive design

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multiplayer-tictactoe.git
   cd multiplayer-tictactoe
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

The easiest way to deploy this app is using [Vercel](https://vercel.com/), the creators of Next.js:

1. Create a Vercel account if you don't have one
2. Connect your GitHub repository to Vercel
3. Vercel will automatically detect it's a Next.js app and set up the build configuration

Alternatively, you can deploy with the Vercel CLI:

```bash
npm i -g vercel
vercel
```

### Other Deployment Options

You can also deploy to any platform that supports Next.js:

- [Netlify](https://www.netlify.com/)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

## How to Play

1. **Create a game**: Click "Create New Game" button on the home page
2. **Share the game ID**: Send the Game ID or URL to your friend
3. **Wait for opponent**: Once they join, you'll be assigned 'X' and your friend will be 'O'
4. **Take turns**: Click on empty cells to place your mark
5. **Win the game**: Get three of your marks in a row (horizontally, vertically, or diagonally)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Enjoy the game! 🎮
