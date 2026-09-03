'use client';

import { useState, useEffect } from 'react';
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
  stats?: Record<string, string | number>;
}

export default function PlayerProfilePage() {
  const routerParams = useParams();
  const playerId = routerParams?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayer() {
      if (!playerId) return;

      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (error) {
          console.error('Error fetching player:', error);
        } else {
          setPlayer(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayer();
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-medium text-slate-400">Loading player profile...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <h1 className="text-xl font-bold">Player Not Found</h1>
        <Link
          href="/"
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const jerseyNumber = player.number ?? player.jersey_number ?? player.jersey ?? '—';

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition"
        >
          ← Back to Dashboard
        </Link>

        {/* Player Header Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-blue-400">#{jerseyNumber}</span>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{player.name}</h1>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-400">
                {player.position} • {player.eligibility}
              </p>
            </div>

            <div className="flex gap-4 border-t border-white/10 pt-4 sm:border-t-0 sm:pt-0">
              <div>
                <p className="text-xs text-slate-400">Height</p>
                <p className="font-semibold text-white">{player.height || '—'}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-xs text-slate-400">Weight</p>
                <p className="font-semibold text-white">
                  {player.weight ? `${player.weight} lbs` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Career Statistics Block */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Career Statistics</h2>
          {player.stats && Object.keys(player.stats).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(player.stats).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <p className="text-xs font-medium text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black text-blue-400">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              No recorded game statistics found for this player.
            </p>
          )}
        </div>

        {/* Background Details */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Player Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Hometown</p>
              <p className="font-medium text-white">{player.hometown || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">High School</p>
              <p className="font-medium text-white">{player.high_school || '—'}</p>
            </div>
            {player.previous_school && (
              <div>
                <p className="text-xs text-slate-400">Previous School</p>
                <p className="font-medium text-white">{player.previous_school}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}