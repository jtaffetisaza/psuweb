import { NextResponse } from 'next/server';
import { cfbdFetch } from '@/lib/cfbd';
import { supabase } from '@/lib/supabase';

interface CFBDTeamStat {
  category: string;
  stat: string;
}

interface CFBDTeam {
  teamId: number;
  team: string;
  conference: string | null;
  homeAway: string;
  points: number;
  stats: CFBDTeamStat[];
}

interface CFBDGameTeamStats {
  id: number;
  teams: CFBDTeam[];
}

function getStat(
  stats: CFBDTeamStat[],
  ...categories: string[]
): number | null {
  for (const category of categories) {
    const stat = stats.find(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );

    if (stat) {
      const value = Number(stat.stat);

      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }

  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((total, value) => total + value, 0) /
    values.length
  );
}

export async function GET() {
  try {
    const season = 2026;

    // Get all Penn State games with team box-score stats.
    const games = await cfbdFetch<CFBDGameTeamStats[]>(
      '/games/teams',
      {
        year: season,
        team: 'Penn State',
      }
    );

    if (!games || games.length === 0) {
      return NextResponse.json({
        success: true,
        season,
        message: `No ${season} Penn State team stats found yet.`,
        games: 0,
        teamsUpdated: 0,
      });
    }

    // Get the current 2026 matchups from our database.
    const { data: matchups, error: matchupError } = await supabase
      .from('matchups')
      .select('id, opponent, season')
      .eq('season', season);

    if (matchupError) {
      throw matchupError;
    }

    if (!matchups || matchups.length === 0) {
      return NextResponse.json({
        success: true,
        season,
        message: 'No 2026 matchups found in the database.',
        games: games.length,
        teamsUpdated: 0,
      });
    }

    let teamsUpdated = 0;

    // Process every completed game returned by CFBD.
    for (const game of games) {
      const pennState = game.teams.find(
        (team) => team.team === 'Penn State'
      );

      if (!pennState) {
        continue;
      }

      const opponent = game.teams.find(
        (team) => team.team !== 'Penn State'
      );

      if (!opponent) {
        continue;
      }

      // Find our matchup corresponding to this opponent.
      const matchup = matchups.find(
        (item) => item.opponent === opponent.team
      );

      if (!matchup) {
        continue;
      }

      // Build stats from the individual game.
      const pennStateStats = {
        points_per_game: pennState.points,
        total_yards_per_game: getStat(
          pennState.stats,
          'totalYards',
          'total yards'
        ),
        passing_yards_per_game: getStat(
          pennState.stats,
          'netPassingYards',
          'passingYards',
          'passing yards'
        ),
        rushing_yards_per_game: getStat(
          pennState.stats,
          'rushingYards',
          'rushing yards'
        ),
        points_allowed_per_game: opponent.points,
        turnovers: getStat(
          pennState.stats,
          'turnovers',
          'turnover'
        ),
        sacks: getStat(
          pennState.stats,
          'sacks'
        ),
        third_down_pct: getStat(
          pennState.stats,
          'thirdDownConversions',
          'thirdDownPct',
          'third down pct'
        ),
        red_zone_pct: getStat(
          pennState.stats,
          'redZonePct',
          'red zone pct'
        ),
      };

      const opponentStats = {
        points_per_game: opponent.points,
        total_yards_per_game: getStat(
          opponent.stats,
          'totalYards',
          'total yards'
        ),
        passing_yards_per_game: getStat(
          opponent.stats,
          'netPassingYards',
          'passingYards',
          'passing yards'
        ),
        rushing_yards_per_game: getStat(
          opponent.stats,
          'rushingYards',
          'rushing yards'
        ),
        points_allowed_per_game: pennState.points,
        turnovers: getStat(
          opponent.stats,
          'turnovers',
          'turnover'
        ),
        sacks: getStat(
          opponent.stats,
          'sacks'
        ),
        third_down_pct: getStat(
          opponent.stats,
          'thirdDownConversions',
          'thirdDownPct',
          'third down pct'
        ),
        red_zone_pct: getStat(
          opponent.stats,
          'redZonePct',
          'red zone pct'
        ),
      };

      // Save Penn State stats.
      const { error: pennStateError } = await supabase
        .from('matchup_team_stats')
        .upsert(
          {
            matchup_id: matchup.id,
            team_name: 'Penn State',
            ...pennStateStats,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'matchup_id,team_name',
          }
        );

      if (pennStateError) {
        throw pennStateError;
      }

      // Save opponent stats.
      const { error: opponentError } = await supabase
        .from('matchup_team_stats')
        .upsert(
          {
            matchup_id: matchup.id,
            team_name: opponent.team,
            ...opponentStats,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'matchup_id,team_name',
          }
        );

      if (opponentError) {
        throw opponentError;
      }

      teamsUpdated += 2;
    }

    return NextResponse.json({
      success: true,
      season,
      games: games.length,
      teamsUpdated,
    });
  } catch (error) {
    console.error('CFBD team sync error:', error);

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