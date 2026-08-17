'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: number;
  number: number;
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

interface StaffMember {
  id: number;
  name: string;
  title: string;
}

const POSITIONS = [
  'ALL',
  'QB',
  'RB',
  'WR',
  'TE',
  'OL',
  'DE',
  'DT',
  'LB',
  'CB',
  'S',
  'K',
  'P',
  'LS',
];

export default function RosterDashboard() {
  // Main Tab Toggle State
  const [activeTab, setActiveTab] = useState<'roster' | 'coaching'>('roster');

  // Data States
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Roster Filter States
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchStaffData();
  }, []);

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('position', { ascending: true })
      .order('depth_rank', { ascending: true })
      .order('number', { ascending: true });

    if (error) console.error('Error fetching players:', error);
    else setPlayers(data || []);
  }

  async function fetchStaffData() {
    const { data, error } = await supabase
      .from('football_staff')
      .select('*')
      .order('id', { ascending: true });

    if (error) console.error('Error fetching staff:', error);
    else setStaff(data || []);
  }

  async function saveNotes(id: number) {
    const { error } = await supabase
      .from('players')
      .update({ notes: tempNotes })
      .eq('id', id);

    if (!error) {
      setPlayers(
        players.map((p) => (p.id === id ? { ...p, notes: tempNotes } : p))
      );
      setEditingNotesId(null);
    }
  }

  async function updateDepthRank(id: number, newRank: number) {
    const { error } = await supabase
      .from('players')
      .update({ depth_rank: newRank })
      .eq('id', id);

    if (!error) {
      setPlayers(
        players.map((p) => (p.id === id ? { ...p, depth_rank: newRank } : p))
      );
    }
  }

  const filteredPlayers = players.filter((p) => {
    const matchesPos =
      selectedPosition === 'ALL' || p.position === selectedPosition;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.number.toString().includes(search);
    return matchesPos && matchesSearch;
  });

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Blitz Football Dashboard
          </h1>
          <p className="text-slate-400">
            Manage player depth ranks, scouting notes, and coaching personnel.
          </p>
        </div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Player Roster
          </button>
          <button
            onClick={() => setActiveTab('coaching')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'coaching'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Coaching Staff
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* VIEW 1: PLAYER ROSTER */}
        {activeTab === 'roster' && (
          <>
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex flex-wrap gap-1">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      selectedPosition === pos
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search name or jersey #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-medium bg-slate-800/80">
                    <th className="p-4">#</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Pos</th>
                    <th className="p-4">Depth Order</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">HT / WT</th>
                    <th className="p-4">Hometown / Prev. School</th>
                    <th className="p-4 w-72">Scouting Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-700/30 transition"
                    >
                      <td className="p-4 font-mono font-bold text-slate-400">
                        #{player.number}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        {player.name}
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-700 px-2 py-1 rounded text-xs font-bold text-blue-400">
                          {player.position}
                        </span>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          value={player.depth_rank}
                          onChange={(e) =>
                            updateDepthRank(
                              player.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-12 bg-slate-900 border border-slate-700 text-center rounded text-xs py-1 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-4 text-slate-300">
                        {player.eligibility}
                      </td>
                      <td className="p-4 text-slate-300">
                        {player.height}, {player.weight} lbs
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        <div>{player.hometown}</div>
                        {player.previous_school && (
                          <div className="text-blue-400">
                            Ex: {player.previous_school}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {editingNotesId === player.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="bg-slate-900 border border-slate-600 px-2 py-1 rounded text-xs text-white w-full focus:outline-none"
                            />
                            <button
                              onClick={() => saveNotes(player.id)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNotesId(player.id);
                              setTempNotes(player.notes || '');
                            }}
                            className="cursor-pointer text-xs text-slate-300 hover:text-white italic min-h-[1.5rem] flex items-center"
                          >
                            {player.notes || (
                              <span className="text-slate-500 not-italic">
                                + Add notes...
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VIEW 2: COACHING & SUPPORT STAFF */}
        {activeTab === 'coaching' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                Coaching & Support Personnel
              </h2>
              <input
                type="text"
                placeholder="Search staff or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {member.name}
                    </h3>
                    <p className="text-sm font-medium text-blue-400">
                      {member.title}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                    <span>Staff ID: #{member.id}</span>
                    <span className="text-slate-400">Football Operations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
