import { createClient } from '@supabase/supabase-js';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CFBD_API_KEY) {
  throw new Error('Missing CFBD_API_KEY');
}

if (!SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const CFBD_BASE_URL =
  'https://api.collegefootballdata.com';

const TEAM = 'Penn State';

// Completed seasons only.
// The newer historical importer in /api/import-stats
// is responsible for the broader historical data.
const SEASONS = [2024, 2025];

interface CFBDStat {
  name: string;
  types: {
    name: string;
    athletes: {
      id: string;
      name: string;
      stat: string;
    }[];
  }[];
}

interface CFBDTeam {
  team: string;
  conference: string | null;
  points: number;
  categories: CFBDStat[];
}

interface CFBDGamePlayers {
  id: number;
  teams: CFBDTeam[];
}

interface PlayerRecord {
  id: number;
  name: string;
  cfbd_player_id?: string | null;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function cfbdFetch<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<T> {
  const url = new URL(
    `${CFBD_BASE_URL}${endpoint}`
  );

  Object.entries(params).forEach(
    ([key, value]) => {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  );

  const response = await fetch(
    url.toString(),
    {
      headers: {
        Authorization:
          `Bearer ${CFBD_API_KEY}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `CFBD ${response.status}: ${body}`
    );
  }

  return response.json();
}

async function getPlayers(): Promise<
  PlayerRecord[]
> {
  const { data, error } =
    await supabase
      .from('players')
      .select(
        'id, name, cfbd_player_id'
      );

  if (error) {
    throw new Error(
      `Supabase players error: ${error.message}`
    );
  }

  return data || [];
}

async function getPennStateGames(
  season: number
): Promise<number[]> {
  const games =
    await cfbdFetch<
      {
        id: number;
        completed: boolean;
        season: number;
        homeTeam: string;
        awayTeam: string;
      }[]
    >(
      '/games',
      {
        year: season,
        team: TEAM,
        seasonType: 'both',
      }
    );

  return games
    .filter(
      (game) =>
        game.completed &&
        (
          game.homeTeam === TEAM ||
          game.awayTeam === TEAM
        )
    )
    .map(
      (game) => game.id
    );
}

async function importSeason(
  season: number,
  players: PlayerRecord[]
) {
  console.log(
    `\n================================`
  );

  console.log(
    `Importing ${season}`
  );

  console.log(
    `================================\n`
  );

  const games =
    await getPennStateGames(
      season
    );

  console.log(
    `Found ${games.length} completed Penn State games.`
  );

  const playerMap =
    new Map<
      string,
      PlayerRecord
    >();

  players.forEach(
    (player) => {
      playerMap.set(
        normalizeName(
          player.name
        ),
        player
      );
    }
  );

  const seasonTotals =
    new Map<
      number,
      {
        cfbd_player_id: string;
        name: string;
        games: Set<number>;
        stats: Record<
          string,
          Record<string, string>
        >;
      }
    >();

  for (const gameId of games) {
    console.log(
      `Processing game ${gameId}...`
    );

    const gameData =
      await cfbdFetch<
        CFBDGamePlayers[]
      >(
        '/games/players',
        {
          id: gameId,
        }
      );

    for (const game of gameData) {
      for (const team of game.teams) {
        if (team.team !== TEAM) {
          continue;
        }

        for (
          const category
          of team.categories
        ) {
          for (
            const type
            of category.types
          ) {
            for (
              const athlete
              of type.athletes
            ) {
              const normalized =
                normalizeName(
                  athlete.name
                );

              const player =
                playerMap.get(
                  normalized
                );

              if (!player) {
                continue;
              }

              let record =
                seasonTotals.get(
                  player.id
                );

              if (!record) {
                record = {
                  cfbd_player_id:
                    athlete.id,
                  name:
                    athlete.name,
                  games:
                    new Set<number>(),
                  stats: {},
                };

                seasonTotals.set(
                  player.id,
                  record
                );
              }

              record.games.add(
                gameId
              );

              if (
                !record.stats[
                  category.name
                ]
              ) {
                record.stats[
                  category.name
                ] = {};
              }

              const existing =
                Number(
                  record.stats[
                    category.name
                  ][type.name]
                ) || 0;

              const value =
                Number(
                  athlete.stat
                ) || 0;

              record.stats[
                category.name
              ][type.name] =
                String(
                  existing + value
                );
            }
          }
        }
      }
    }
  }

  console.log(
    `Found statistics for ${seasonTotals.size} players.`
  );

  /*
   * IMPORTANT:
   * Use Array.from() here instead of directly
   * iterating the Map. This prevents the Vercel
   * TypeScript downlevelIteration build error.
   */
  for (
    const [
      playerId,
      record
    ] of Array.from(
      seasonTotals.entries()
    )
  ) {
    const player =
      players.find(
        (p) =>
          p.id === playerId
      );

    if (!player) {
      continue;
    }

    const { error } =
      await supabase
        .from(
          'player_season_stats'
        )
        .upsert(
          {
            player_id:
              player.id,

            cfbd_player_id:
              record.cfbd_player_id,

            season,

            team: TEAM,

            position: '',

            games:
              record.games.size,

            stats:
              record.stats,
          },
          {
            onConflict:
              'player_id,season',
          }
        );

    if (error) {
      console.error(
        `Failed to save ${player.name}:`,
        error.message
      );
    } else {
      console.log(
        `✓ ${player.name} — ${record.games.size} games`
      );
    }
  }
}

async function main() {
  console.log(
    'Penn State Player Stats Importer'
  );

  const players =
    await getPlayers();

  console.log(
    `Found ${players.length} players in Supabase.`
  );

  for (
    const season of SEASONS
  ) {
    await importSeason(
      season,
      players
    );
  }

  console.log(
    '\nImport complete.'
  );
}

main().catch(
  (error) => {
    console.error(
      '\nIMPORT FAILED\n'
    );

    console.error(
      error
    );

    process.exit(1);
  }
);