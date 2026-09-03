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
  stats: Record<string, Record<string, number | string>>;
}

interface StatDefinition {
  category: string;
  key: string;
  label: string;
  type?: 'number' | 'decimal' | 'percentage';
}

const STAT_DEFINITIONS: Record<string, StatDefinition[]> = {
  QB: [
    { category: 'passing', key: 'YDS', label: 'Passing Yards' },
    { category: 'passing', key: 'TD', label: 'Passing TDs' },
    { category: 'passing', key: 'INT', label: 'INTs' },
    { category: 'passing', key: 'CMP', label: 'Completions' },
    { category: 'rushing', key: 'YDS', label: 'Rushing Yards' },
    { category: 'rushing', key: 'TD', label: 'Rushing TDs' },
  ],

  RB: [
    { category: 'rushing', key: 'CAR', label: 'Carries' },
    { category: 'rushing', key: 'YDS', label: 'Rushing Yards' },
    { category: 'rushing', key: 'TD', label: 'Rushing TDs' },
    { category: 'receiving', key: 'REC', label: 'Receptions' },
    { category: 'receiving', key: 'YDS', label: 'Receiving Yards' },
    { category: 'receiving', key: 'TD', label: 'Receiving TDs' },
  ],

  WR: [
    { category: 'receiving', key: 'REC', label: 'Receptions' },
    { category: 'receiving', key: 'YDS', label: 'Receiving Yards' },
    { category: 'receiving', key: 'TD', label: 'Receiving TDs' },
    { category: 'rushing', key: 'YDS', label: 'Rushing Yards' },
    { category: 'rushing', key: 'TD', label: 'Rushing TDs' },
  ],

  TE: [
    { category: 'receiving', key: 'REC', label: 'Receptions' },
    { category: 'receiving', key: 'YDS', label: 'Receiving Yards' },
    { category: 'receiving', key: 'TD', label: 'Receiving TDs' },
  ],

  LB: [
    { category: 'defensive', key: 'TOT', label: 'Tackles' },
    { category: 'defensive', key: 'SOLO', label: 'Solo Tackles' },
    { category: 'defensive', key: 'SACKS', label: 'Sacks', type: 'decimal' },
    { category: 'defensive', key: 'TFL', label: 'TFLs', type: 'decimal' },
    { category: 'defensive', key: 'INT', label: 'INTs' },
    { category: 'defensive', key: 'PD', label: 'Passes Defended' },
  ],

  DE: [
    { category: 'defensive', key: 'TOT', label: 'Tackles' },
    { category: 'defensive', key: 'SACKS', label: 'Sacks', type: 'decimal' },
    { category: 'defensive', key: 'TFL', label: 'TFLs', type: 'decimal' },
    { category: 'defensive', key: 'PD', label: 'Passes Defended' },
  ],

  DT: [
    { category: 'defensive', key: 'TOT', label: 'Tackles' },
    { category: 'defensive', key: 'SACKS', label: 'Sacks', type: 'decimal' },
    { category: 'defensive', key: 'TFL', label: 'TFLs', type: 'decimal' },
  ],

  CB: [
    { category: 'defensive', key: 'TOT', label: 'Tackles' },
    { category: 'defensive', key: 'INT', label: 'INTs' },
    { category: 'defensive', key: 'PD', label: 'Passes Defended' },
    { category: 'defensive', key: 'SACKS', label: 'Sacks', type: 'decimal' },
  ],

  S: [
    { category: 'defensive', key: 'TOT', label: 'Tackles' },
    { category: 'defensive', key: 'INT', label: 'INTs' },
    { category: 'defensive', key: 'PD', label: 'Passes Defended' },
    { category: 'defensive', key: 'SACKS', label: 'Sacks', type: 'decimal' },
  ],
};

function getPositionKey(position: string): string {
  const p = (position || '').toUpperCase();

  if (p.includes('QB')) return 'QB';
  if (p.includes('RB') || p.includes('HB')) return 'RB';
  if (p.includes('WR')) return 'WR';
  if (p.includes('TE')) return 'TE';
  if (p.includes('LB')) return 'LB';
  if (p.includes('DE') || p.includes('EDGE')) return 'DE';
  if (p.includes('DT') || p.includes('DL')) return 'DT';
  if (p.includes('CB')) return 'CB';
  if (p === 'S' || p.includes('SAFETY')) return 'S';

  return p;
}

function getStat(
  stats: Record<string, Record<string, number | string>>,
  category: string,
  key: string
): number {
  const categoryStats = stats?.[category];

  if (!categoryStats) return 0;

  const value = categoryStats[key];

  if (value === undefined || value === null) return 0;

  const number = Number(value);

  return Number.isNaN(number) ? 0 : number;
}

function getStatWithFallback(
  stats: Record<string, Record<string, number | string>>,
  category: string,
  keys: string[]
): number {
  for (const key of keys) {
    const value = getStat(stats, category, key);

    if (value !== 0) return value;
  }

  return 0;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';

  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

function formatStatValue(
  value: number,
  type?: 'number' | 'decimal' | 'percentage'
): string {
  if (type === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  if (type === 'decimal') {
    return value.toFixed(1);
  }

  return formatNumber(value);
}

function calculateStat(
  seasons: SeasonStats[],
  definition: StatDefinition
): number {
  return seasons.reduce(
    (total, season) =>
      total + getStat(season.stats, definition.category, definition.key),
    0
  );
}

function calculateGames(seasons: SeasonStats[]): number {
  return seasons.reduce((total, season) => total + (season.games || 0), 0);
}

function getTeamLabel(team: string): string {
  if (team.toLowerCase() === 'penn state') return 'Penn State';

  return team;
}

function getShortTeamLabel(team: string): string {
  const labels: Record<string, string> = {
    'Penn State': 'Penn State',
    'Iowa State': 'Iowa State',
    'Ohio State': 'Ohio State',
    Utah: 'Utah',
    Colorado: 'Colorado',
    'Boston College': 'Boston College',
    'West Virginia': 'West Virginia',
    'Mississippi State': 'Mississippi State',
    'Oklahoma State': 'Oklahoma State',
    'East Carolina': 'East Carolina',
    'James Madison': 'James Madison',
    'Central Connecticut': 'Central Connecticut',
  };

  return labels[team] || team;
}

function sortSeasonsDescending(seasons: SeasonStats[]): SeasonStats[] {
  return [...seasons].sort((a, b) => b.season - a.season);
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

  const positionKey = useMemo(
    () => (player ? getPositionKey(player.position) : ''),
    [player]
  );

  const statDefinitions = STAT_DEFINITIONS[positionKey] || [];

  const pennStateSeasons = useMemo(
    () =>
      seasonStats.filter(
        (season) => season.team.toLowerCase() === 'penn state'
      ),
    [seasonStats]
  );

  const previousSchoolSeasons = useMemo(
    () =>
      seasonStats.filter(
        (season) => season.team.toLowerCase() !== 'penn state'
      ),
    [seasonStats]
  );

  const totalGames = useMemo(
    () => calculateGames(seasonStats),
    [seasonStats]
  );

  const pennStateGames = useMemo(
    () => calculateGames(pennStateSeasons),
    [pennStateSeasons]
  );

  const previousSchoolGames = useMemo(
    () => calculateGames(previousSchoolSeasons),
    [previousSchoolSeasons]
  );

  const teams = useMemo(() => {
    const unique = Array.from(
      new Set(seasonStats.map((season) => season.team))
    );

    return unique.sort((a, b) => {
      if (a === 'Penn State') return -1;
      if (b === 'Penn State') return 1;
      return a.localeCompare(b);
    });
  }, [seasonStats]);

  const orderedSeasons = useMemo(
    () => sortSeasonsDescending(seasonStats),
    [seasonStats]
  );

  const hasRecruitingInfo =
    player?.star_rating != null ||
    player?.recruiting_class != null ||
    player?.national_rank != null ||
    player?.position_rank != null ||
    player?.state_rank != null ||
    !!player?.recruiting_position ||
    !!player?.recruiting_team;

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

  const careerStatValues = statDefinitions.map((definition) => ({
    ...definition,
    value: calculateStat(seasonStats, definition),
  }));

  const pennStateStatValues = statDefinitions.map((definition) => ({
    ...definition,
    value: calculateStat(pennStateSeasons, definition),
  }));

  const previousStatValues = statDefinitions.map((definition) => ({
    ...definition,
    value: calculateStat(previousSchoolSeasons, definition),
  }));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
          >
            ← Back to Roster
          </Link>

          <span className="text-xs uppercase tracking-widest text-slate-600">
            Penn State Football
          </span>
        </div>

        {/* Hero */}
        <section className="glass-panel overflow-hidden rounded-2xl">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center">

              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10">
                <span className="text-5xl font-black text-blue-400">
                  {jerseyNumber ?? '—'}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
                    {player.position}
                  </span>

                  {player.eligibility && (
                    <span className="text-sm text-slate-400">
                      {player.eligibility}
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {player.name}
                </h1>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                  {player.height && <span>{player.height}</span>}

                  {player.weight && (
                    <span>{player.weight} lbs</span>
                  )}

                  {player.hometown && (
                    <span>{player.hometown}</span>
                  )}

                  {player.high_school && (
                    <span>{player.high_school}</span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    College Seasons
                  </p>

                  <p className="mt-1 text-3xl font-black text-white">
                    {seasonStats.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {teams.length > 1 && (
            <div className="border-t border-slate-800 bg-slate-900/30 px-6 py-4 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  College career
                </span>

                {teams.map((team) => (
                  <span
                    key={team}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      team === 'Penn State'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {getShortTeamLabel(team)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Career Snapshot */}
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Career Games
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {totalGames || '—'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Penn State Games
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {pennStateGames || '—'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Previous School Games
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {previousSchoolGames || '—'}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Schools
            </p>

            <p className="mt-2 text-3xl font-black text-white">
              {teams.length || '—'}
            </p>
          </div>
        </section>

        {/* Career Statistics */}
        <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Career Statistics
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Combined statistics across the player's college career
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
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {careerStatValues.map((stat) => (
                  <div
                    key={`${stat.category}-${stat.key}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <p className="text-xs text-slate-400">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {formatStatValue(stat.value, stat.type)}
                    </p>
                  </div>
                ))}
              </div>

              {totalGames > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Career Per Game
                  </p>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {careerStatValues
                      .filter((stat) => stat.value !== 0)
                      .map((stat) => (
                        <div key={`${stat.category}-${stat.key}-pg`}>
                          <p className="text-xs text-slate-500">
                            {stat.label}
                          </p>

                          <p className="mt-1 font-semibold text-slate-200">
                            {(stat.value / totalGames).toFixed(1)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Penn State Career */}
        {pennStateSeasons.length > 0 && (
          <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-white">
                  Penn State Career
                </h2>

                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  {pennStateSeasons.length}{' '}
                  {pennStateSeasons.length === 1 ? 'season' : 'seasons'}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Statistics recorded as a Penn State player
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {pennStateStatValues.map((stat) => (
                <div
                  key={`psu-${stat.category}-${stat.key}`}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <p className="text-xs text-slate-400">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatStatValue(stat.value, stat.type)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Previous Schools */}
        {previousSchoolSeasons.length > 0 && (
          <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                Previous College Career
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Statistics from schools before Penn State
              </p>
            </div>

            <div className="space-y-4">
              {Array.from(
                new Set(previousSchoolSeasons.map((season) => season.team))
              ).map((team) => {
                const teamSeasons = previousSchoolSeasons.filter(
                  (season) => season.team === team
                );

                return (
                  <div
                    key={team}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">
                          {getTeamLabel(team)}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {teamSeasons
                            .map((season) => season.season)
                            .sort()
                            .join(', ')}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {calculateGames(teamSeasons)} games
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      {statDefinitions
                        .map((definition) => ({
                          ...definition,
                          value: calculateStat(teamSeasons, definition),
                        }))
                        .filter((stat) => stat.value !== 0)
                        .map((stat) => (
                          <div
                            key={`${team}-${stat.category}-${stat.key}`}
                          >
                            <p className="text-xs text-slate-500">
                              {stat.label}
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {formatStatValue(stat.value, stat.type)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Season Timeline */}
        <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              College Career Timeline
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Season-by-season statistics and team history
            </p>
          </div>

          {orderedSeasons.length === 0 ? (
            <p className="text-sm italic text-slate-400">
              No season statistics available.
            </p>
          ) : (
            <div className="space-y-4">
              {orderedSeasons.map((season) => (
                <div
                  key={season.id}
                  className={`rounded-xl border p-5 ${
                    season.team.toLowerCase() === 'penn state'
                      ? 'border-blue-500/20 bg-blue-500/[0.04]'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-white">
                          {season.season}
                        </span>

                        {season.team.toLowerCase() === 'penn state' ? (
                          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            Penn State
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Previous School
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-300">
                        {getTeamLabel(season.team)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {season.games
                          ? `${season.games} games`
                          : 'Games unavailable'}
                      </p>
                    </div>

                    {statDefinitions.length > 0 && (
                      <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                        {statDefinitions.map((definition) => {
                          const value = getStat(
                            season.stats,
                            definition.category,
                            definition.key
                          );

                          return (
                            <div key={`${definition.category}-${definition.key}`}>
                              <p className="text-xs text-slate-500">
                                {definition.label}
                              </p>

                              <p className="mt-1 font-semibold text-white">
                                {formatStatValue(value, definition.type)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recruiting */}
        <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Recruiting Profile
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              High school recruiting profile and rankings
            </p>
          </div>

          {hasRecruitingInfo ? (
            <div className="space-y-6">
              {player.star_rating != null && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Recruiting Rating
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span className="text-2xl tracking-tight">
                      <span className="text-yellow-400">
                        {'★'.repeat(
                          Math.min(Math.max(player.star_rating, 0), 5)
                        )}
                      </span>

                      <span className="text-slate-700">
                        {'★'.repeat(
                          Math.max(
                            0,
                            5 -
                              Math.min(
                                Math.max(player.star_rating, 0),
                                5
                              )
                          )
                        )}
                      </span>
                    </span>

                    <span className="text-xl font-bold text-white">
                      {player.star_rating}-Star Recruit
                    </span>
                  </div>
                </div>
              )}

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
        </section>

        {/* Player Details */}
        <section className="glass-panel mt-6 rounded-2xl p-6 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Player Details
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Background and player information
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Hometown
              </p>

              <p className="mt-2 font-semibold text-white">
                {player.hometown || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                High School
              </p>

              <p className="mt-2 font-semibold text-white">
                {player.high_school || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Previous School
              </p>

              <p className="mt-2 font-semibold text-white">
                {player.previous_school || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Eligibility
              </p>

              <p className="mt-2 font-semibold text-white">
                {player.eligibility || '—'}
              </p>
            </div>
          </div>

          {player.notes && (
            <div className="mt-7 border-t border-slate-800 pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Notes
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                {player.notes}
              </p>
            </div>
          )}
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}