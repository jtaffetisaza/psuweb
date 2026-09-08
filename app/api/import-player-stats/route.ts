import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CFBD_BASE = 'https://api.collegefootballdata.com';
const TEAM = 'Penn State';
const SEASONS = [2026];

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  completed: boolean;
  homeTeam: string;
  awayTeam: string;
}

interface CFBDPlayerStats {
  id: number;
  name: string;
  position?: string;
  team?: string;
  categories: {
    category: string;
    types: {
      type: string;
      stat: string;
    }[];
  }[];
}

interface PlayerRow {
  id: number;
  name: string;
  position: string | null;
  cfbd_player_id: string | null;
}

interface ExistingStatsRow {
  player_id: number;
  games: number | null;
  stats: Record<string, any> | null;
}

interface PlayerRecord {
  playerId: number;
  cfbdPlayerId: string | null;
  name: string;
  position: string | null;
  games: Set<number>;
  stats: Record<string, any>;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function parseStatValue(value: string): number {
  if (!value) return 0;

  const match = value.match(/-?\d+(\.\d+)?/);

  if (!match) return 0;

  return Number(match[0]);
}

async function cfbdFetch<T>(
  endpoint: string,
  apiKey: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${CFBD_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `CFBD ${response.status} ${response.statusText}: ${body}`
    );
  }

  return response.json();
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = request.headers.get('authorization');

      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const cfbdApiKey = process.env.CFBD_API_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }

    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    if (!cfbdApiKey) {
      throw new Error('Missing CFBD_API_KEY');
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    const results = [];

    for (const season of SEASONS) {
      console.log(
        `Starting ${season} player stats import...`
      );

      // Get Penn State games for the season.
      const games = await cfbdFetch<CFBDGame[]>(
        '/games',
        cfbdApiKey,
        {
          year: String(season),
          team: TEAM,
          seasonType: 'both',
        }
      );

      const completedGames = games.filter(
        (game) =>
          game.completed &&
          (game.homeTeam === TEAM ||
            game.awayTeam === TEAM)
      );

      console.log(
        `Found ${completedGames.length} completed Penn State games for ${season}`
      );

      if (completedGames.length === 0) {
        results.push({
          season,
          completedGames: 0,
          newGames: 0,
          players: 0,
          status: 'no_completed_games',
        });

        continue;
      }

      // Load Penn State roster.
      const {
        data: players,
        error: playersError,
      } = await supabase
        .from('players')
        .select(
          'id, name, position, cfbd_player_id'
        );

      if (playersError) {
        throw new Error(
          `Failed to load players: ${playersError.message}`
        );
      }

      const playerRows =
        (players || []) as PlayerRow[];

      const playersByCfbdId =
        new Map<string, PlayerRow>();

      const playersByName =
        new Map<string, PlayerRow>();

      for (const player of playerRows) {
        if (player.cfbd_player_id) {
          playersByCfbdId.set(
            String(player.cfbd_player_id),
            player
          );
        }

        playersByName.set(
          normalizeName(player.name),
          player
        );
      }

      // Load existing season stats.
      const {
        data: existingStats,
        error: existingStatsError,
      } = await supabase
        .from('player_season_stats')
        .select(
          'player_id, games, stats'
        )
        .eq('season', season)
        .eq('team', TEAM);

      if (existingStatsError) {
        throw new Error(
          `Failed to check existing stats: ${existingStatsError.message}`
        );
      }

      const existingRows =
        (existingStats || []) as ExistingStatsRow[];

      // Determine which games have already been imported.
      const importedGameIds =
        new Set<number>();

      for (const row of existingRows) {
        const stats = row.stats;

        if (
          stats &&
          typeof stats === 'object' &&
          !Array.isArray(stats)
        ) {
          const ids =
            stats._imported_game_ids;

          if (Array.isArray(ids)) {
            for (const id of ids) {
              const numericId = Number(id);

              if (!Number.isNaN(numericId)) {
                importedGameIds.add(
                  numericId
                );
              }
            }
          }
        }
      }

      const newGames =
        completedGames.filter(
          (game) =>
            !importedGameIds.has(game.id)
        );

      console.log(
        `Previously imported games: ${importedGameIds.size}`
      );

      console.log(
        `New games to import: ${newGames.length}`
      );

      // Nothing new to import.
      if (newGames.length === 0) {
        results.push({
          season,
          completedGames:
            completedGames.length,
          previouslyImportedGames:
            importedGameIds.size,
          newGames: 0,
          players: existingRows.length,
          status: 'already_up_to_date',
        });

        continue;
      }

      // Build existing player totals.
      const playerRecords =
        new Map<number, PlayerRecord>();

      for (const row of existingRows) {
        const player = playerRows.find(
          (p) => p.id === row.player_id
        );

        if (!player) continue;

        const existingStatsObject =
          row.stats &&
          typeof row.stats === 'object' &&
          !Array.isArray(row.stats)
            ? { ...row.stats }
            : {};

        delete existingStatsObject
          ._imported_game_ids;

        const record: PlayerRecord = {
          playerId: player.id,
          cfbdPlayerId:
            player.cfbd_player_id,
          name: player.name,
          position: player.position,
          games: new Set<number>(),
          stats: existingStatsObject,
        };

        const existingGames =
          Number(row.games) || 0;

        for (
          let i = 0;
          i < existingGames;
          i++
        ) {
          record.games.add(
            -(i + 1)
          );
        }

        playerRecords.set(
          player.id,
          record
        );
      }

      /*
       * Fetch player stats ONLY for games we haven't imported.
       */
      for (const game of newGames) {
        console.log(
          `Fetching player stats for game ${game.id}: ${game.homeTeam} vs ${game.awayTeam}`
        );

        const gamePlayers =
          await cfbdFetch<CFBDPlayerStats[]>(
            '/games/players',
            cfbdApiKey,
            {
              year: String(season),
              gameId: String(game.id),
            }
          );

        if (!Array.isArray(gamePlayers)) {
          continue;
        }

        for (const athlete of gamePlayers) {
          if (!athlete?.name) {
            continue;
          }

          let player:
            | PlayerRow
            | undefined;

          // Match by CFBD ID first.
          if (
            athlete.id !== undefined
          ) {
            player =
              playersByCfbdId.get(
                String(athlete.id)
              );
          }

          // Fall back to name.
          if (!player) {
            player =
              playersByName.get(
                normalizeName(
                  athlete.name
                )
              );
          }

          if (!player) {
            continue;
          }

          let record =
            playerRecords.get(
              player.id
            );

          if (!record) {
            record = {
              playerId: player.id,
              cfbdPlayerId:
                player.cfbd_player_id ||
                (athlete.id !== undefined
                  ? String(athlete.id)
                  : null),
              name: player.name,
              position: player.position,
              games: new Set<number>(),
              stats: {},
            };

            playerRecords.set(
              player.id,
              record
            );
          }

          record.games.add(
            game.id
          );

          for (
            const category of
            athlete.categories || []
          ) {
            if (
              !category?.category
            ) {
              continue;
            }

            if (
              !record.stats[
                category.category
              ]
            ) {
              record.stats[
                category.category
              ] = {};
            }

            for (
              const statType of
              category.types || []
            ) {
              if (
                !statType?.type
              ) {
                continue;
              }

              const value =
                parseStatValue(
                  statType.stat
                );

              if (
                !record.stats[
                  category.category
                ][statType.type]
              ) {
                record.stats[
                  category.category
                ][statType.type] = 0;
              }

              record.stats[
                category.category
              ][statType.type] +=
                value;
            }
          }
        }
      }

      /*
       * Build the complete list of imported game IDs.
       *
       * IMPORTANT:
       * Do not use the spread operator on Set because the
       * project's TypeScript target does not support it.
       */
      const allImportedGameIds =
        Array.from(
          importedGameIds
        );

      for (const game of newGames) {
        if (
          !allImportedGameIds.includes(
            game.id
          )
        ) {
          allImportedGameIds.push(
            game.id
          );
        }
      }

      allImportedGameIds.sort(
        (a, b) => a - b
      );

      /*
       * Build Supabase rows.
       */
      const rows =
        Array.from(
          playerRecords.values()
        ).map((record) => ({
          player_id:
            record.playerId,

          cfbd_player_id:
            record.cfbdPlayerId,

          season,

          team: TEAM,

          position:
            record.position,

          games:
            record.games.size,

          stats: {
            ...record.stats,

            _imported_game_ids:
              allImportedGameIds,
          },

          updated_at:
            new Date().toISOString(),
        }));

      /*
       * Upsert player totals.
       */
      if (rows.length > 0) {
        const {
          error: upsertError,
        } = await supabase
          .from('player_season_stats')
          .upsert(rows, {
            onConflict:
              'player_id,season',
          });

        if (upsertError) {
          throw new Error(
            `Failed to upsert player stats: ${upsertError.message}`
          );
        }
      }

      results.push({
        season,

        completedGames:
          completedGames.length,

        previouslyImportedGames:
          importedGameIds.size,

        newGames:
          newGames.length,

        players:
          rows.length,

        status: 'success',
      });

      console.log(
        `Finished ${season}: ${newGames.length} new games imported, ${rows.length} player totals updated`
      );
    }

    return NextResponse.json({
      success: true,
      timestamp:
        new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error(
      'Player stats import failed:',
      error
    );

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