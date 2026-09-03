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
}

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (playerId) {
      fetchPlayer();
    }
  }, [playerId]);

  async function fetchPlayer() {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('Error fetching player details:', error);
    } else if (data) {
      setPlayer(data);
      setNotes(data.notes || '');
    }
    setLoading(false);
  }

  async function saveNotes() {
    if (!player) return;
    setSaving(true);
    const { error } = await supabase
      .from('players')
      .update({ notes })
      .eq('id', player.id);

    setSaving(false);
    if (!error) {
      setPlayer({ ...player, notes });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading player profile...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-100">
        <h2 className="text-2xl font-bold text-white">Player Not Found</h2>
        <p className="mt-2 text-slate-400">
          Could not find player with ID #{playerId}.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const jerseyNum = player.number ?? player.jersey_number ?? player.jersey ?? 0;

  return (
    <div className="min-h-screen px-4 py-8 font-sans text-slate-100 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-blue-400 transition hover:text-blue-300 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        {/* Player Header Banner */}
        <div className="glass-panel flex flex-col justify-between gap-6 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 text-3xl font-black text-white shadow-lg shadow-blue-950/50">
              #{jerseyNum}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">
                {player.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-md border border-blue-400/20 bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                  {player.position}
                </span>
                <span className="text-sm text-slate-400">
                  Depth Rank: #{player.depth_rank || '-'}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 text-left sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-xs text-slate-400">Eligibility Class</p>
            <p className="text-lg font-bold text-white">{player.eligibility}</p>
          </div>
        </div>

        {/* Physical & Recruiting Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-400">Height</p>
            <p className="mt-1 text-xl font-bold text-white">{player.height}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-400">Weight</p>
            <p className="mt-1 text-xl font-bold text-white">
              {player.weight} lbs
            </p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-400">Hometown</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {player.hometown || 'N/A'}
            </p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-400">High School / Prev. School</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {player.previous_school
                ? `Ex: ${player.previous_school}`
                : player.high_school || 'N/A'}
            </p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-400">247 Composite</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-lg font-bold text-amber-400">
                {'★'.repeat(player.star_rating || 3)}
              </span>
              {player.composite_rating && (
                <span className="text-xs text-slate-400">
                  ({player.composite_rating.toFixed(4)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scouting Notes Editor */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Scouting & Staff Notes
            </h2>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-400">
                ✓ Saved successfully!
              </span>
            )}
          </div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add detailed evaluation notes..."
            className="dark-field w-full rounded-xl p-4 text-sm leading-relaxed text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:from-blue-600 hover:to-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}