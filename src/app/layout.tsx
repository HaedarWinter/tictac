import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import ThemeToggle from '../components/ThemeToggle'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multiplayer Tic Tac Toe',
  description: 'Play Tic Tac Toe online with friends in real-time using peer-to-peer connections',
  keywords: 'tic tac toe, multiplayer game, online game, peer-to-peer, realtime, websockets',
  authors: [{ name: 'Tic Tac Toe Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Tailwind CDN for better styling */}
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        
        {/* Font Awesome for better icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Tic Tac Toe" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tic Tac Toe" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-indigo-950 text-gray-900 dark:text-gray-100`}>
        <div className="min-h-screen flex flex-col">
          <header className="py-4 px-4 bg-white bg-opacity-70 backdrop-blur-md dark:bg-gray-900 dark:bg-opacity-70 shadow-sm">
            <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-md flex items-center justify-center text-white text-lg font-bold">
                  T
                </div>
                <h1 className="text-lg font-bold hidden sm:block">Tic Tac Toe</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <ThemeToggle />

                <a 
                  href="https://github.com/HaedarWinter/tictac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  aria-label="View source on GitHub"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </a>
              </div>
            </div>
          </header>
          
          <main className="flex-grow py-4 px-4 md:py-8">
            <div className="container mx-auto">
              {children}
            </div>
          </main>
          
          <footer className="py-4 px-4 text-center text-xs text-gray-600 dark:text-gray-400 mt-auto">
            <div className="container mx-auto">
              <p>© {new Date().getFullYear()} Multiplayer Tic Tac Toe | Made with ❤️</p>
            </div>
          </footer>
        </div>

        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              // Check for saved theme preference or use system preference
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `}
        </Script>
      </body>
    </html>
  )
}
