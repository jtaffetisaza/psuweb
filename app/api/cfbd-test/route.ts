import { NextResponse } from 'next/server';
import { cfbdFetch } from '@/lib/cfbd';

export async function GET() {
  try {
    const data = await cfbdFetch('/games/players', {
      year: 2026,
      team: 'Penn State',
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('CFBD test error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}