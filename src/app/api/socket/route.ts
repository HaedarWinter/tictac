import { NextResponse } from 'next/server';

// Just a simple API endpoint to verify server is running
export async function GET() {
  return NextResponse.json({ status: 'Socket server is running' });
} 