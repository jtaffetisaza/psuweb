import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Matchup {
  id: number;
  season: number;
  week: number | null;
  opponent: string;
  date: string | null;
  time: string | null;
  location: string | null;
  venue: string | null;
  is_home: boolean;
  conference: string | null;
  game_type: string | null;
  penn_state_record: string | null;
  opponent_record: string | null;
  penn_state_ranking: number | null;
  opponent_ranking: number | null;
  preview: string | null;
  offense_breakdown: string | null;
  defense_breakdown: string | null;
  key_matchup: string | null;
  key_storylines: string | null;
  prediction: string | null;
  penn_state_score: number | null;
  opponent_score: number | null;
  result: string | null;
  note: string | null;
}

interface MatchupPlayer {
  id: number;
  matchup_id: number;
  player_id: number | null;
  team_name: string;
  player_name: string;
  position: string | null;
  role: string | null;
  stats: Record<string, unknown> | null;
  note: string | null;
  sort_order: number;
}

interface MatchupTeamStats {
  id: number;
  matchup_id: number;
  team_name: string;
  points_per_game: number | null;
  total_yards_per_game: number | null;
  passing_yards_per_game: number | null;
  rushing_yards_per_game: number | null;
  points_allowed_per_game: number | null;
  turnovers: number | null;
  sacks: number | null;
  third_down_pct: number | null;
  red_zone_pct: number | null;
}

interface MatchupHistory {
  id: number;
  matchup_id: number;
  season: number;
  opponent: string;
  penn_state_score: number | null;
  opponent_score: number | null;
  location: string | null;
  venue: string | null;
  result: string | null;
  note: string | null;
}

interface MatchupSeries {
  id: number;
  opponent: string;
  penn_state_wins: number;
  opponent_wins: number;
  ties: number;
  total_games: number;
}

export default async function MatchupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchupId = Number(id);

  if (Number.isNaN(matchupId)) {
    notFound();
  }

  // Load the current matchup first so we know the opponent.
  const { data: matchupData, error: matchupError } = await supabase
    .from('matchups')
    .select('*')
    .eq('id', matchupId)
    .single();

  if (matchupError || !matchupData) {
    notFound();
  }

  const game = matchupData as Matchup;

  // Load matchup information, recent history, and the all-time series record.
  const [
    { data: playerData },
    { data: teamStatsData },
    { data: historyData },
    { data: seriesData },
  ] = await Promise.all([
    supabase
      .from('matchup_players')
      .select('*')
      .eq('matchup_id', matchupId)
      .order('sort_order', { ascending: true }),

    supabase
      .from('matchup_team_stats')
      .select('*')
      .eq('matchup_id', matchupId),

    supabase
      .from('matchup_history')
      .select('*')
      .eq('opponent', game.opponent)
      .order('season', { ascending: false }),

    supabase
      .from('matchup_series')
      .select('*')
      .eq('opponent', game.opponent)
      .single(),
  ]);

  const matchupPlayers = (playerData || []) as MatchupPlayer[];
  const teamStats = (teamStatsData || []) as MatchupTeamStats[];
  const matchupHistory = (historyData || []) as MatchupHistory[];
  const series = seriesData as MatchupSeries | null;

  const pennStatePlayers = matchupPlayers.filter(
    (player) => player.team_name === 'Penn State'
  );

  const opponentPlayers = matchupPlayers.filter(
    (player) => player.team_name !== 'Penn State'
  );

  const pennStateStats = teamStats.find(
    (team) => team.team_name === 'Penn State'
  );

  const opponentStats = teamStats.find(
    (team) => team.team_name === game.opponent
  );

  // Calculate the record from the recent meetings currently stored.
  const recentWins = matchupHistory.filter(
    (game) => game.result === 'W'
  ).length;

  const recentLosses = matchupHistory.filter(
    (game) => game.result === 'L'
  ).length;

  const recentTies = matchupHistory.filter(
    (game) =>
      game.result === 'T' ||
      game.result === 'D'
  ).length;

  // All-time series record comes from matchup_series.
  const seriesRecordText = series
    ? `${series.penn_state_wins}-${series.opponent_wins}${
        series.ties > 0 ? `-${series.ties}` : ''
      }`
    : '—';

  const recentRecordText =
    matchupHistory.length > 0
      ? `${recentWins}-${recentLosses}${
          recentTies > 0 ? `-${recentTies}` : ''
        }`
      : '—';

  const formattedDate = game.date
    ? new Date(`${game.date}T12:00:00`).toLocaleDateString(
        'en-US',
        {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }
      )
    : 'Date TBD';

  const formattedTime = game.time
    ? game.time.slice(0, 5)
    : 'Time TBD';

  return (
    <main className="min-h-screen px-4 py-8 font-sans text-slate-100 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl space-y-6">

        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-400 transition hover:text-blue-300"
        >
          ← Back to Dashboard
        </Link>

        {/* GAME HEADER */}
        <section className="glass-panel overflow-hidden rounded-3xl">

          <div className="border-b border-white/10 bg-gradient-to-r from-blue-950/70 via-slate-950 to-blue-950/40 p-6 sm:p-8">

            <div className="mb-6 flex flex-wrap items-center gap-2">

              <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-300">
                {game.game_type || 'Regular Season'}
              </span>

              {game.conference && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {game.conference}
                </span>
              )}

            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">

              <div className="text-center md:text-left">

                {game.penn_state_ranking && (
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                    #{game.penn_state_ranking}
                  </div>
                )}

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Penn State
                </h1>

                {game.penn_state_record && (
                  <p className="mt-2 text-sm text-slate-400">
                    {game.penn_state_record}
                  </p>
                )}

              </div>

              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-[0.3em] text-slate-600">
                  VS
                </div>
              </div>

              <div className="text-center md:text-right">

                {game.opponent_ranking && (
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                    #{game.opponent_ranking}
                  </div>
                )}

                <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {game.opponent}
                </h2>

                {game.opponent_record && (
                  <p className="mt-2 text-sm text-slate-400">
                    {game.opponent_record}
                  </p>
                )}

              </div>

            </div>

          </div>

          <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

            <div className="p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Date
              </div>

              <div className="mt-1 font-semibold text-white">
                {formattedDate}
              </div>
            </div>

            <div className="p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Kickoff
              </div>

              <div className="mt-1 font-semibold text-white">
                {formattedTime}
              </div>
            </div>

            <div className="p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Location
              </div>

              <div className="mt-1 font-semibold text-white">
                {game.location || 'TBD'}
              </div>

              {game.venue && (
                <div className="mt-1 text-xs text-slate-500">
                  {game.venue}
                </div>
              )}
            </div>

          </div>

        </section>

        {/* MATCHUP PREVIEW */}
        <section className="glass-panel rounded-2xl p-6">

          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Matchup Preview
            </div>

            <h2 className="mt-1 text-2xl font-bold text-white">
              Penn State vs. {game.opponent}
            </h2>
          </div>

          <p className="whitespace-pre-line leading-7 text-slate-300">
            {game.preview ||
              'Matchup analysis has not been added yet.'}
          </p>

        </section>

        {/* KEY PLAYERS */}
        <section className="glass-panel rounded-2xl p-6">

          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Key Players
            </div>

            <h2 className="mt-1 text-2xl font-bold text-white">
              Players to Watch
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* PENN STATE */}
            <div>

              <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                Penn State
              </div>

              <div className="space-y-3">

                {pennStatePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h3 className="font-bold text-white">
                          {player.player_name}
                        </h3>

                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
                          {player.position || 'Player'}
                          {player.role ? ` • ${player.role}` : ''}
                        </div>
                      </div>

                      {player.player_id && (
                        <Link
                          href={`/player/${player.player_id}`}
                          className="text-xs font-medium text-slate-500 transition hover:text-blue-400"
                        >
                          Profile →
                        </Link>
                      )}

                    </div>

                    {player.note && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {player.note}
                      </p>
                    )}

                  </div>
                ))}

                {pennStatePlayers.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No Penn State players added yet.
                  </p>
                )}

              </div>

            </div>

            {/* OPPONENT */}
            <div>

              <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                {game.opponent}
              </div>

              <div className="space-y-3">

                {opponentPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                  >

                    <div>
                      <h3 className="font-bold text-white">
                        {player.player_name}
                      </h3>

                      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
                        {player.position || 'Player'}
                        {player.role ? ` • ${player.role}` : ''}
                      </div>
                    </div>

                    {player.note && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {player.note}
                      </p>
                    )}

                  </div>
                ))}

                {opponentPlayers.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No opponent players added yet.
                  </p>
                )}

              </div>

            </div>

          </div>

        </section>

        {/* TEAM COMPARISON */}
        <section className="glass-panel overflow-hidden rounded-2xl">

          <div className="border-b border-white/10 p-6">

            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Team Comparison
            </div>

            <h2 className="mt-1 text-2xl font-bold text-white">
              By the Numbers
            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[600px] border-collapse">

              <thead>

                <tr className="border-b border-white/10 bg-slate-950/40">

                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category
                  </th>

                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Penn State
                  </th>

                  <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {game.opponent}
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-white/5">

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm font-medium text-slate-300">
                    Record
                  </td>

                  <td className="p-4 text-center font-bold text-white">
                    {game.penn_state_record || '—'}
                  </td>

                  <td className="p-4 text-center font-bold text-white">
                    {game.opponent_record || '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Points / Game
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.points_per_game ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.points_per_game ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Total Yards / Game
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.total_yards_per_game ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.total_yards_per_game ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Passing Yards / Game
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.passing_yards_per_game ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.passing_yards_per_game ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Rushing Yards / Game
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.rushing_yards_per_game ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.rushing_yards_per_game ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Points Allowed / Game
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.points_allowed_per_game ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.points_allowed_per_game ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Turnovers
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.turnovers ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.turnovers ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Sacks
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.sacks ?? '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.sacks ?? '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    3rd Down %
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.third_down_pct != null
                      ? `${pennStateStats.third_down_pct}%`
                      : '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.third_down_pct != null
                      ? `${opponentStats.third_down_pct}%`
                      : '—'}
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 text-sm text-slate-400">
                    Red Zone %
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {pennStateStats?.red_zone_pct != null
                      ? `${pennStateStats.red_zone_pct}%`
                      : '—'}
                  </td>

                  <td className="p-4 text-center font-semibold text-white">
                    {opponentStats?.red_zone_pct != null
                      ? `${opponentStats.red_zone_pct}%`
                      : '—'}
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

        </section>

        {/* MATCHUP HISTORY */}
        <section className="glass-panel overflow-hidden rounded-2xl">

          {/* HISTORY HEADER */}
          <div className="border-b border-white/10 p-6 sm:p-7">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Matchup History
                </div>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  Penn State vs. {game.opponent}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  All-time series and recent meetings
                </p>
              </div>

              {/* SERIES RECORD */}
              <div className="flex items-center gap-8 rounded-xl border border-white/10 bg-slate-950/40 px-6 py-4">

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Series Record
                  </div>

                  <div className="mt-1 text-2xl font-black text-white">
                    {seriesRecordText}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Penn State
                  </div>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Recent
                  </div>

                  <div className="mt-1 text-2xl font-black text-white">
                    {recentRecordText}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Meetings shown
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* RECENT MEETINGS */}
          {matchupHistory.length > 0 ? (
            <div className="divide-y divide-white/10">

              {matchupHistory.map((history) => (
                <div
                  key={history.id}
                  className="p-5 transition hover:bg-white/[0.02] sm:p-6"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* GAME INFO */}
                    <div className="flex items-center gap-4">

                      {/* RESULT BADGE */}
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                          history.result === 'W'
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                            : history.result === 'L'
                              ? 'border-red-400/20 bg-red-400/10 text-red-400'
                              : 'border-white/10 bg-white/[0.04] text-slate-400'
                        }`}
                      >
                        {history.result || '—'}
                      </div>

                      <div>

                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {history.season} Season
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2">

                          <span className="font-bold text-white">
                            Penn State
                          </span>

                          <span className="text-xl font-black text-white">
                            {history.penn_state_score ?? '—'}
                          </span>

                          <span className="text-slate-600">
                            –
                          </span>

                          <span className="text-xl font-black text-white">
                            {history.opponent_score ?? '—'}
                          </span>

                          <span className="font-bold text-white">
                            {history.opponent}
                          </span>

                        </div>

                      </div>

                    </div>

                    {/* LOCATION */}
                    <div className="sm:text-right">

                      {history.result && (
                        <div
                          className={`text-sm font-black uppercase tracking-wider ${
                            history.result === 'W'
                              ? 'text-emerald-400'
                              : history.result === 'L'
                                ? 'text-red-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {history.result === 'W'
                            ? 'Win'
                            : history.result === 'L'
                              ? 'Loss'
                              : history.result}
                        </div>
                      )}

                      {history.location && (
                        <div className="mt-1 text-sm text-slate-500">
                          {history.location}
                        </div>
                      )}

                      {history.venue && (
                        <div className="mt-1 text-xs text-slate-600">
                          {history.venue}
                        </div>
                      )}

                    </div>

                  </div>

                  {history.note && (
                    <p className="mt-4 max-w-4xl pl-0 text-sm leading-6 text-slate-400 sm:pl-[3.75rem]">
                      {history.note}
                    </p>
                  )}

                </div>
              ))}

            </div>
          ) : (
            <div className="p-6">

              <p className="text-sm text-slate-500">
                No matchup history has been added yet.
              </p>

            </div>
          )}

        </section>

        {/* OFFENSE / DEFENSE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <section className="glass-panel rounded-2xl p-6">

            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-400">
              Offense
            </div>

            <p className="whitespace-pre-line leading-7 text-slate-300">
              {game.offense_breakdown ||
                'Offensive breakdown has not been added yet.'}
            </p>

          </section>

          <section className="glass-panel rounded-2xl p-6">

            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-400">
              Defense
            </div>

            <p className="whitespace-pre-line leading-7 text-slate-300">
              {game.defense_breakdown ||
                'Defensive breakdown has not been added yet.'}
            </p>

          </section>

        </div>

        {/* KEY MATCHUP */}
        <section className="glass-panel rounded-2xl p-6">

          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-400">
            Key Matchup
          </div>

          <p className="whitespace-pre-line leading-7 text-slate-300">
            {game.key_matchup ||
              'Key matchup has not been added yet.'}
          </p>

        </section>

        {/* KEY STORYLINES */}
        <section className="glass-panel rounded-2xl p-6">

          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-400">
            Key Storylines
          </div>

          <p className="whitespace-pre-line leading-7 text-slate-300">
            {game.key_storylines ||
              'Storylines have not been added yet.'}
          </p>

        </section>

        {/* PREDICTION */}
        <section className="glass-panel rounded-2xl p-6">

          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-400">
            Prediction / Outlook
          </div>

          <p className="whitespace-pre-line leading-7 text-slate-300">
            {game.prediction ||
              'Prediction has not been added yet.'}
          </p>

        </section>

        {/* NOTES */}
        {game.note && (
          <section className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] p-6">

            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Game Notes
            </div>

            <p className="text-sm leading-6 text-slate-300">
              {game.note}
            </p>

          </section>
        )}

      </div>
    </main>
  );
}