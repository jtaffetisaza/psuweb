'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Game {
  id: number;
  season: number;
  opponent: string;
  date: string;
  time: string | null;
  location: string | null;
  venue: string | null;
  note: string | null;
  is_home: boolean;
  preview: string | null;
  offense_breakdown: string | null;
  defense_breakdown: string | null;
  key_matchup: string | null;
  key_storylines: string | null;
  prediction: string | null;
  conference: string | null;
  game_type: string | null;
}

interface MatchupPlayer {
  id: number;
  matchup_id: number;
  player_id: number | null;
  team_name: string;
  role_note: string | null;
  players?: {
    id: number;
    name: string;
    position: string;
    number: number;
  };
}

// Converts "2026-09-19" to "Sat, Sep 19, 2026"
function formatDate(dateString?: string) {
  if (!dateString) return 'TBD';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateString;
}

// Converts "12:00" or "15:30" to "12:00 PM" / "3:30 PM"
function formatTime(timeString?: string | null) {
  if (!timeString) return 'TBD';
  const timeParts = timeString.split(':');
  if (timeParts.length >= 2) {
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    if (isNaN(hours)) return timeString;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeString;
}

export default function MatchupPage() {
  const params = useParams();
  const matchupId = params?.id;

  const [game, setGame] = useState<Game | null>(null);
  const [keyPlayers, setKeyPlayers] = useState<MatchupPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchupId) return;

    async function fetchMatchupData() {
      try {
        setLoading(true);

        const { data: gameData, error: gameError } = await supabase
          .from('matchups')
          .select('*')
          .eq('id', matchupId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData as Game);

        const { data: playerData } = await supabase
          .from('matchup_key_players')
          .select('*, players(id, name, position, number)')
          .eq('matchup_id', matchupId);

        setKeyPlayers((playerData || []) as MatchupPlayer[]);
      } catch (err) {
        console.error('Error fetching matchup details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatchupData();
  }, [matchupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-500 font-semibold">
        Loading matchup details...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
        <Link
          href="/?tab=schedule"
          className="text-xs font-bold uppercase tracking-wider text-blue-900 hover:underline"
        >
          ← Back to Schedule
        </Link>
        <p className="mt-4 text-slate-500">Matchup not found.</p>
      </div>
    );
  }

  const psuKeyPlayers = keyPlayers.filter(
    (kp) => kp.team_name?.toLowerCase() === 'penn state'
  );
  const oppKeyPlayers = keyPlayers.filter(
    (kp) => kp.team_name?.toLowerCase() !== 'penn state'
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16 pt-6">
      <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
        {/* BACK LINK */}
        <div>
          <Link
            href="/?tab=schedule"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-900 hover:text-blue-700 transition"
          >
            ← Back to Schedule
          </Link>
        </div>

        {/* HERO BANNER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="bg-slate-900 px-6 py-3 flex items-center justify-between border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-200">
              {game.game_type || 'Regular Season Matchup'}
            </span>
            {game.conference && (
              <span className="rounded-full bg-blue-900/80 border border-blue-700 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {game.conference}
              </span>
            )}
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-6 py-2">
              <div className="flex-1">
                <div className="text-3xl md:text-4xl font-extrabold text-blue-950 tracking-tight">
                  Penn State
                </div>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mt-1">
                  Nittany Lions
                </div>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 font-mono text-sm font-black text-slate-500 border border-slate-200">
                {game.is_home ? 'VS' : '@'}
              </div>

              <div className="flex-1">
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {game.opponent}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Opponent
                </div>
              </div>
            </div>

            {/* GAME INFO BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-6 text-center bg-slate-50/70 -mx-6 -mb-6 p-6">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Date
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {formatDate(game.date)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Kickoff
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {formatTime(game.time)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Location
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {game.location || game.venue || 'TBD'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW EDITORIAL */}
        {game.preview && (
          <section className="bg-white rounded-2xl p-6 md:p-8 border-l-4 border-l-blue-900 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-800">
              Matchup Preview
            </h2>
            <h3 className="text-xl font-bold text-slate-900">
              Penn State vs. {game.opponent}
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {game.preview}
            </p>
          </section>
        )}


        {/* OFFENSE & DEFENSE BREAKDOWNS */}
        {(game.offense_breakdown || game.defense_breakdown) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {game.offense_breakdown && (
              <section className="bg-white rounded-2xl p-6 border-t-4 border-t-blue-800 border border-slate-200 shadow-sm space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-blue-900">
                  Offensive Strategy
                </h2>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {game.offense_breakdown}
                </p>
              </section>
            )}

            {game.defense_breakdown && (
              <section className="bg-white rounded-2xl p-6 border-t-4 border-t-slate-800 border border-slate-200 shadow-sm space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">
                  Defensive Keys
                </h2>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {game.defense_breakdown}
                </p>
              </section>
            )}
          </div>
        )}

        {/* KEY MATCHUP & STORYLINES */}
        {game.key_matchup && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Key Matchup
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {game.key_matchup}
            </p>
          </section>
        )}

        {game.key_storylines && (
          <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Key Storylines
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {game.key_storylines}
            </p>
          </section>
        )}

        {/* PREDICTION & GAME NOTES */}
        {game.prediction && (
          <section className="bg-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-md space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Prediction & Outlook
            </h2>
            <p className="text-sm leading-relaxed text-blue-50 whitespace-pre-line">
              {game.prediction}
            </p>
          </section>
        )}

        {game.note && (
          <section className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 font-medium">
            <span className="font-bold text-amber-950">Game Note:</span> {game.note}
          </section>
        )}
      </div>
    </main>
  );
}