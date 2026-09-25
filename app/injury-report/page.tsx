'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Player {
  id: number;
  number: number;
  name: string;
  position: string;
  eligibility: string;
  status?: string;
  injury_note?: string;
}

// Order: Probable -> Questionable -> Doubtful -> Out -> Injured Reserve (IR)
const DESIGNATIONS = [
  { key: 'PROBABLE', label: 'Probable', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { key: 'QUESTIONABLE', label: 'Questionable', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'DOUBTFUL', label: 'Doubtful', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { key: 'OUT', label: 'Out', color: 'bg-red-100 text-red-800 border-red-300' },
  { key: 'IR', label: 'Injured Reserve (IR)', color: 'bg-rose-950 text-red-100 border-rose-800' },
] as const;

export default function InjuryReportPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInjuredPlayers();
  }, []);

  async function fetchInjuredPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('id, number, name, position, eligibility, status, injury_note')
      .not('status', 'is', null);

    if (error) {
      console.error('Error fetching injury report:', error);
    } else {
      setPlayers((data || []) as Player[]);
    }
    setLoading(false);
  }

  const getCategory = (status?: string) => {
    const norm = String(status || '').trim().toUpperCase();
    if (['PROBABLE'].includes(norm)) return 'PROBABLE';
    if (['QUESTIONABLE'].includes(norm)) return 'QUESTIONABLE';
    if (['DOUBTFUL'].includes(norm)) return 'DOUBTFUL';
    if (['OUT'].includes(norm)) return 'OUT';
    if (['IR', 'IR_OUT', 'IR - OUT', 'INJURED'].includes(norm)) return 'IR';
    return null;
  };

  return (
    <div className="min-h-screen font-sans text-slate-900">
      <header className="mb-8">
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Penn State Nittany Lions
        </h1>
        <p className="text-base font-bold text-sky-700">
          2026 Injury Report
        </p>
      </header>

      {loading ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-500">
          Loading injury report...
        </div>
      ) : (
        <div className="space-y-8">
          {DESIGNATIONS.map((group) => {
            const groupPlayers = players.filter(
              (p) => getCategory(p.status) === group.key
            );

            return (
              <div
                key={group.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-slate-900">{group.label}</h2>
                  <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                    {groupPlayers.length} {groupPlayers.length === 1 ? 'Player' : 'Players'}
                  </span>
                </div>

                {groupPlayers.length === 0 ? (
                  <div className="p-6 text-sm text-slate-400 italic">
                    No players listed under {group.label.toLowerCase()}.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {groupPlayers.map((player) => (
                      <li
                        key={player.id}
                        className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            #{player.number}
                          </span>
                          <div>
                            <Link
                              href={`/player/${player.id}`}
                              className="font-bold text-slate-900 hover:text-blue-800 transition hover:underline"
                            >
                              {player.name}
                            </Link>
                            <span className="text-xs text-slate-500 ml-2">
                              ({player.position} • {player.eligibility})
                            </span>
                            {player.injury_note && (
                              <p className="text-xs text-slate-600 mt-1">
                                {player.injury_note}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`self-start sm:self-center text-xs font-bold uppercase border px-3 py-1 rounded-full ${group.color}`}
                        >
                          {player.status || group.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}