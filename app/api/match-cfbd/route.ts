import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CFBDPlayer = {
  id: string;
  firstName?: string;
  lastName?: string;
  team?: string;
  position?: string;
  year?: number;
};

type MatchResult = {
  id: number;
  name: string;
  position: string | null;
  status: 'matched' | 'review' | 'no_match' | 'error';
  cfbd_player_id?: number;
  cfbd_name?: string;
  cfbd_position?: string;
  score?: number;
  reason?: string;
};

function normalize(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getNameParts(name: string) {
  const cleaned = String(name || '')
    .replace(/[.,]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleaned.length === 0) {
    return {
      first: '',
      last: '',
      full: '',
    };
  }

  return {
    first: normalize(cleaned[0]),
    last: normalize(cleaned[cleaned.length - 1]),
    full: normalize(cleaned.join(' ')),
  };
}

function removeSuffix(name: string): string {
  return normalize(name)
    .replace(/(jr|sr|ii|iii|iv|v)$/i, '');
}

function normalizePosition(position: string | null | undefined): string {
  const p = String(position || '').toUpperCase().trim();

  const groups: Record<string, string[]> = {
    QB: ['QB'],
    RB: ['RB', 'HB', 'FB'],
    WR: ['WR'],
    TE: ['TE'],
    OL: ['OL', 'OT', 'OG', 'C', 'OC', 'G', 'T'],
    DT: ['DT', 'NT', 'DL'],
    DE: ['DE', 'EDGE'],
    LB: ['LB', 'ILB', 'OLB'],
    CB: ['CB'],
    S: ['S', 'SAF', 'DB'],
    K: ['K', 'PK'],
    P: ['P'],
    LS: ['LS'],
  };

  for (const [canonical, values] of Object.entries(groups)) {
    if (values.includes(p)) {
      return canonical;
    }
  }

  return p;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;

  if (a === b) return 1;

  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

function calculateMatchScore(
  ourName: string,
  ourPosition: string | null | undefined,
  candidate: CFBDPlayer
) {
  const ours = getNameParts(ourName);

  const candidateFirst = normalize(candidate.firstName);
  const candidateLast = normalize(candidate.lastName);

  const candidateFull = normalize(
    `${candidate.firstName || ''} ${candidate.lastName || ''}`
  );

  const ourFull = ours.full;

  /*
   * Also compare names with suffixes removed.
   *
   * Example:
   * Quinton Martin Jr.
   * Quinton Martin
   *
   * become:
   * quintonmartin
   */
  const ourWithoutSuffix = removeSuffix(ourFull);
  const candidateWithoutSuffix = removeSuffix(candidateFull);

  const firstSimilarity = similarity(
    ours.first,
    candidateFirst
  );

  const lastSimilarity = similarity(
    removeSuffix(ours.last),
    removeSuffix(candidateLast)
  );

  const fullSimilarity = similarity(
    ourWithoutSuffix,
    candidateWithoutSuffix
  );

  const firstExact = ours.first === candidateFirst;
  const lastExact =
    removeSuffix(ours.last) === removeSuffix(candidateLast);

  const fullExact =
    ourWithoutSuffix === candidateWithoutSuffix;

  /*
   * Your position is authoritative.
   *
   * Position agreement gives a bonus.
   * Position disagreement does NOT disqualify the match.
   */
  const ourPositionNormalized = normalizePosition(ourPosition);
  const cfbdPositionNormalized = normalizePosition(
    candidate.position
  );

  const positionMatches =
    ourPositionNormalized &&
    cfbdPositionNormalized &&
    ourPositionNormalized === cfbdPositionNormalized;

  let score = 0;

  /*
   * Exact full name after suffix normalization.
   * This is extremely strong.
   */
  if (fullExact) {
    score = 100;
  } else {
    /*
     * Weighted fuzzy name score.
     */
    score =
      firstSimilarity * 35 +
      lastSimilarity * 45 +
      fullSimilarity * 20;
  }

  /*
   * Exact first + last names are a huge confidence boost.
   */
  if (firstExact && lastExact) {
    score += 10;
  }

  /*
   * Matching position is additional evidence.
   *
   * But importantly:
   * a position mismatch does NOT subtract points.
   *
   * Your position remains the truth.
   */
  if (positionMatches) {
    score += 5;
  }

  return {
    score,
    firstExact,
    lastExact,
    fullExact,
    positionMatches,
  };
}

async function fetchRoster(
  year: number
): Promise<CFBDPlayer[]> {
  const response = await fetch(
    `https://api.collegefootballdata.com/roster?team=Penn%20State&year=${year}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      `CFBD roster ${year} error ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      `CFBD returned an unexpected roster response for ${year}.`
    );
  }

  return data;
}

export async function GET() {
  try {
    /*
     * ============================================================
     * 1. Get our roster
     * ============================================================
     */
    const { data: players, error: playersError } =
      await supabase
        .from('players')
        .select('id, name, position, cfbd_player_id')
        .order('id', { ascending: true });

    if (playersError) {
      throw new Error(
        `Supabase error: ${playersError.message}`
      );
    }

    if (!players || players.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No players found in Supabase.',
      });
    }

    /*
     * ============================================================
     * 2. Pull multiple Penn State rosters.
     *
     * 2026 catches the current roster.
     * 2025/2024/2023 help catch players whose CFBD record
     * isn't represented exactly the same way in 2026.
     *
     * Four API calls total.
     * ============================================================
     */
    const years = [2026, 2025, 2024, 2023];

    const rosterResults = await Promise.all(
      years.map(async (year) => {
        try {
          const roster = await fetchRoster(year);

          return {
            year,
            roster,
            error: null,
          };
        } catch (error) {
          return {
            year,
            roster: [],
            error:
              error instanceof Error
                ? error.message
                : 'Unknown error',
          };
        }
      })
    );

    /*
     * ============================================================
     * 3. Combine rosters.
     *
     * Same CFBD ID appearing in multiple seasons is only stored
     * once.
     * ============================================================
     */
    const allPlayers = new Map<string, CFBDPlayer>();

    for (const result of rosterResults) {
      for (const player of result.roster) {
        if (!player.id) continue;

        if (!allPlayers.has(String(player.id))) {
          allPlayers.set(String(player.id), player);
        }
      }
    }

    const cfbdPlayers = Array.from(allPlayers.values());

    /*
     * ============================================================
     * 4. Match every player.
     * ============================================================
     */
    const results: MatchResult[] = [];

    for (const player of players) {
      const candidates = cfbdPlayers
        .map((candidate) => {
          const match = calculateMatchScore(
            player.name,
            player.position,
            candidate
          );

          return {
            candidate,
            ...match,
          };
        })
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      const secondBest = candidates[1];

      if (!best) {
        results.push({
          id: player.id,
          name: player.name,
          position: player.position,
          status: 'no_match',
          reason: 'No CFBD candidates found',
        });

        continue;
      }

      const bestCandidate = best.candidate;

      /*
       * Difference between first and second-best candidate.
       *
       * We want a clear winner before automatically writing
       * a fuzzy match.
       */
      const scoreGap = secondBest
        ? best.score - secondBest.score
        : 999;

      /*
       * ==========================================================
       * AUTO-MATCH RULES
       * ==========================================================
       *
       * Rule 1:
       * Exact name after suffix normalization.
       *
       * Example:
       * Quinton Martin Jr.
       * Quinton Martin
       *
       * Rule 2:
       * Very high fuzzy score + reasonable separation from
       * the second-best candidate.
       *
       * Rule 3:
       * Strong first/last match even if CFBD position differs.
       *
       * YOUR POSITION IS NEVER MODIFIED.
       */
      const exactName =
        best.fullExact ||
        (best.firstExact && best.lastExact);

      const strongFuzzy =
        best.score >= 88 &&
        scoreGap >= 8;

      const strongName =
        best.firstExact &&
        best.lastExact &&
        best.score >= 95;

      const shouldMatch =
        exactName ||
        strongFuzzy ||
        strongName;

      if (shouldMatch) {
        const cfbdId = Number(bestCandidate.id);

        if (Number.isNaN(cfbdId)) {
          results.push({
            id: player.id,
            name: player.name,
            position: player.position,
            status: 'error',
            reason: `Invalid CFBD ID: ${bestCandidate.id}`,
          });

          continue;
        }

        /*
         * IMPORTANT:
         * Only update cfbd_player_id.
         *
         * We NEVER update:
         * - name
         * - position
         * - number
         * - height
         * - weight
         * - any other roster information
         */
        const { error: updateError } = await supabase
          .from('players')
          .update({
            cfbd_player_id: cfbdId,
          })
          .eq('id', player.id);

        if (updateError) {
          results.push({
            id: player.id,
            name: player.name,
            position: player.position,
            status: 'error',
            reason: updateError.message,
          });

          continue;
        }

        results.push({
          id: player.id,
          name: player.name,
          position: player.position,
          status: 'matched',
          cfbd_player_id: cfbdId,
          cfbd_name: `${bestCandidate.firstName || ''} ${
            bestCandidate.lastName || ''
          }`.trim(),
          cfbd_position: bestCandidate.position,
          score: Math.round(best.score * 100) / 100,
        });
      } else {
        /*
         * Don't guess.
         *
         * Return the best candidate so we can inspect it.
         */
        results.push({
          id: player.id,
          name: player.name,
          position: player.position,
          status: 'review',
          cfbd_player_id: Number(bestCandidate.id),
          cfbd_name: `${bestCandidate.firstName || ''} ${
            bestCandidate.lastName || ''
          }`.trim(),
          cfbd_position: bestCandidate.position,
          score: Math.round(best.score * 100) / 100,
          reason: `Best candidate was not sufficiently distinct (gap ${Math.round(
            scoreGap * 100
          ) / 100})`,
        });
      }
    }

    /*
     * ============================================================
     * 5. Summary
     * ============================================================
     */
    const summary = {
      totalPlayers: players.length,
      cfbdPlayersFound: cfbdPlayers.length,
      rosterYearsSearched: years,

      matched: results.filter(
        (r) => r.status === 'matched'
      ).length,

      review: results.filter(
        (r) => r.status === 'review'
      ).length,

      noMatch: results.filter(
        (r) => r.status === 'no_match'
      ).length,

      errors: results.filter(
        (r) => r.status === 'error'
      ).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error('CFBD matcher error:', error);

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