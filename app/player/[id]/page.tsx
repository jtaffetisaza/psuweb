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

  // Recruiting
  star_rating?: number | null;
  recruiting_class?: number | null;
  national_rank?: number | null;
  position_rank?: number | null;
  state_rank?: number | null;
  recruiting_position?: string | null;
  recruiting_team?: string | null;

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
  stats: Record<string, Record<string, string>>;
}

const STAT_DEFINITIONS: Record<
  string,
  { key: string; label: string; type?: 'number' | 'decimal' | 'percentage' }[]
> = {
  QB: [
    { key: 'passing_yds', label: 'Passing Yards' },
    { key: 'passing_td', label: 'Passing TDs' },
    { key: 'interceptions', label: 'INTs' },
    { key: 'passing_pct', label: 'Completion %', type: 'percentage' },
    { key: 'rushing_yds', label: 'Rushing Yards' },
    { key: 'rushing_td', label: 'Rushing TDs' },
  ],
  RB: [
    { key: 'rushing_yds', label: 'Rushing Yards' },
    { key: 'rushing_td', label: 'Rushing TDs' },
    { key: 'rushing_att', label: 'Carries' },
    { key: 'receptions', label: 'Receptions' },
    { key: 'receiving_yds', label: 'Receiving Yards' },
    { key: 'receiving_td', label: 'Receiving TDs' },
  ],
  WR: [
    { key: 'receptions', label: 'Receptions' },
    { key: 'receiving_yds', label: 'Receiving Yards' },
    { key: 'receiving_td', label: 'Receiving TDs' },
    { key: 'rushing_yds', label: 'Rushing Yards' },
    { key: 'rushing_td', label: 'Rushing TDs' },
  ],
  TE: [
    { key: 'receptions', label: 'Receptions' },
    { key: 'receiving_yds', label: 'Receiving Yards' },
    { key: 'receiving_td', label: 'Receiving TDs' },
  ],
  LB: [
    { key: 'total_tackles', label: 'Tackles' },
    { key: 'solo_tackles', label: 'Solo Tackles' },
    { key: 'sacks', label: 'Sacks', type: 'decimal' },
    { key: 'tackles_for_loss', label: 'TFLs', type: 'decimal' },
    { key: 'interceptions', label: 'INTs' },
    { key: 'passes_defended', label: 'Passes Defended' },
  ],
  DE: [
    { key: 'total_tackles', label: 'Tackles' },
    { key: 'sacks', label: 'Sacks', type: 'decimal' },
    { key: 'tackles_for_loss', label: 'TFLs', type: 'decimal' },
    { key: 'passes_defended', label: 'Passes Defended' },
  ],
  DT: [
    { key: 'total_tackles', label: 'Tackles' },
    { key: 'sacks', label: 'Sacks', type: 'decimal' },
    { key: 'tackles_for_loss', label: 'TFLs', type: 'decimal' },
  ],
  CB: [
    { key: 'total_tackles', label: 'Tackles' },
    { key: 'interceptions', label: 'INTs' },
    { key: 'passes_defended', label: 'Passes Defended' },
    { key: 'sacks', label: 'Sacks', type: 'decimal' },
  ],
  S: [
    { key: 'total_tackles', label: 'Tackles' },
    { key: 'interceptions', label: 'INTs' },
    { key: 'passes_defended', label: 'Passes Defended' },
    { key: 'sacks', label: 'Sacks', type: 'decimal' },
  ],
};

function getPositionKey(position: string): string {
  const p = position.toUpperCase();

  if (p.includes('QB')) return 'QB';
  if (p.includes('RB') || p.includes('HB')) return 'RB';
  if (p.includes('WR')) return 'WR';
  if (p.includes('TE')) return 'TE';
  if (p.includes('LB')) return 'LB';
  if (p.includes('DE') || p.includes('EDGE')) return 'DE';
  if (p.includes('DT') || p.includes('DL')) return 'DT';
  if (p.includes('CB')) return 'CB';
  if (p.includes('S')) return 'S';

  return p;
}

function parseStat(
  stats: Record<string, Record<string, string>>,
  key: string
): number {
  for (const category of Object.values(stats || {})) {
    if (category && category[key] !== undefined) {
      const value = Number(category[key]);
      return Number.isNaN(value) ? 0 : value;
    }
  }

  return 0;
}

function formatValue(value: number, type?: string): string {
  if (type === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  if (type === 'decimal') {
    return value.toFixed(1);
  }

  return value.toLocaleString();
}

function calculateStat(
  seasonStats: SeasonStats[],
  key: string
): number {
  return seasonStats.reduce(
    (total, season) => total + parseStat(season.stats, key),
    0
  );
}

function calculateRate(
  seasonStats: SeasonStats[],
  numeratorKey: string,
  denominatorKey: string
): number {
  const numerator = calculateStat(seasonStats, numeratorKey);
  const denominator = calculateStat(seasonStats, denominatorKey);

  if (!denominator) return 0;

  return (numerator / denominator) * 100;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = Number(params.id);

  const [player, setPlayer] = useState<Player | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayer() {
      if (!playerId || Number.isNaN(playerId)) {
        setError('Invalid player ID.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error(playerError);
        setError('Player not found.');
        setLoading(false);
        return;
      }

      const { data: statsData, error: statsError } = await supabase
        .from('player_season_stats')
        .select('*')
        .eq('player_id', playerId)
        .order('season', { ascending: true });

      if (statsError) {
        console.error(statsError);
      }

      setPlayer(playerData);
      setSeasonStats(statsData || []);
      setLoading(false);
    }

    fetchPlayer();
  }, [playerId]);

  const positionKey = useMemo(() => {
    return player ? getPositionKey(player.position) : '';
  }, [player]);

  const statDefinitions = STAT_DEFINITIONS[positionKey] || [];

  const hasRecruitingInfo =
    player?.star_rating != null ||
    player?.recruiting_class != null ||
    player?.national_rank != null ||
    player?.position_rank != null ||
    player?.state_rank != null ||
    player?.recruiting_position ||
    player?.recruiting_team;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-400">Loading player...</p>
        </div>
      </main>
    );
  }

  if (error || !player) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Roster
          </Link>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">Player Not Found</h1>
            <p className="mt-2 text-slate-400">
              {error || 'Unable to load this player.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const jerseyNumber =
    player.number ??
    player.jersey_number ??
    player.jersey ??
    null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
          >
            ← Back to Roster
          </Link>
        </div>

        {/* Player Header */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20">
              <span className="text-4xl font-black text-blue-400">
                {jerseyNumber ?? '—'}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                {player.position}
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {player.name}
              </h1>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span>{player.eligibility || '—'}</span>
                <span>{player.height || '—'}</span>
                <span>
                  {player.weight ? `${player.weight} lbs` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Career Statistics */}
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              Career Statistics
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              College career statistics
            </p>
          </div>

          {seasonStats.length === 0 ? (
            <p className="text-sm italic text-slate-400">
              No career statistics available.
            </p>
          ) : statDefinitions.length === 0 ? (
            <p className="text-sm italic text-slate-400">
              Statistics are not currently available for this position.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {statDefinitions.map((stat) => (
                <div
                  key={stat.key}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <p className="text-xs text-slate-400">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatValue(
                      calculateStat(seasonStats, stat.key),
                      stat.type
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recruiting Profile */}
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              Recruiting Profile
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              High school recruiting profile and rankings
            </p>
          </div>

          {hasRecruitingInfo ? (
            <div className="space-y-6">

              {/* Stars */}
              {player.star_rating != null && (
                <div>
                  <p className="text-xs text-slate-400">
                    Recruiting Rating
                  </p>

                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xl tracking-tight">
                      <span className="text-yellow-400">
                        {'★'.repeat(
                          Math.min(player.star_rating, 5)
                        )}
                      </span>

                      <span className="text-slate-700">
                        {'★'.repeat(
                          Math.max(0, 5 - player.star_rating)
                        )}
                      </span>
                    </span>

                    <span className="font-bold text-white">
                      {player.star_rating}-Star
                    </span>
                  </div>
                </div>
              )}

              {/* Recruiting Details */}
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">

                {player.recruiting_class != null && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Recruiting Class
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {player.recruiting_class}
                    </p>
                  </div>
                )}

                {player.recruiting_position && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Recruiting Position
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {player.recruiting_position}
                    </p>
                  </div>
                )}

                {player.national_rank != null && (
                  <div>
                    <p className="text-xs text-slate-400">
                      National Rank
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      #{player.national_rank}
                    </p>
                  </div>
                )}

                {player.position_rank != null && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Position Rank
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      #{player.position_rank}
                    </p>
                  </div>
                )}

                {player.state_rank != null && (
                  <div>
                    <p className="text-xs text-slate-400">
                      State Rank
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      #{player.state_rank}
                    </p>
                  </div>
                )}

                {player.recruiting_team && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Signed With
                    </p>
                    <p className="mt-1 font-semibold text-blue-400">
                      {player.recruiting_team}
                    </p>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              No recruiting information available for this player.
            </p>
          )}
        </div>

        {/* Season-by-Season */}
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              Season-by-Season
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Individual season statistics
            </p>
          </div>

          {seasonStats.length === 0 ? (
            <p className="text-sm italic text-slate-400">
              No season statistics available.
            </p>
          ) : (
            <div className="space-y-4">
              {seasonStats.map((season) => (
                <div
                  key={season.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white">
                        {season.season}
                      </h3>

                      <p className="text-xs text-slate-500">
                        {season.team}
                        {season.games
                          ? ` • ${season.games} games`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {statDefinitions.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      {statDefinitions.map((stat) => {
                        const value = parseStat(
                          season.stats,
                          stat.key
                        );

                        return (
                          <div key={stat.key}>
                            <p className="text-xs text-slate-500">
                              {stat.label}
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {formatValue(value, stat.type)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      Statistics are not currently available for this
                      position.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player Details */}
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">
              Player Details
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Background and player information
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-xs text-slate-400">
                Hometown
              </p>
              <p className="mt-1 font-semibold text-white">
                {player.hometown || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                High School
              </p>
              <p className="mt-1 font-semibold text-white">
                {player.high_school || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Previous School
              </p>
              <p className="mt-1 font-semibold text-white">
                {player.previous_school || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Eligibility
              </p>
              <p className="mt-1 font-semibold text-white">
                {player.eligibility || '—'}
              </p>
            </div>

          </div>

          {player.notes && (
            <div className="mt-6 border-t border-slate-800 pt-5">
              <p className="text-xs text-slate-400">
                Notes
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {player.notes}
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}