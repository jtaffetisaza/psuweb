'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchPlayer(params.id as string);
    }
  }, [params?.id]);

  async function fetchPlayer(id: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching player:', error);
    } else if (data) {
      setPlayer(data);
      setNotes(data.notes || '');
    }
  }

  async function saveNotes() {
    if (!player) return;
    setSaving(true);
    await supabase.from('players').update({ notes }).eq('id', player.id);
    setSaving(false);
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-400">
        Loading player profile...
      </div>
    );
  }

  // Fallback check to grab whichever column name exists in Supabase
  const jerseyNum =
    player.number ?? player.jersey_number ?? player.jersey ?? 'N/A';

  return (
    <div className="max-w-4xl mx-auto p-8">
      <button
        onClick={() => router.back()}
        className="text-xs text-slate-400 hover:text-white mb-6 block"
      >
        &larr; Back
      </button>

      {/* Header Card */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl font-black text-blue-500 font-mono">
              #{jerseyNum}
            </span>
            <h1 className="text-3xl font-bold text-white">{player.name}</h1>
          </div>
          <p className="text-slate-400 text-sm">
            {player.position} &bull; Depth Rank: #{player.depth_rank || '-'}
          </p>
        </div>
        <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold">
          {player.eligibility}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Physical Specs
          </h2>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">Jersey Number</span>
            <span className="text-white font-medium font-mono">
              #{jerseyNum}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">Height</span>
            <span className="text-white font-medium">
              {player.height || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">Weight</span>
            <span className="text-white font-medium">
              {player.weight ? `${player.weight} lbs` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Background
          </h2>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">Hometown</span>
            <span className="text-white font-medium">
              {player.hometown || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">High School</span>
            <span className="text-white font-medium">
              {player.high_school || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-700 pb-2 text-sm">
            <span className="text-slate-400">Previous School</span>
            <span className="text-white font-medium">
              {player.previous_school || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Scouting & Staff Notes
        </h2>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add detailed evaluation notes..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={saveNotes}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
        >
          {saving ? 'Saving...' : 'Save Profile Notes'}
        </button>
      </div>
    </div>
  );
}
