'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Player {
  id: number;
  number?: number;
  jersey_number?: number;
  jersey?: number;
  name: string;
  position: string;
  eligibility: string;
  height: string;
  weight: number;
  hometown: string;
  high_school: string;
  previous_school: string;
  notes: string;
  depth_rank: number;
  star_rating?: number;
  composite_rating?: number;
  cfbd_player_id?: string | null;
}

interface SeasonStats {
  id: number;
  player_id: number;
  cfbd_player_id: string;
  season: number;
  team: string;
  position: string;
  games: number;
  stats: Record<
    string,
    Record<string, string>
  >;
}

type StatDefinition = {
  label: string;
  category: string;
  names: string[];
  type?: 'number' | 'percent' | 'decimal';
};

const STAT_DEFINITIONS: Record<
  string,
  StatDefinition[]
> = {
  QB: [
    {
      label: 'CMP',
      category: 'passing',
      names: ['C', 'CMP', 'Completions'],
    },
    {
      label: 'ATT',
      category: 'passing',
      names: ['A', 'ATT', 'Attempts'],
    },
    {
      label: 'CMP%',
      category: 'passing',
      names: ['Pct', 'Completion %'],
      type: 'percent',
    },
    {
      label: 'YDS',
      category: 'passing',
      names: ['YDS', 'Yards', 'Passing Yards'],
    },
    {
      label: 'YPA',
      category: 'passing',
      names: ['YPA', 'Yards Per Attempt'],
      type: 'decimal',
    },
    {
      label: 'TD',
      category: 'passing',
      names: ['TD', 'Touchdowns', 'Passing TD'],
    },
    {
      label: 'INT',
      category: 'passing',
      names: ['INT', 'Interceptions'],
    },
    {
      label: 'LONG',
      category: 'passing',
      names: ['LONG', 'Long'],
    },
  ],

  RB: [
    {
      label: 'CAR',
      category: 'rushing',
      names: ['CAR', 'Carries', 'Rushing Attempts'],
    },
    {
      label: 'YDS',
      category: 'rushing',
      names: ['YDS', 'Yards', 'Rushing Yards'],
    },
    {
      label: 'YPC',
      category: 'rushing',
      names: ['YPC', 'Yards Per Carry'],
      type: 'decimal',
    },
    {
      label: 'TD',
      category: 'rushing',
      names: ['TD', 'Touchdowns', 'Rushing TD'],
    },
    {
      label: 'LONG',
      category: 'rushing',
      names: ['LONG', 'Long'],
    },
    {
      label: 'REC',
      category: 'receiving',
      names: ['REC', 'Receptions'],
    },
    {
      label: 'REC YDS',
      category: 'receiving',
      names: ['YDS', 'Yards', 'Receiving Yards'],
    },
    {
      label: 'REC TD',
      category: 'receiving',
      names: ['TD', 'Touchdowns', 'Receiving TD'],
    },
  ],

  WR: [
    {
      label: 'REC',
      category: 'receiving',
      names: ['REC', 'Receptions'],
    },
    {
      label: 'TGTS',
      category: 'receiving',
      names: ['TGTS', 'Targets', 'TGT'],
    },
    {
      label: 'YDS',
      category: 'receiving',
      names: ['YDS', 'Yards', 'Receiving Yards'],
    },
    {
      label: 'YPR',
      category: 'receiving',
      names: ['YPR', 'Yards Per Reception'],
      type: 'decimal',
    },
    {
      label: 'TD',
      category: 'receiving',
      names: ['TD', 'Touchdowns', 'Receiving TD'],
    },
    {
      label: 'LONG',
      category: 'receiving',
      names: ['LONG', 'Long'],
    },
  ],

  TE: [
    {
      label: 'REC',
      category: 'receiving',
      names: ['REC', 'Receptions'],
    },
    {
      label: 'TGTS',
      category: 'receiving',
      names: ['TGTS', 'Targets', 'TGT'],
    },
    {
      label: 'YDS',
      category: 'receiving',
      names: ['YDS', 'Yards', 'Receiving Yards'],
    },
    {
      label: 'YPR',
      category: 'receiving',
      names: ['YPR', 'Yards Per Reception'],
      type: 'decimal',
    },
    {
      label: 'TD',
      category: 'receiving',
      names: ['TD', 'Touchdowns', 'Receiving TD'],
    },
    {
      label: 'LONG',
      category: 'receiving',
      names: ['LONG', 'Long'],
    },
  ],

  LB: [
    {
      label: 'TOT',
      category: 'defense',
      names: ['TOT', 'Total Tackles', 'Tackles'],
    },
    {
      label: 'SOLO',
      category: 'defense',
      names: ['SOLO', 'Solo'],
    },
    {
      label: 'TFL',
      category: 'defense',
      names: ['TFL', 'Tackles for Loss'],
    },
    {
      label: 'SACK',
      category: 'defense',
      names: ['SACK', 'Sacks'],
    },
    {
      label: 'QB HUR',
      category: 'defense',
      names: ['QB HUR', 'QB Hurries'],
    },
    {
      label: 'PD',
      category: 'defense',
      names: ['PD', 'Passes Defended'],
    },
    {
      label: 'FF',
      category: 'defense',
      names: ['FF', 'Forced Fumbles'],
    },
  ],

  DE: [
    {
      label: 'TOT',
      category: 'defense',
      names: ['TOT', 'Total Tackles', 'Tackles'],
    },
    {
      label: 'SOLO',
      category: 'defense',
      names: ['SOLO', 'Solo'],
    },
    {
      label: 'TFL',
      category: 'defense',
      names: ['TFL', 'Tackles for Loss'],
    },
    {
      label: 'SACK',
      category: 'defense',
      names: ['SACK', 'Sacks'],
    },
    {
      label: 'QB HUR',
      category: 'defense',
      names: ['QB HUR', 'QB Hurries'],
    },
    {
      label: 'PD',
      category: 'defense',
      names: ['PD', 'Passes Defended'],
    },
    {
      label: 'FF',
      category: 'defense',
      names: ['FF', 'Forced Fumbles'],
    },
  ],

  DT: [
    {
      label: 'TOT',
      category: 'defense',
      names: ['TOT', 'Total Tackles', 'Tackles'],
    },
    {
      label: 'SOLO',
      category: 'defense',
      names: ['SOLO', 'Solo'],
    },
    {
      label: 'TFL',
      category: 'defense',
      names: ['TFL', 'Tackles for Loss'],
    },
    {
      label: 'SACK',
      category: 'defense',
      names: ['SACK', 'Sacks'],
    },
    {
      label: 'QB HUR',
      category: 'defense',
      names: ['QB HUR', 'QB Hurries'],
    },
    {
      label: 'PD',
      category: 'defense',
      names: ['PD', 'Passes Defended'],
    },
    {
      label: 'FF',
      category: 'defense',
      names: ['FF', 'Forced Fumbles'],
    },
  ],

  CB: [
    {
      label: 'TOT',
      category: 'defense',
      names: ['TOT', 'Total Tackles', 'Tackles'],
    },
    {
      label: 'SOLO',
      category: 'defense',
      names: ['SOLO', 'Solo'],
    },
    {
      label: 'TFL',
      category: 'defense',
      names: ['TFL', 'Tackles for Loss'],
    },
    {
      label: 'SACK',
      category: 'defense',
      names: ['SACK', 'Sacks'],
    },
    {
      label: 'INT',
      category: 'defense',
      names: ['INT', 'Interceptions'],
    },
    {
      label: 'PD',
      category: 'defense',
      names: ['PD', 'Passes Defended'],
    },
    {
      label: 'FF',
      category: 'defense',
      names: ['FF', 'Forced Fumbles'],
    },
  ],

  S: [
    {
      label: 'TOT',
      category: 'defense',
      names: ['TOT', 'Total Tackles', 'Tackles'],
    },
    {
      label: 'SOLO',
      category: 'defense',
      names: ['SOLO', 'Solo'],
    },
    {
      label: 'TFL',
      category: 'defense',
      names: ['TFL', 'Tackles for Loss'],
    },
    {
      label: 'SACK',
      category: 'defense',
      names: ['SACK', 'Sacks'],
    },
    {
      label: 'INT',
      category: 'defense',
      names: ['INT', 'Interceptions'],
    },
    {
      label: 'PD',
      category: 'defense',
      names: ['PD', 'Passes Defended'],
    },
    {
      label: 'FF',
      category: 'defense',
      names: ['FF', 'Forced Fumbles'],
    },
  ],
};

function getPositionKey(position: string): string {
  const normalized = position
    .toUpperCase()
    .trim();

  if (normalized.includes('QB')) return 'QB';
  if (normalized.includes('RB')) return 'RB';
  if (normalized.includes('WR')) return 'WR';
  if (normalized.includes('TE')) return 'TE';
  if (normalized.includes('LB')) return 'LB';
  if (normalized.includes('DE')) return 'DE';
  if (normalized.includes('DT')) return 'DT';
  if (normalized.includes('CB')) return 'CB';
  if (normalized === 'S' || normalized.includes(' SAF'))
    return 'S';

  return normalized;
}

function parseStat(
  season: SeasonStats,
  definition: StatDefinition
): number {
  const category =
    season.stats?.[definition.category];

  if (!category) return 0;

  for (const name of definition.names) {
    const raw = category[name];

    if (raw !== undefined && raw !== null) {
      const value = Number(
        String(raw).replace(/,/g, '')
      );

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return 0;
}

function formatValue(
  value: number,
  type?: StatDefinition['type']
): string {
  if (type === 'percent') {
    return `${value.toFixed(1)}%`;
  }

  if (type === 'decimal') {
    return value.toFixed(1);
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function calculateStat(
  seasons: SeasonStats[],
  definition: StatDefinition
): number {
  const values = seasons.map((season) =>
    parseStat(season, definition)
  );

  // Percentages and rate stats should NOT be summed.
  if (
    definition.type === 'percent' ||
    definition.type === 'decimal'
  ) {
    return calculateRate(
      seasons,
      definition
    );
  }

  return values.reduce(
    (sum, value) => sum + value,
    0
  );
}

function calculateRate(
  seasons: SeasonStats[],
  definition: StatDefinition
): number {
  const label = definition.label;

  // Completion percentage
  if (label === 'CMP%') {
    const completions = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'CMP',
          category: 'passing',
          names: ['C', 'CMP', 'Completions'],
        }),
      0
    );

    const attempts = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'ATT',
          category: 'passing',
          names: ['A', 'ATT', 'Attempts'],
        }),
      0
    );

    return attempts
      ? (completions / attempts) * 100
      : 0;
  }

  // Passing yards per attempt
  if (label === 'YPA') {
    const yards = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'YDS',
          category: 'passing',
          names: ['YDS', 'Yards', 'Passing Yards'],
        }),
      0
    );

    const attempts = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'ATT',
          category: 'passing',
          names: ['A', 'ATT', 'Attempts'],
        }),
      0
    );

    return attempts
      ? yards / attempts
      : 0;
  }

  // Rushing yards per carry
  if (label === 'YPC') {
    const yards = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'YDS',
          category: 'rushing',
          names: ['YDS', 'Yards', 'Rushing Yards'],
        }),
      0
    );

    const carries = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'CAR',
          category: 'rushing',
          names: ['CAR', 'Carries', 'Rushing Attempts'],
        }),
      0
    );

    return carries
      ? yards / carries
      : 0;
  }

  // Receiving yards per reception
  if (label === 'YPR') {
    const yards = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'YDS',
          category: 'receiving',
          names: ['YDS', 'Yards', 'Receiving Yards'],
        }),
      0
    );

    const receptions = seasons.reduce(
      (sum, season) =>
        sum +
        parseStat(season, {
          label: 'REC',
          category: 'receiving',
          names: ['REC', 'Receptions'],
        }),
      0
    );

    return receptions
      ? yards / receptions
      : 0;
  }

  return 0;
}

export default function PlayerProfilePage() {
  const params = useParams();

  const playerId =
    params?.id as string;

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [seasonStats, setSeasonStats] =
    useState<SeasonStats[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [statsLoading, setStatsLoading] =
    useState(true);

  useEffect(() => {
    async function fetchPlayer() {
      if (!playerId) return;

      setLoading(true);
      setStatsLoading(true);

      try {
        const {
          data: playerData,
          error: playerError,
        } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (playerError) {
          console.error(
            'Error fetching player:',
            playerError
          );
          setPlayer(null);
          return;
        }

        setPlayer(playerData);

        const {
          data: statsData,
          error: statsError,
        } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('player_id', playerId)
          .order('season', {
            ascending: true,
          });

        if (statsError) {
          console.error(
            'Error fetching season stats:',
            statsError
          );
          setSeasonStats([]);
        } else {
          setSeasonStats(
            (statsData || []) as SeasonStats[]
          );
        }
      } catch (error) {
        console.error(
          'Unexpected error:',
          error
        );
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    }

    fetchPlayer();
  }, [playerId]);

  const positionKey = useMemo(
    () =>
      player
        ? getPositionKey(player.position)
        : '',
    [player]
  );

  const statDefinitions =
    STAT_DEFINITIONS[positionKey] ?? [];

  const careerStats = useMemo(() => {
    return statDefinitions.map(
      (definition) => ({
        ...definition,
        value: calculateStat(
          seasonStats,
          definition
        ),
      })
    );
  }, [
    seasonStats,
    statDefinitions,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-medium text-slate-400">
          Loading player profile...
        </p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <h1 className="text-xl font-bold">
          Player Not Found
        </h1>

        <Link
          href="/"
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const jerseyNumber =
    player.number ??
    player.jersey_number ??
    player.jersey ??
    '—';

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-slate-400 transition hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        {/* Player Header */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-blue-400">
                  #{jerseyNumber}
                </span>

                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  {player.name}
                </h1>
              </div>

              <p className="mt-1 text-sm font-medium text-slate-400">
                {player.position} •{' '}
                {player.eligibility}
              </p>
            </div>

            <div className="flex gap-4 border-t border-white/10 pt-4 sm:border-t-0 sm:pt-0">
              <div>
                <p className="text-xs text-slate-400">
                  Height
                </p>
                <p className="font-semibold text-white">
                  {player.height || '—'}
                </p>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div>
                <p className="text-xs text-slate-400">
                  Weight
                </p>

                <p className="font-semibold text-white">
                  {player.weight
                    ? `${player.weight} lbs`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Career Statistics */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Career Statistics
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Combined from all recorded seasons
              </p>
            </div>
          </div>

          {statsLoading ? (
            <p className="text-sm text-slate-400">
              Loading career statistics...
            </p>
          ) : careerStats.length > 0 &&
            seasonStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3">
                      Career
                    </th>

                    <th className="p-3">
                      GP
                    </th>

                    {careerStats.map(
                      (stat) => (
                        <th
                          key={stat.label}
                          className="p-3 text-right"
                        >
                          {stat.label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="p-3 font-bold text-white">
                      Career
                    </td>

                    <td className="p-3 text-slate-300">
                      {seasonStats.reduce(
                        (sum, season) =>
                          sum + (season.games || 0),
                        0
                      )}
                    </td>

                    {careerStats.map(
                      (stat) => (
                        <td
                          key={stat.label}
                          className="p-3 text-right font-bold text-blue-400"
                        >
                          {formatValue(
                            stat.value,
                            stat.type
                          )}
                        </td>
                      )
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              No historical statistics have been
              recorded for this player yet.
            </p>
          )}
        </div>

        {/* Season-by-Season */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              Season-by-Season
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Historical statistics by season and team
            </p>
          </div>

          {statsLoading ? (
            <p className="text-sm text-slate-400">
              Loading seasons...
            </p>
          ) : seasonStats.length > 0 ? (
            <div className="space-y-4">
              {seasonStats.map(
                (season) => (
                  <div
                    key={season.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center">
                      <div>
                        <span className="text-lg font-black text-blue-400">
                          {season.season}
                        </span>

                        <span className="ml-3 font-semibold text-white">
                          {season.team}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        {season.position}
                        {' • '}
                        {season.games} GP
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-xs text-slate-500">
                            <th className="p-3">
                              Stat
                            </th>

                            <th className="p-3 text-right">
                              Value
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {statDefinitions.map(
                            (definition) => {
                              const value =
                                parseStat(
                                  season,
                                  definition
                                );

                              return (
                                <tr
                                  key={
                                    definition.label
                                  }
                                  className="hover:bg-white/[0.02]"
                                >
                                  <td className="p-3 font-medium text-slate-400">
                                    {
                                      definition.label
                                    }
                                  </td>

                                  <td className="p-3 text-right font-bold text-white">
                                    {formatValue(
                                      value,
                                      definition.type
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              No season statistics found.
            </p>
          )}
        </div>

        {/* Player Details */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">
            Player Details
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">
                Hometown
              </p>

              <p className="font-medium text-white">
                {player.hometown || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                High School
              </p>

              <p className="font-medium text-white">
                {player.high_school || '—'}
              </p>
            </div>

            {player.previous_school && (
              <div>
                <p className="text-xs text-slate-400">
                  Previous School
                </p>

                <p className="font-medium text-white">
                  {player.previous_school}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}