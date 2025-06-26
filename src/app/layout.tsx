import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Multiplayer Tic Tac Toe",
  description: "A simple multiplayer Tic Tac Toe game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
