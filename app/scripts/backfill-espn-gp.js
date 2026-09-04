const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const ESPN_SEARCH_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/athletes";

const ESPN_CORE_URL =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.'’`]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);

  if (x === y) return true;

  const xParts = x.split(" ");
  const yParts = y.split(" ");

  if (
    xParts.length >= 2 &&
    yParts.length >= 2 &&
    xParts[0] === yParts[0] &&
    xParts[xParts.length - 1] === yParts[yParts.length - 1]
  ) {
    return true;
  }

  return false;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN request failed ${response.status}: ${url}`
    );
  }

  return response.json();
}

/**
 * Search ESPN for a player.
 *
 * ESPN's public endpoints aren't an official documented API,
 * so we try the global search endpoint first and then fall back
 * to the college-football athlete search.
 */
async function findEspnPlayer(player) {
  const searchUrl =
    `https://site.web.api.espn.com/apis/search/v2` +
    `?query=${encodeURIComponent(player.name)}` +
    `&limit=20`;

  try {
    const data = await fetchJson(searchUrl);

    const results = data?.results || [];

    for (const result of results) {
      const athlete =
        result?.contents?.find?.(
          (item) =>
            item?.type === "athlete" ||
            item?.type === "player"
        ) ||
        result?.athlete;

      if (!athlete) continue;

      const athleteName =
        athlete.displayName ||
        athlete.fullName ||
        athlete.name;

      const athleteId =
        athlete.id ||
        athlete.uid?.split(":").pop();

      if (
        athleteId &&
        athleteName &&
        namesMatch(player.name, athleteName)
      ) {
        return {
          id: String(athleteId),
          name: athleteName,
        };
      }
    }
  } catch (error) {
    console.log(
      `Search endpoint failed for ${player.name}: ${error.message}`
    );
  }

  /*
   * Fallback: search the ESPN college football athlete index.
   */
  try {
    const url =
      `${ESPN_CORE_URL}/athletes` +
      `?limit=1000` +
      `&lastName=${encodeURIComponent(
        player.name.split(" ").slice(-1)[0]
      )}`;

    const data = await fetchJson(url);

    const items = data?.items || [];

    for (const item of items) {
      const athlete = item;

      const athleteName =
        athlete.displayName ||
        athlete.fullName ||
        athlete.name;

      const athleteId = athlete.id;

      if (
        athleteId &&
        athleteName &&
        namesMatch(player.name, athleteName)
      ) {
        return {
          id: String(athleteId),
          name: athleteName,
        };
      }
    }
  } catch (error) {
    console.log(
      `Fallback search failed for ${player.name}: ${error.message}`
    );
  }

  return null;
}

/**
 * Get a player's game log for a specific season.
 */
async function getGameLog(espnId, season) {
  const url =
    `${ESPN_CORE_URL}/seasons/${season}` +
    `/athletes/${espnId}/statisticslog`;

  const data = await fetchJson(url);

  return data;
}

/**
 * Extract game entries from ESPN's statistics log.
 *
 * ESPN's response structure can vary, so we look recursively
 * for objects that represent actual games/events.
 */
function extractGames(data) {
  const games = [];

  function walk(value) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }

    /*
     * A statistics-log entry normally has an event reference
     * or event ID. We use that as the unique game identifier.
     */
    const eventId =
      value.eventId ||
      value.event?.id ||
      value.event?.$ref?.match?.(/events\/(\d+)/)?.[1];

    if (eventId) {
      games.push({
        eventId: String(eventId),
        raw: value,
      });
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        walk(child);
      }
    }
  }

  walk(data);

  const unique = new Map();

  for (const game of games) {
    if (!unique.has(game.eventId)) {
      unique.set(game.eventId, game);
    }
  }

  return Array.from(unique.values());
}

async function updatePlayerEspnId(playerId, espnId) {
  const { error } = await supabase
    .from("players")
    .update({
      espn_player_id: espnId,
    })
    .eq("id", playerId);

  if (error) {
    throw new Error(
      `Supabase player update failed: ${error.message}`
    );
  }
}

async function updateGames(playerId, season, games) {
  const { data: existingRows, error: existingError } =
    await supabase
      .from("player_season_stats")
      .select("id")
      .eq("player_id", playerId)
      .eq("season", season);

  if (existingError) {
    throw new Error(
      `Could not find season row: ${existingError.message}`
    );
  }

  /*
   * If there is no player_season_stats row yet, create one.
   */
  if (!existingRows || existingRows.length === 0) {
    const { error } = await supabase
      .from("player_season_stats")
      .insert({
        player_id: playerId,
        season,
        games,
      });

    if (error) {
      throw new Error(
        `Could not insert season row: ${error.message}`
      );
    }

    return;
  }

  /*
   * Normally there should only be one row per player/season.
   * Update every matching row just in case.
   */
  const { error } = await supabase
    .from("player_season_stats")
    .update({
      games,
      updated_at: new Date().toISOString(),
    })
    .eq("player_id", playerId)
    .eq("season", season);

  if (error) {
    throw new Error(
      `Could not update GP: ${error.message}`
    );
  }
}

async function main() {
  console.log("======================================");
  console.log(" ESPN → Supabase GP BACKFILL");
  console.log("======================================");
  console.log("");

  /*
   * Get Penn State players.
   */
  const { data: players, error: playersError } =
    await supabase
      .from("players")
      .select(
        "id,name,espn_player_id"
      )
      .order("id");

  if (playersError) {
    throw new Error(
      `Could not load players: ${playersError.message}`
    );
  }

  console.log(`Found ${players.length} players.`);
  console.log("");

  /*
   * Get the seasons that already exist in your stats table.
   *
   * This means we only backfill seasons you already have.
   */
  const { data: seasonRows, error: seasonError } =
    await supabase
      .from("player_season_stats")
      .select("player_id,season")
      .order("season");

  if (seasonError) {
    throw new Error(
      `Could not load seasons: ${seasonError.message}`
    );
  }

  const seasonsByPlayer = new Map();

  for (const row of seasonRows) {
    if (!seasonsByPlayer.has(row.player_id)) {
      seasonsByPlayer.set(row.player_id, new Set());
    }

    seasonsByPlayer
      .get(row.player_id)
      .add(Number(row.season));
  }

  /*
   * ==========================================
   * STEP 1 — ESPN ID MATCHING
   * ==========================================
   */

  console.log("STEP 1: Matching players to ESPN");
  console.log("--------------------------------------");

  for (const player of players) {
    if (player.espn_player_id) {
      console.log(
        `✓ ${player.name} already has ESPN ID ${player.espn_player_id}`
      );
      continue;
    }

    console.log(`Searching ESPN for ${player.name}...`);

    const match = await findEspnPlayer(player);

    if (!match) {
      console.log(
        `⚠ NO MATCH: ${player.name}`
      );
      console.log("");
      continue;
    }

    await updatePlayerEspnId(
      player.id,
      match.id
    );

    player.espn_player_id = match.id;

    console.log(
      `✓ ${player.name} → ${match.name} (${match.id})`
    );

    await sleep(250);
  }

  console.log("");
  console.log("ESPN ID matching complete.");
  console.log("");

  /*
   * ==========================================
   * STEP 2 — GP BACKFILL
   * ==========================================
   */

  console.log("STEP 2: Backfilling games played");
  console.log("--------------------------------------");

  for (const player of players) {
    if (!player.espn_player_id) {
      console.log(
        `⚠ Skipping ${player.name}: no ESPN ID`
      );
      continue;
    }

    const seasons =
      Array.from(
        seasonsByPlayer.get(player.id) || []
      );

    if (seasons.length === 0) {
      console.log(
        `⚠ ${player.name}: no player_season_stats rows`
      );
      continue;
    }

    for (const season of seasons) {
      console.log(
        `${player.name} — ${season}`
      );

      try {
        const data = await getGameLog(
          player.espn_player_id,
          season
        );

        const games = extractGames(data);

        const gp = games.length;

        console.log(
          `   ESPN games found: ${gp}`
        );

        await updateGames(
          player.id,
          season,
          gp
        );

        console.log(
          `   ✓ Supabase GP updated to ${gp}`
        );
      } catch (error) {
        console.log(
          `   ⚠ Failed: ${error.message}`
        );
      }

      await sleep(250);
    }
  }

  console.log("");
  console.log("======================================");
  console.log(" DONE");
  console.log("======================================");
}

main().catch((error) => {
  console.error("");
  console.error("FATAL ERROR:");
  console.error(error);
  process.exit(1);
});