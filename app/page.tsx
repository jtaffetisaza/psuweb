'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

interface Game {
  id?: number;
  Date: string;
  Time: string | null;
  Opponent: string;
  Location: string;
  Note: string | null;
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
  const [activeTab, setActiveTab] = useState<
    'roster' | 'coaching' | 'schedule' | 'depth-chart'
  >('roster');

  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<Game[]>([]);

  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'name'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchStaffData();
    fetchSchedule();
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

  async function fetchSchedule() {
    const { data, error } = await supabase
      .from('Schedule')
      .select('*')
      .order('Date', { ascending: true });

    if (error) console.error('Error fetching schedule:', error);
    else setSchedule(data || []);
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

  const handleSortToggle = (field: 'number' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredPlayers = players
    .filter((p) => {
      const matchesPos =
        selectedPosition === 'ALL' || p.position === selectedPosition;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.number.toString().includes(search);
      return matchesPos && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'number') {
        comparison = a.number - b.number;
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen px-4 py-8 font-sans text-slate-100 sm:px-8 lg:py-12">
      <header className="mx-auto mb-8 max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          2026 Football Dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Manage player depth ranks, scouting notes, coaching personnel, and
          schedule.
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5 shadow-xl shadow-black/20 backdrop-blur sm:w-fit">
          <button
            onClick={() => setActiveTab('roster')}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Player Roster
          </button>
          <button
            onClick={() => setActiveTab('coaching')}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'coaching'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Coaching Staff
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('depth-chart')}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'depth-chart'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Depth Chart
          </button>
        </div>

        {/* VIEW 1: PLAYER ROSTER */}
        {activeTab === 'roster' && (
          <>
            <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-2xl p-4 md:flex-row">
              <div className="flex flex-wrap items-center gap-1">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedPosition === pos
                        ? 'border-blue-400/30 bg-blue-500/20 text-blue-100 shadow-sm shadow-blue-950/30'
                        : 'border-transparent bg-white/[0.04] text-slate-400 hover:border-white/10 hover:bg-white/[0.08] hover:text-slate-100'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-1">
                  <button
                    onClick={() => handleSortToggle('number')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      sortBy === 'number'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    # {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    onClick={() => handleSortToggle('name')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      sortBy === 'name'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search name or jersey #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="dark-field w-full px-4 py-2.5 text-sm md:w-64"
                />
              </div>
            </div>

            <div className="glass-panel overflow-x-auto rounded-2xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-950/35 font-medium text-slate-400">
                    <th
                      className="cursor-pointer p-4 hover:text-white"
                      onClick={() => handleSortToggle('number')}
                    >
                      # {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="cursor-pointer p-4 hover:text-white"
                      onClick={() => handleSortToggle('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
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
                      className="transition hover:bg-blue-500/[0.04]"
                    >
                      <td className="p-4 font-mono font-bold text-slate-400">
                        #{player.number}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        <Link
                          href={`/player/${player.id}`}
                          className="text-blue-400 transition hover:text-blue-300 hover:underline"
                        >
                          {player.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="rounded-md border border-blue-400/15 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">
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
                          className="dark-field w-12 py-1 text-center text-xs"
                        />
                      </td>
                      <td className="p-4 text-slate-300">
                        {player.eligibility}
                      </td>
                      <td className="p-4 text-slate-300">
                        {player.height}, {player.weight} lbs
                      </td>
                      <td className="p-4 text-xs text-slate-400">
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
                              className="dark-field w-full px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() => saveNotes(player.id)}
                              className="blue-button px-3 py-1 text-xs"
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
                            className="flex min-h-[1.5rem] cursor-pointer items-center text-xs italic text-slate-300 hover:text-white"
                          >
                            {player.notes || (
                              <span className="not-italic text-slate-500">
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
            <div className="glass-panel flex flex-col items-start justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-white">
                Coaching & Support Personnel
              </h2>
              <input
                type="text"
                placeholder="Search staff or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dark-field w-full px-4 py-2.5 text-sm md:w-64"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="glass-panel flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-1 hover:border-blue-400/40"
                >
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-white">
                      {member.name}
                    </h3>
                    <p className="text-sm font-medium text-blue-400">
                      {member.title}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3 text-xs text-slate-500">
                    <span>Staff ID: #{member.id}</span>
                    <span className="text-slate-400">Football Operations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="glass-panel overflow-x-auto rounded-2xl p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              2026 Season Schedule
            </h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-950/35 font-medium text-slate-400">
                  <th className="p-3">Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Opponent</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {schedule.map((game, index) => (
                  <tr
                    key={game.id || index}
                    className="transition hover:bg-blue-500/[0.04]"
                  >
                    <td className="p-3 font-mono font-bold text-blue-400">
                      {game.Date}
                    </td>
                    <td className="p-3 text-slate-300">
                      {game.Time ? game.Time.slice(0, 5) : 'TBD'}
                    </td>
                    <td className="p-3 font-semibold text-white">
                      {game.Opponent}
                    </td>
                    <td className="p-3 text-slate-300">{game.Location}</td>
                    <td className="p-3 text-xs italic text-slate-400">
                      {game.Note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 4: DEPTH CHART */}
        {activeTab === 'depth-chart' && (
          <div className="glass-panel rounded-2xl p-6 text-slate-300">
            <h2 className="mb-2 text-xl font-bold text-white">Depth Chart</h2>
            <p className="text-sm text-slate-400">
              Depth chart view placeholder content.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}