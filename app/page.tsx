'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  star_rating: number | null;
  recruiting_class: number | null;
  national_rank: number | null;
  position_rank: number | null;
  state_rank: number | null;
  recruiting_position: string | null;
  recruiting_team: string | null;
  scouting_tag: string | null;
  scouting_note: string | null;
  status?: string;
  injury_note?: string;
}

interface StaffMember {
  id: number;
  name: string;
  title: string;
}

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

interface DepthSlot {
  id: string;
  label: string;
  eligiblePositions: string[];
}

type NavTab = 'roster' | 'coaching' | 'schedule' | 'depth-chart' | 'injury-report';
type DepthChartSubTab = 'offense' | 'defense' | 'special-teams';

type DepthAssignments = Record<string, string[]>;

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

const OFFENSE_SLOTS: DepthSlot[] = [
  { id: 'QB', label: 'QB', eligiblePositions: ['QB'] },
  { id: 'RB', label: 'RB', eligiblePositions: ['RB'] },
  { id: 'X', label: 'X', eligiblePositions: ['WR'] },
  { id: 'Y', label: 'Y', eligiblePositions: ['WR'] },
  { id: 'Z', label: 'Z', eligiblePositions: ['WR'] },
  { id: 'TE', label: 'TE', eligiblePositions: ['TE'] },
  { id: 'OT', label: 'OT', eligiblePositions: ['OL'] },
  { id: 'G1', label: 'G', eligiblePositions: ['OL'] },
  { id: 'C', label: 'C', eligiblePositions: ['OL'] },
  { id: 'G2', label: 'G', eligiblePositions: ['OL'] },
  { id: 'T', label: 'T', eligiblePositions: ['OL'] },
];

const DEFENSE_SLOTS: DepthSlot[] = [
  { id: 'DE1', label: 'DE', eligiblePositions: ['DE', 'LB'] },
  { id: 'DT1', label: 'DT', eligiblePositions: ['DT'] },
  { id: 'DT2', label: 'DT', eligiblePositions: ['DT'] },
  { id: 'DE2', label: 'DE', eligiblePositions: ['DE', 'LB'] },
  { id: 'ILB', label: 'ILB', eligiblePositions: ['LB'] },
  { id: 'OLB', label: 'OLB', eligiblePositions: ['LB'] },
  { id: 'CB', label: 'CB', eligiblePositions: ['CB', 'S'] },
  { id: 'NICKLE', label: 'Nickle', eligiblePositions: ['CB', 'S'] },
  { id: 'SS', label: 'SS', eligiblePositions: ['S'] },
  { id: 'FS', label: 'FS', eligiblePositions: ['S'] },
];

const SPECIAL_TEAMS_SLOTS: DepthSlot[] = [
  { id: 'K', label: 'K', eligiblePositions: ['K'] },
  { id: 'P', label: 'P', eligiblePositions: ['P'] },
  { id: 'LS', label: 'LS', eligiblePositions: ['LS'] },
  { id: 'KR', label: 'KR', eligiblePositions: ['WR', 'RB', 'CB', 'S'] },
  { id: 'PR', label: 'PR', eligiblePositions: ['WR', 'RB', 'CB', 'S'] },
];

const STATIC_DEPTH_ASSIGNMENTS: DepthAssignments = {
  QB: ['Rocco Becht', 'Alex Manske', 'Connor Barry', 'Kase Evans', 'Jack Lambert'],
  RB: [
    'Carson Hansen',
    'James Peoples',
    'Quinton Martin Jr.',
    'Cam Wallace',
    "D'Antae Sheffey",
    "Amar'e Glover",
    'Jeremy Washington',
  ],
  X: ['Chase Sowell', 'Zay Robinson', 'Keith Jones Jr.', 'Ben Whitver'],
  Y: ['Brett Eskildsen', 'Karon Brookins', 'Peter Gonzalez', 'Ethan Black'],
  Z: [
    'Amarion Jackson',
    'Lyrick Samuel',
    'Logan Cunningham',
    'Hank Lustig',
    'Koby Howard',
  ],
  TE: [
    'Benjamin Brahmer',
    'Andrew Rappleyea',
    'Gabe Burkle',
    'Peyton Falzone',
    'Cooper Alexander',
    'Brian Kortovich',
    'Finn Furmanek',
    'Jake Lukac',
  ],
  OT: [
    'Malachi Goodman',
    'Owen Aliciene',
    'Mason Bandhauer',
    'Hunter Albright',
    'Pete Eglitis',
  ],
  G1: ['Trevor Buhr', 'Vaea Ikakoula', 'Liam Horan', 'Will Tompkins'],
  C: ['Brock Riker', 'Dominic Rulli', 'Jim Fitzgerald'],
  G2: ['Cooper Cousins', 'Tyshon Huff', 'Donnie Harbour'],
  T: [
    'Anthony Donkoh',
    'Garrett Sexton',
    'Chimdy Onoh',
    'Henry Boehme',
    'Kuol Kuol II',
  ],
  DE1: [
    'Yvan Kemajou',
    'LaVar Arrington II',
    'Jackson Ford',
    'Dayshaun Burnett',
    'Bobby Mears',
    'Elijah Reeder',
  ],
  DT1: [
    'Siale Taupaki',
    'Armstrong Nnodim',
    'Alijah Carnell',
    "De'Andre Cook",
    'Caleb Brewer',
  ],
  DT2: ['Keanu Williams', 'Ty Blanding', 'Dallas Vakalahi', 'Liam Andrews'],
  DE2: [
    'Ikenna Ezeogu',
    'Caleb Bacon',
    'Alexander McPherson',
    'Aidan Probst',
    'Jordan Mayer',
    'Mason Robinson',
    'Max Granville',
  ],
  ILB: ['Kooper Ebel', 'Cael Brezina', 'Chris Fileppo', 'Keian Kaiser', 'Josh Banks'],
  OLB: ['Tony Rojas', 'Cam Smith', 'Alex Tatsch', 'John Klosterman', 'Evan Wolff'],
  CB: [
    'Audavion Collins',
    'Zion Tracy',
    'Jahmir Joseph',
    'Joshua Johnson',
    'Tyler Armstead',
  ],
  NICKLE: [
    'Josiah Zayas',
    'Daryus Dixson',
    'Xxavier Thomas',
    'Donte Nastasi',
    'Tyrell Chatman',
    'Hunter Sowell',
    'Max Heffner',
    'Bryson Williams',
    'Jashaun Green',
  ],
  SS: ['Marcus Neal Jr.', 'Jamison Patton', 'Ibn McDaniels', 'Christian Askew'],
  FS: ['Jeremiah Cooper', 'Vaboue Toure', 'Omarion Davis', 'Jake Laverde'],
  K: ['Ryan Barker', 'Cristiano Rosa', 'Matthew Parker'],
  P: ['Nathan Tiyce', 'Lucas Tenbrock'],
  LS: ['Blaise Sokach-Minnick', 'Andrew Dufault'],
  KR: ['Zay Robinson', 'Zion Tracy', 'Quinton Martin Jr.'],
  PR: ['Zay Robinson', 'Zion Tracy', 'Koby Howard'],
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as NavTab) || 'roster';

  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<Game[]>([]);

  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'name'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [depthChartSubTab, setDepthChartSubTab] = useState<DepthChartSubTab>('offense');

  useEffect(() => {
    fetchPlayers();
    fetchStaffData();
    fetchSchedule();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as NavTab;
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*, status, injury_note')
      .order('position', { ascending: true })
      .order('number', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      return;
    }

    setPlayers((data || []) as Player[]);
  }

  async function fetchStaffData() {
    const { data, error } = await supabase
      .from('football_staff')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      return;
    }

    setStaff((data || []) as StaffMember[]);
  }

  async function fetchSchedule() {
    const { data, error } = await supabase
      .from('matchups')
      .select('*')
      .eq('season', 2026)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching matchups:', error);
      return;
    }

    setSchedule((data || []) as Game[]);
  }

  function handleSortToggle(field: 'number' | 'name') {
    if (sortBy === field) {
      setSortOrder((currentOrder) => (currentOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  const isPlayerInjured = (status?: string) => {
    const normalized = String(status || '').trim().toUpperCase();
    return ['IR_OUT', 'IR - OUT', 'IR OUT', 'IR', 'OUT', 'INJURED'].includes(normalized);
  };

  const filteredPlayers = players
    .filter((player) => {
      const matchesPosition =
        selectedPosition === 'ALL' || player.position === selectedPosition;

      const matchesSearch =
        player.name.toLowerCase().includes(search.toLowerCase()) ||
        player.number.toString().includes(search);

      return matchesPosition && matchesSearch;
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
    (member) =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.title.toLowerCase().includes(search.toLowerCase())
  );

  const injuredPlayers = players.filter((player) => isPlayerInjured(player.status));

  function getSlotsForSubTab(tab: DepthChartSubTab): DepthSlot[] {
    if (tab === 'offense') return OFFENSE_SLOTS;
    if (tab === 'defense') return DEFENSE_SLOTS;
    return SPECIAL_TEAMS_SLOTS;
  }

  function normalizePlayerName(name: string) {
    return name
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getPlayerByName(playerName: string): Player | undefined {
    const normalizedTarget = normalizePlayerName(playerName);
    return players.find(
      (player) => normalizePlayerName(player.name) === normalizedTarget
    );
  }

  function getUnassignedDepthPlayers(tab: DepthChartSubTab) {
    let positionPool: string[] = [];
    if (tab === 'offense') {
      positionPool = ['QB', 'RB', 'WR', 'TE', 'OL'];
    } else if (tab === 'defense') {
      positionPool = ['DE', 'DT', 'LB', 'CB', 'S'];
    } else {
      positionPool = ['K', 'P', 'LS'];
    }

    const assignedPlayerNames = new Set(
      Object.values(STATIC_DEPTH_ASSIGNMENTS)
        .flat()
        .map(normalizePlayerName)
    );

    return players.filter(
      (player) =>
        positionPool.includes(player.position) &&
        !assignedPlayerNames.has(normalizePlayerName(player.name))
    );
  }

  function renderPlayerCard(player: Player, compact = false) {
    const cardPadding = compact ? 'p-3' : 'p-4';
    const isIR = isPlayerInjured(player.status);

    return (
      <div
        key={player.id}
        className={`rounded-xl border transition ${cardPadding} ${
          isIR
            ? 'border-red-300 bg-red-50 border-l-4 border-l-red-600'
            : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-sm font-bold text-slate-700 border border-slate-200">
            #{player.number}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/player/${player.id}`}
                className={`block truncate font-bold transition hover:underline ${
                  isIR ? 'text-red-700 line-through' : 'text-slate-900 hover:text-blue-800'
                }`}
              >
                {player.name}
              </Link>

              {isIR && (
                <span className="rounded-full bg-red-100 border border-red-300 px-2 py-0.5 text-[10px] font-bold text-red-800 uppercase tracking-wide">
                  {player.status || 'IR - Out'}
                </span>
              )}
            </div>

            <div className="mt-0.5 text-xs text-slate-500 font-medium">
              {player.position}
              {player.eligibility ? ` • ${player.eligibility}` : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDepthSlot(slot: DepthSlot) {
    const rawAssignedPlayers = STATIC_DEPTH_ASSIGNMENTS[slot.id] || [];

    const activePlayers: { playerName: string; player?: Player }[] = [];
    const injuredSlotPlayers: { playerName: string; player?: Player }[] = [];

    rawAssignedPlayers.forEach((playerName) => {
      const player = getPlayerByName(playerName);
      if (isPlayerInjured(player?.status)) {
        injuredSlotPlayers.push({ playerName, player });
      } else {
        activePlayers.push({ playerName, player });
      }
    });

    const sortedPlayers = [...activePlayers, ...injuredSlotPlayers];

    return (
      <div
        key={slot.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Position
            </div>
            <div className="text-lg font-bold text-slate-900">{slot.label}</div>
          </div>

          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {slot.eligiblePositions.join(' / ')}
          </div>
        </div>

        <div className="space-y-2">
          {sortedPlayers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
              No player assigned
            </div>
          ) : (
            sortedPlayers.map(({ playerName, player }, index) => {
              if (!player) {
                return (
                  <div
                    key={`${slot.id}-${playerName}`}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="text-xs font-semibold text-red-700">
                      Player not found
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {playerName}
                    </div>
                  </div>
                );
              }

              const isIR = isPlayerInjured(player.status);

              let stringLabel = `${index + 1}th String`;
              if (index === 0) stringLabel = '1st String';
              else if (index === 1) stringLabel = '2nd String';
              else if (index === 2) stringLabel = '3rd String';

              if (isIR) {
                stringLabel = 'Injured / Out';
              }

              return (
                <div key={`${slot.id}-${player.id}`}>
                  <div className="mb-1 ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {stringLabel}
                  </div>
                  {renderPlayerCard(player, true)}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderDepthChart() {
    const slots = getSlotsForSubTab(depthChartSubTab);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Depth Chart</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              2026 Penn State depth chart
            </p>
          </div>

          <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5 self-start sm:self-auto">
            <button
              onClick={() => setDepthChartSubTab('offense')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                depthChartSubTab === 'offense'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Offense
            </button>

            <button
              onClick={() => setDepthChartSubTab('defense')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                depthChartSubTab === 'defense'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Defense
            </button>

            <button
              onClick={() => setDepthChartSubTab('special-teams')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                depthChartSubTab === 'special-teams'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Special Teams
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => renderDepthSlot(slot))}
        </div>

        {getUnassignedDepthPlayers(depthChartSubTab).length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unassigned Players
            </h3>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {getUnassignedDepthPlayers(depthChartSubTab).map((player) =>
                renderPlayerCard(player, true)
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-12 pt-4">
      <main className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <>
            <div className="bg-white flex flex-col items-center justify-between gap-4 rounded-2xl p-4 border border-slate-200 shadow-sm md:flex-row">
              <div className="flex flex-wrap items-center gap-1.5">
                {POSITIONS.map((position) => (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      selectedPosition === position
                        ? 'border-blue-800 bg-blue-800 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => handleSortToggle('number')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      sortBy === 'number'
                        ? 'bg-blue-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    # {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>

                  <button
                    onClick={() => handleSortToggle('name')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      sortBy === 'name'
                        ? 'bg-blue-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 md:w-64"
                />
              </div>
            </div>

            <div className="bg-white overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                    <th
                      className="cursor-pointer p-4 hover:text-slate-900"
                      onClick={() => handleSortToggle('number')}
                    >
                      # {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="cursor-pointer p-4 hover:text-slate-900"
                      onClick={() => handleSortToggle('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-4">Pos</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">HT / WT</th>
                    <th className="p-4">Hometown / Prev. School</th>
                    <th className="w-72 p-4">Scouting</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPlayers.map((player) => {
                    const isIR = isPlayerInjured(player.status);

                    return (
                      <tr
                        key={player.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="p-4 font-mono font-bold text-slate-500">
                          #{player.number}
                        </td>

                        <td className="p-4 font-semibold">
                          <Link
                            href={`/player/${player.id}`}
                            className={`transition hover:underline ${
                              isIR ? 'text-red-700 line-through' : 'text-slate-900 hover:text-blue-800'
                            }`}
                          >
                            {player.name}
                          </Link>
                        </td>

                        <td className="p-4">
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                            {player.position}
                          </span>
                        </td>

                        <td className="p-4 text-slate-600">
                          {player.eligibility}
                        </td>

                        <td className="p-4 text-slate-600">
                          {player.height}, {player.weight} lbs
                        </td>

                        <td className="p-4 text-xs text-slate-500">
                          <div className="font-medium text-slate-700">{player.hometown}</div>
                          {player.previous_school && (
                            <div className="text-slate-600 mt-0.5">
                              Ex: {player.previous_school}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          {isIR && (
                            <span className="mb-1 inline-block rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800">
                              {player.status || 'IR - OUT'}
                            </span>
                          )}
                          {player.scouting_tag && !isIR && (
                            <div className="mb-1">
                              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                {player.scouting_tag}
                              </span>
                            </div>
                          )}
                          {(player.injury_note || player.scouting_note) ? (
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {player.injury_note || player.scouting_note}
                            </p>
                          ) : (
                            !isIR && <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* COACHING STAFF TAB */}
        {activeTab === 'coaching' && (
          <div className="space-y-6">
            <div className="bg-white flex flex-col items-start justify-between gap-4 rounded-2xl p-4 border border-slate-200 shadow-sm sm:flex-row sm:items-center">
              <h2 className="text-lg font-bold text-slate-900">
                Coaching & Support Personnel
              </h2>

              <input
                type="text"
                placeholder="Search staff or title..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800 md:w-64"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200 shadow-sm flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-slate-900">
                      {member.name}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {member.title}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>Staff ID: #{member.id}</span>
                    <span className="font-medium text-slate-600">Football Operations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="bg-white overflow-x-auto rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  2026 Season Schedule
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select any matchup to view game breakdown.
                </p>
              </div>
            </div>

            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                  <th className="p-3">Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Opponent</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {schedule.map((game) => (
                  <tr
                    key={game.id}
                    className="group transition hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="p-3 font-mono font-medium text-slate-700">
                      <Link href={`/matchup/${game.id}`} className="block w-full">
                        {game.date}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">
                      <Link href={`/matchup/${game.id}`} className="block w-full">
                        {game.time ? game.time.slice(0, 5) : 'TBD'}
                      </Link>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 group-hover:text-blue-800 group-hover:underline">
                      <Link href={`/matchup/${game.id}`} className="block w-full">
                        {game.opponent}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">
                      <Link href={`/matchup/${game.id}`} className="block w-full">
                        {game.location || 'TBD'}
                      </Link>
                    </td>
                    <td className="p-3 text-xs italic text-slate-500">
                      <Link href={`/matchup/${game.id}`} className="block w-full">
                        {game.note || '—'}
                      </Link>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/matchup/${game.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                      >
                        View Breakdown →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {schedule.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                No games found for the 2026 season.
              </div>
            )}
          </div>
        )}

        {/* DEPTH CHART TAB */}
        {activeTab === 'depth-chart' && renderDepthChart()}

        {/* INJURY REPORT TAB */}
        {activeTab === 'injury-report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Official Injury & Availability Report
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Current student-athletes unavailable or on Injured Reserve (IR)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {injuredPlayers.map((player) => renderPlayerCard(player))}
            </div>

            {injuredPlayers.length === 0 && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 font-medium">
                No players currently listed on the availability or injury report.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function RosterDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 font-medium">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}