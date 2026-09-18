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
  depth_rank: number;
  status?: string;
  injury_note?: string;
}

const UNITS = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'OL', 'OT', 'OG', 'C'],
  DEFENSE: ['DE', 'DT', 'DL', 'LB', 'OLB', 'ILB', 'CB', 'S', 'DB', 'FS', 'SS'],
  SPECIAL_TEAMS: ['K', 'P', 'LS', 'KR', 'PR']
};

export default function DepthChartPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeUnit, setActiveUnit] = useState<'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'>('DEFENSE');

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('id, number, name, position, eligibility, depth_rank, status, injury_note')
      .order('depth_rank', { ascending: true })
      .order('number', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return;
    }

    setPlayers(data || []);
  }

  const activePositions = UNITS[activeUnit];

  const unitPlayers = players.filter(p => {
    if (!p.position) return false;
    const pos = p.position.toUpperCase();
    return activePositions.some(ap => pos.includes(ap));
  });

  const groupedByPosition = activePositions.reduce((acc, pos) => {
    const posPlayers = unitPlayers.filter(p => p.position && p.position.toUpperCase().includes(pos));
    if (posPlayers.length > 0) acc[pos] = posPlayers;
    return acc;
  }, {} as Record<string, Player[]>);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Depth Chart</h1>
          <p className="text-slate-400">Position groups ranked by depth order.</p>
        </div>

        <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          {(['OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS'] as const).map(unit => (
            <button
              key={unit}
              onClick={() => setActiveUnit(unit)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeUnit === unit ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {unit.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(groupedByPosition).length === 0 ? (
          <p className="text-slate-500 italic">No players found for this unit.</p>
        ) : (
          Object.entries(groupedByPosition).map(([pos, posPlayers]) => (
            <div key={pos} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-800/80 border-b border-slate-700 p-3 px-4 flex justify-between items-center">
                <span className="font-bold text-blue-400 text-lg">{pos}</span>
                <span className="text-xs text-slate-500 font-medium">{posPlayers.length} Players</span>
              </div>
              <ul className="divide-y divide-slate-700/50">
                {posPlayers.map((player) => {
                  const isIR = String(player.status || '').trim().toUpperCase() === 'IR_OUT';

                  return (
                    <li
                      key={player.id}
                      className={`p-3 px-4 flex items-center justify-between hover:bg-slate-700/30 transition ${
                        isIR ? 'bg-red-950/40 border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-mono">
                          #{player.depth_rank || '-'}
                        </span>
                        <Link
                          href={`/player/${player.id}`}
                          className={`font-semibold hover:text-blue-400 ${
                            isIR ? 'text-red-300 line-through' : 'text-white'
                          }`}
                        >
                          {player.name}
                        </Link>
                        <span className="text-xs text-slate-400">#{player.number}</span>

                        {isIR && (
                          <span className="text-[10px] font-bold uppercase bg-red-900 text-red-100 border border-red-500 px-2 py-0.5 rounded-full">
                            IR - Out
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{player.eligibility}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}