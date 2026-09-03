import { NextResponse } from 'next/server';

export async function GET() {
  const response = await fetch(
    'https://api.collegefootballdata.com/games/players?year=2025&team=Penn%20State',
    {
      headers: {
        Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
      },
    }
  );

  const data = await response.json();

  return NextResponse.json(data);
}