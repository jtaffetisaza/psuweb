import { NextResponse } from 'next/server';
import { cfbdFetch } from '@/lib/cfbd';
import { supabase } from '@/lib/supabase';

interface CFBDSeasonStat {
  playerId: string;
  player: string;
  team: string;
  conference: string;
  category: string;
  statType: string;
  stat: string;
}

export async function GET() {
  try {
    const season = 2026;

    const stats = await cfbdFetch<CFBDSeasonStat[]>(
      '/stats/player/season',
      {
        year: season,
        team: 'Penn State',
      }
    );

    if (!stats || stats.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No ${season} Penn State player stats found.`,
        players: 0,
      });
    }

    // Group stats by CFBD player ID
    const playerStats = new Map<
      string,
      {
        name: string;
        stats: Record<string, Record<string, number>>;
      }
    >();

    for (const row of stats) {
      const playerId = String(row.playerId);

      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          name: row.player,
          stats: {},
        });
      }

      const player = playerStats.get(playerId)!;

      if (!player.stats[row.category]) {
        player.stats[row.category] = {};
      }

      const value = Number(row.stat);

      if (!Number.isNaN(value)) {
        player.stats[row.category][row.statType] = value;
      } else {
        // Keep non-numeric values if CFBD ever returns one
        player.stats[row.category][row.statType] = row.stat as any;
      }
    }

    // Get Penn State players from our database
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, position, cfbd_player_id')
      .not('cfbd_player_id', 'is', null);

    if (playersError) {
      throw playersError;
    }

    let updated = 0;

    for (const player of players || []) {
      const cfbdPlayer = playerStats.get(
        String(player.cfbd_player_id)
      );

      if (!cfbdPlayer) continue;

      const { error } = await supabase
        .from('player_season_stats')
        .upsert(
          {
            player_id: player.id,
            cfbd_player_id: player.cfbd_player_id,
            season,
            team: 'Penn State',
            position: player.position,
            games: null,
            stats: cfbdPlayer.stats,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'player_id,season',
          }
        );

      if (error) {
        throw error;
      }

      updated++;
    }

    return NextResponse.json({
      success: true,
      season,
      statRows: stats.length,
      playersFound: playerStats.size,
      playersUpdated: updated,
    });
  } catch (error) {
    console.error('CFBD sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      },
      { status: 500 }
    );
  }
}