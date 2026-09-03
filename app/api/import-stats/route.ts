import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const CFBD_API_KEY = process.env.CFBD_API_KEY;

const CFBD_BASE =
  "https://api.collegefootballdata.com";

const SEASONS = [2025, 2024, 2023, 2022, 2021];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const REQUEST_DELAY_MS = 150;

if (!SUPABASE_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

if (!CFBD_API_KEY) {
  throw new Error("Missing CFBD_API_KEY");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

interface Player {
  id: number;
  name: string;
  position: string | null;
  cfbd_player_id: number | null;
}

interface TeamStint {
  team: string;
  startYear: number;
  endYear: number;
}

interface CFBDPlayer {
  id: number;
  name: string;
  team?: string;
  position?: string;
  activeStartYear?: number;
  activeEndYear?: number;
  teamStints?: TeamStint[];
}

interface CFBDSeasonStat {
  season: number;
  playerId: number;
  player: string;
  position?: string;
  team: string;
  conference?: string;
  category: string;
  statType: string;
  stat: string;
}

interface ImportRow {
  player_id: number;
  cfbd_player_id: number;
  season: number;
  team: string;
  position: string | null;
  games: number;
  stats: Record<string, any>;
}

interface TeamSeasonRequest {
  team: string;
  season: number;
}

interface RequestResult<T> {
  data: T | null;
  error: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’‘`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumber(value: string): number | string {
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return value;
}

/**
 * Reliable CFBD request helper.
 *
 * Retries transient socket/network errors and 5xx responses.
 * Does NOT retry 400/401/403/404.
 */
async function cfbdFetch<T>(
  endpoint: string,
  description: string
): Promise<RequestResult<T>> {
  let lastError = "Unknown error";

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      await sleep(REQUEST_DELAY_MS);

      const response = await fetch(
        `${CFBD_BASE}${endpoint}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${CFBD_API_KEY}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data =
          (await response.json()) as T;

        return {
          data,
          error: null,
        };
      }

      const body = await response.text();

      lastError =
        `HTTP ${response.status}` +
        (body
          ? `: ${body.slice(0, 300)}`
          : "");

      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        break;
      }

      console.warn(
        `CFBD ${description} failed: ${lastError} ` +
          `(attempt ${attempt}/${MAX_RETRIES})`
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      console.warn(
        `CFBD ${description} network failure ` +
          `(attempt ${attempt}/${MAX_RETRIES}):`,
        error
      );
    }

    if (attempt < MAX_RETRIES) {
      await sleep(
        RETRY_DELAY_MS * attempt
      );
    }
  }

  return {
    data: null,
    error:
      `${description} failed after ` +
      `${MAX_RETRIES} attempts: ${lastError}`,
  };
}

/**
 * Load the authoritative Penn State roster
 * from Supabase.
 */
async function loadPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, name, position, cfbd_player_id"
    )
    .order("id", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Supabase player query failed: ${error.message}`
    );
  }

  return (data ?? []) as Player[];
}

/**
 * Retrieve historical team stints for a player.
 */
async function getPlayerHistory(
  player: Player
): Promise<RequestResult<CFBDPlayer>> {
  if (!player.cfbd_player_id) {
    return {
      data: null,
      error:
        `${player.name} has no cfbd_player_id`,
    };
  }

  const searchTerm = encodeURIComponent(
    player.name
  );

  const result =
    await cfbdFetch<CFBDPlayer[]>(
      `/player/search?searchTerm=${searchTerm}`,
      `player history for ${player.name}`
    );

  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error,
    };
  }

  const match = result.data.find(
    (candidate) =>
      candidate.id === player.cfbd_player_id
  );

  if (!match) {
    return {
      data: null,
      error:
        `CFBD ID ${player.cfbd_player_id} ` +
        `was not found for ${player.name}`,
    };
  }

  return {
    data: match,
    error: null,
  };
}

/**
 * Convert CFBD team stints into unique
 * team + season requests.
 *
 * Uses Array.from() everywhere so this works
 * with the TypeScript target used by Vercel.
 */
function buildTeamSeasonRequests(
  histories: Map<number, CFBDPlayer>
): TeamSeasonRequest[] {
  const unique =
    new Map<string, TeamSeasonRequest>();

  const historyPlayers =
    Array.from(histories.values());

  for (const player of historyPlayers) {
    const stints =
      player.teamStints ?? [];

    for (const stint of stints) {
      if (!stint.team) {
        continue;
      }

      for (const season of SEASONS) {
        if (
          season < stint.startYear ||
          season > stint.endYear
        ) {
          continue;
        }

        const team =
          stint.team.trim();

        if (!team) {
          continue;
        }

        const key =
          `${season}|${team.toLowerCase()}`;

        if (!unique.has(key)) {
          unique.set(key, {
            season,
            team,
          });
        }
      }
    }
  }

  return Array.from(
    unique.values()
  ).sort((a, b) => {
    if (a.season !== b.season) {
      return b.season - a.season;
    }

    return a.team.localeCompare(
      b.team
    );
  });
}

/**
 * Fetch all player season statistics
 * for one team and season.
 */
async function fetchSeasonStats(
  request: TeamSeasonRequest
): Promise<
  RequestResult<CFBDSeasonStat[]>
> {
  const params =
    new URLSearchParams();

  params.set(
    "year",
    String(request.season)
  );

  params.set(
    "team",
    request.team
  );

  params.set(
    "seasonType",
    "both"
  );

  return cfbdFetch<CFBDSeasonStat[]>(
    `/stats/player/season?${params.toString()}`,
    `season stats ${request.team} ${request.season}`
  );
}

/**
 * Build grouped statistics JSON for one player.
 */
function buildStatsObject(
  stats: CFBDSeasonStat[],
  cfbdPlayerId: number
): Record<string, any> {
  const result: Record<
    string,
    Record<string, number | string>
  > = {};

  const playerStats =
    stats.filter(
      (stat) =>
        stat.playerId === cfbdPlayerId
    );

  for (const stat of playerStats) {
    const category =
      stat.category || "other";

    if (!result[category]) {
      result[category] = {};
    }

    result[category][
      stat.statType
    ] = parseNumber(stat.stat);
  }

  return result;
}

/**
 * Attempt to determine games played from
 * the season statistics response.
 */
function extractGames(
  stats: CFBDSeasonStat[],
  cfbdPlayerId: number
): number {
  const playerStats =
    stats.filter(
      (stat) =>
        stat.playerId === cfbdPlayerId
    );

  const possibleGameNames = [
    "GP",
    "G",
    "Games",
    "Games Played",
  ];

  for (const stat of playerStats) {
    const matchesGameName =
      possibleGameNames.some(
        (name) =>
          name.toLowerCase() ===
          stat.statType.toLowerCase()
      );

    if (!matchesGameName) {
      continue;
    }

    const value =
      Number(stat.stat);

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      return value;
    }
  }

  return 0;
}

/**
 * Create the exact row expected by
 * player_season_stats.
 */
function buildImportRow(
  player: Player,
  cfbdPlayer: CFBDPlayer,
  season: number,
  team: string,
  stats: CFBDSeasonStat[]
): ImportRow {
  return {
    player_id: player.id,

    cfbd_player_id:
      cfbdPlayer.id,

    season,

    team,

    position:
      player.position ??
      cfbdPlayer.position ??
      null,

    games:
      extractGames(
        stats,
        cfbdPlayer.id
      ),

    stats:
      buildStatsObject(
        stats,
        cfbdPlayer.id
      ),
  };
}

/**
 * Check whether CFBD actually returned
 * useful statistics for this player.
 */
function hasUsableStats(
  row: ImportRow
): boolean {
  return Object.keys(
    row.stats
  ).length > 0;
}

/**
 * Insert rows in batches.
 */
async function insertRows(
  rows: ImportRow[]
): Promise<number> {
  const BATCH_SIZE = 100;

  let inserted = 0;

  for (
    let i = 0;
    i < rows.length;
    i += BATCH_SIZE
  ) {
    const batch =
      rows.slice(
        i,
        i + BATCH_SIZE
      );

    const { error } =
      await supabase
        .from("player_season_stats")
        .insert(batch);

    if (error) {
      throw new Error(
        `Supabase insert failed on ` +
          `batch ${Math.floor(
            i / BATCH_SIZE
          ) + 1}: ${error.message}`
      );
    }

    inserted += batch.length;

    console.log(
      `Inserted ${inserted}/${rows.length} rows`
    );
  }

  return inserted;
}

export async function GET() {
  const startedAt =
    Date.now();

  try {
    console.log(
      "======================================"
    );

    console.log(
      "Starting historical Penn State stats import"
    );

    console.log(
      "======================================"
    );

    /**
     * STEP 1
     * Load current Penn State roster.
     */

    const players =
      await loadPlayers();

    if (!players.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No players found in Supabase.",
        },
        { status: 500 }
      );
    }

    console.log(
      `Loaded ${players.length} players`
    );

    const playersWithoutCFBDId =
      players.filter(
        (player) =>
          !player.cfbd_player_id
      );

    if (
      playersWithoutCFBDId.length
    ) {
      console.warn(
        `${playersWithoutCFBDId.length} players have no CFBD ID`
      );
    }

    /**
     * STEP 2
     * Retrieve historical team stints.
     */

    const histories =
      new Map<
        number,
        CFBDPlayer
      >();

    const playerErrors: Array<{
      player_id: number;
      player: string;
      error: string;
    }> = [];

    for (
      let i = 0;
      i < players.length;
      i++
    ) {
      const player =
        players[i];

      console.log(
        `[${i + 1}/${players.length}] ` +
          `Getting history for ${player.name}`
      );

      const result =
        await getPlayerHistory(
          player
        );

      if (
        result.error ||
        !result.data
      ) {
        playerErrors.push({
          player_id:
            player.id,
          player:
            player.name,
          error:
            result.error ??
            "Unknown error",
        });

        continue;
      }

      histories.set(
        player.id,
        result.data
      );
    }

    console.log(
      `Resolved historical CFBD data for ` +
        `${histories.size}/${players.length} players`
    );

    /**
     * STEP 3
     * Build unique school/season requests.
     */

    const teamSeasonRequests =
      buildTeamSeasonRequests(
        histories
      );

    console.log(
      `Found ${teamSeasonRequests.length} ` +
        `unique team/season combinations`
    );

    /**
     * STEP 4
     * Fetch season statistics.
     */

    const statsByTeamSeason =
      new Map<
        string,
        CFBDSeasonStat[]
      >();

    const seasonErrors: Array<{
      team: string;
      season: number;
      error: string;
    }> = [];

    for (
      let i = 0;
      i < teamSeasonRequests.length;
      i++
    ) {
      const request =
        teamSeasonRequests[i];

      console.log(
        `[${i + 1}/${teamSeasonRequests.length}] ` +
          `Importing ${request.team} ${request.season}`
      );

      const result =
        await fetchSeasonStats(
          request
        );

      if (
        result.error ||
        !result.data
      ) {
        seasonErrors.push({
          team:
            request.team,
          season:
            request.season,
          error:
            result.error ??
            "Unknown error",
        });

        continue;
      }

      const key =
        `${request.season}|${request.team.toLowerCase()}`;

      statsByTeamSeason.set(
        key,
        result.data
      );
    }

    console.log(
      `Successfully fetched ` +
        `${statsByTeamSeason.size}/` +
        `${teamSeasonRequests.length} team/season requests`
    );

    /**
     * STEP 5
     * Build database rows.
     */

    const rows: ImportRow[] =
      [];

    for (const player of players) {
      const cfbdPlayer =
        histories.get(
          player.id
        );

      if (!cfbdPlayer) {
        continue;
      }

      const stints =
        cfbdPlayer.teamStints ??
        [];

      for (const stint of stints) {
        if (!stint.team) {
          continue;
        }

        for (const season of SEASONS) {
          if (
            season <
              stint.startYear ||
            season >
              stint.endYear
          ) {
            continue;
          }

          const team =
            stint.team.trim();

          if (!team) {
            continue;
          }

          const key =
            `${season}|${team.toLowerCase()}`;

          const seasonStats =
            statsByTeamSeason.get(
              key
            );

          if (!seasonStats) {
            continue;
          }

          const playerStats =
            seasonStats.filter(
              (stat) =>
                stat.playerId ===
                cfbdPlayer.id
            );

          if (
            !playerStats.length
          ) {
            continue;
          }

          const row =
            buildImportRow(
              player,
              cfbdPlayer,
              season,
              team,
              playerStats
            );

          if (
            hasUsableStats(row)
          ) {
            rows.push(row);
          }
        }
      }
    }

    /**
     * Remove accidental duplicates.
     *
     * Natural key:
     * player_id + season + team
     */

    const uniqueRows =
      new Map<
        string,
        ImportRow
      >();

    for (const row of rows) {
      const key =
        `${row.player_id}|${row.season}|${row.team.toLowerCase()}`;

      uniqueRows.set(
        key,
        row
      );
    }

    const finalRows =
      Array.from(
        uniqueRows.values()
      );

    console.log(
      `Built ${finalRows.length} database rows`
    );

    /**
     * SAFETY CHECK
     *
     * Never wipe the table if CFBD
     * produced zero rows.
     */

    if (!finalRows.length) {
      return NextResponse.json(
        {
          success: false,

          error:
            "CFBD returned no usable player statistics. Existing database rows were NOT deleted.",

          playersAvailable:
            players.length,

          playersResolved:
            histories.size,

          teamSeasonRequests:
            teamSeasonRequests.length,

          seasonRequestsSuccessful:
            statsByTeamSeason.size,

          rowsBuilt: 0,

          playerErrors,

          seasonErrors,

          durationMs:
            Date.now() -
            startedAt,
        },
        { status: 500 }
      );
    }

    /**
     * STEP 6
     * Delete existing rows for the
     * current roster.
     */

    console.log(
      "Clearing existing player_season_stats rows..."
    );

    const playerIds =
      players.map(
        (player) =>
          player.id
      );

    const {
      error: deleteError,
    } =
      await supabase
        .from(
          "player_season_stats"
        )
        .delete()
        .in(
          "player_id",
          playerIds
        );

    if (deleteError) {
      throw new Error(
        `Supabase delete failed: ${deleteError.message}`
      );
    }

    /**
     * STEP 7
     * Insert fresh historical data.
     */

    const inserted =
      await insertRows(
        finalRows
      );

    /**
     * STEP 8
     * Build summary.
     */

    const seasonSummary =
      SEASONS.map(
        (season) => {
          const seasonRows =
            finalRows.filter(
              (row) =>
                row.season ===
                season
            );

          const teams =
            Array.from(
              new Set(
                seasonRows.map(
                  (row) =>
                    row.team
                )
              )
            );

          const seasonPlayers =
            new Set(
              seasonRows.map(
                (row) =>
                  row.player_id
              )
            );

          return {
            season,

            rows:
              seasonRows.length,

            players:
              seasonPlayers.size,

            teams,
          };
        }
      );

    const transferRows =
      finalRows.filter(
        (row) =>
          row.team.toLowerCase() !==
          "penn state"
      );

    console.log(
      "======================================"
    );

    console.log(
      "Historical import complete"
    );

    console.log(
      `Inserted ${inserted} rows`
    );

    console.log(
      `Transfer-school rows: ${transferRows.length}`
    );

    console.log(
      "======================================"
    );

    return NextResponse.json({
      success: true,

      team: "Penn State",

      seasons: SEASONS,

      playersAvailable:
        players.length,

      playersResolved:
        histories.size,

      playersWithStats:
        new Set(
          finalRows.map(
            (row) =>
              row.player_id
          )
        ).size,

      rowsImported:
        inserted,

      teamSeasonRequests:
        teamSeasonRequests.length,

      seasonRequestsSuccessful:
        statsByTeamSeason.size,

      transferRows:
        transferRows.length,

      seasonSummary,

      playerErrors,

      seasonErrors,

      durationMs:
        Date.now() -
        startedAt,

      note:
        "Statistics are stored in the stats JSON/JSONB column. Historical transfer-school seasons are stored as separate rows from Penn State seasons.",
    });
  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "Historical import failed:"
    );

    console.error(error);

    console.error(
      "======================================"
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

        durationMs:
          Date.now() -
          startedAt,
      },
      { status: 500 }
    );
  }
}