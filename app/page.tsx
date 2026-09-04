'use client';

import { useEffect, useState } from 'react';
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
  star_rating: number | null;
  recruiting_class: number | null;
  national_rank: number | null;
  position_rank: number | null;
  state_rank: number | null;
  recruiting_position: string | null;
  recruiting_team: string | null;
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

interface DepthSlot {
  id: string;
  label: string;
  eligiblePositions: string[];
}

type DepthChartTab =
  | 'offense'
  | 'defense'
  | 'special-teams';

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
  {
    id: 'QB',
    label: 'QB',
    eligiblePositions: ['QB'],
  },
  {
    id: 'RB',
    label: 'RB',
    eligiblePositions: ['RB'],
  },
  {
    id: 'X',
    label: 'X',
    eligiblePositions: ['WR'],
  },
  {
    id: 'Y',
    label: 'Y',
    eligiblePositions: ['WR'],
  },
  {
    id: 'Z',
    label: 'Z',
    eligiblePositions: ['WR'],
  },
  {
    id: 'TE',
    label: 'TE',
    eligiblePositions: ['TE'],
  },
  {
    id: 'OT',
    label: 'OT',
    eligiblePositions: ['OL'],
  },
  {
    id: 'G1',
    label: 'G',
    eligiblePositions: ['OL'],
  },
  {
    id: 'C',
    label: 'C',
    eligiblePositions: ['OL'],
  },
  {
    id: 'G2',
    label: 'G',
    eligiblePositions: ['OL'],
  },
  {
    id: 'T',
    label: 'T',
    eligiblePositions: ['OL'],
  },
];

const DEFENSE_SLOTS: DepthSlot[] = [
  {
    id: 'DE1',
    label: 'DE',
    eligiblePositions: ['DE', 'LB'],
  },
  {
    id: 'DT1',
    label: 'DT',
    eligiblePositions: ['DT'],
  },
  {
    id: 'DT2',
    label: 'DT',
    eligiblePositions: ['DT'],
  },
  {
    id: 'DE2',
    label: 'DE',
    eligiblePositions: ['DE', 'LB'],
  },
  {
    id: 'ILB',
    label: 'ILB',
    eligiblePositions: ['LB'],
  },
  {
    id: 'OLB',
    label: 'OLB',
    eligiblePositions: ['LB'],
  },
  {
    id: 'CB',
    label: 'CB',
    eligiblePositions: ['CB', 'S'],
  },
  {
    id: 'NICKLE',
    label: 'Nickle',
    eligiblePositions: ['CB', 'S'],
  },
  {
    id: 'SS',
    label: 'SS',
    eligiblePositions: ['S'],
  },
  {
    id: 'FS',
    label: 'FS',
    eligiblePositions: ['S'],
  },
];

const SPECIAL_TEAMS_SLOTS: DepthSlot[] = [
  {
    id: 'K',
    label: 'K',
    eligiblePositions: ['K'],
  },
  {
    id: 'P',
    label: 'P',
    eligiblePositions: ['P'],
  },
  {
    id: 'LS',
    label: 'LS',
    eligiblePositions: ['LS'],
  },
];

const STATIC_DEPTH_ASSIGNMENTS: DepthAssignments = {
  QB: [
    'Rocco Becht',
    'Alex Manske',
    'Connor Barry',
    'Kase Evans',
    'Jack Lambert',
  ],

  RB: [
    'Carson Hansen',
    'James Peoples',
    'Quinton Martin Jr.',
    'Cam Wallace',
    "D'Antae Sheffey",
  ],

  X: [
    'Chase Sowell',
    'Zay Robinson',
    'Keith Jones Jr.',
    'Ben Whitver',
  ],

  Y: [
    'Brett Eskildsen',
    'Karon Brookins',
    'Peter Gonzalez',
    'Ethan Black',
  ],

  Z: [
    'Koby Howard',
    'Amarion Jackson',
    'Lyrick Samuel',
    'Logan Cunningham',
  ],

  TE: [
    'Benjamin Brahmer',
    'Andrew Rappleyea',
    'Gabe Burkle',
    'Peyton Falzone',
    'Cooper Alexander',
    'Brian Kortovich',
    'Finn Furmanek',
  ],

  OT: [
    'Malachi Goodman',
    'Owen Aliciene',
    'Mason Bandhauer',
    'Hunter Albright',
  ],

  G1: [
    'Trevor Buhr',
    'Will Tompkins',
    'Vaea Ikakoula',
    'Liam Horan',
  ],

  C: [
    'Brock Riker',
    'Dominic Rulli',
    'Jim Fitzgerald',
  ],

  G2: [
    'Cooper Cousins',
    'Tyshon Huff',
    'Donnie Harbour',
  ],

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
  ],

  DT1: [
    'Siale Taupaki',
    'Armstrong Nnodim',
    'Alijah Carnell',
    "De'Andre Cook",
    'Caleb Brewer',
  ],

  DT2: [
    'Keanu Williams',
    'Ty Blanding',
    'Dallas Vakalahi',
    'Liam Andrews',
  ],

  DE2: [
    'Ikenna Ezeogu',
    'Max Granville',
    'Alexander McPherson',
    'Mason Robinson',
    'Aidan Probst',
    'Jordan Mayer',
  ],

  ILB: [
    'Kooper Ebel',
    'Cael Brezina',
    'Chris Fileppo',
    'Caleb Bacon',
  ],

  OLB: [
    'Tony Rojas',
    'Cam Smith',
    'Alex Tatsch',
    'John Klosterman',
  ],

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

  SS: [
    'Marcus Neal Jr.',
    'Jamison Patton',
    'Ibn McDaniels',
    'Christian Askew',
  ],

  FS: [
    'Jeremiah Cooper',
    'Vaboue Toure',
    'Omarion Davis',
  ],

  K: [
    'Ryan Barker',
    'Cristiano Rosa',
    'Matthew Parker',
  ],

  P: [
    'Nathan Tiyce',
  ],

  LS: [
    'Blaise Sokach-Minnick',
    'Andrew Dufault',
  ],
};

export default function RosterDashboard() {
  const [activeTab, setActiveTab] = useState<
    'roster' | 'coaching' | 'schedule' | 'depth-chart'
  >('roster');

  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedule, setSchedule] = useState<Game[]>([]);

  const [selectedPosition, setSelectedPosition] =
    useState('ALL');

  const [search, setSearch] = useState('');

  const [sortBy, setSortBy] = useState<
    'number' | 'name'
  >('number');

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc'
  >('asc');

  const [editingNotesId, setEditingNotesId] =
    useState<number | null>(null);

  const [tempNotes, setTempNotes] = useState('');

  const [depthChartTab, setDepthChartTab] =
    useState<DepthChartTab>('offense');

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
      .order('number', { ascending: true });

    if (error) {
      console.error(
        'Error fetching players:',
        error
      );
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
      console.error(
        'Error fetching staff:',
        error
      );
      return;
    }

    setStaff((data || []) as StaffMember[]);
  }

  async function fetchSchedule() {
    const { data, error } = await supabase
      .from('Schedule')
      .select('*')
      .order('Date', { ascending: true });

    if (error) {
      console.error(
        'Error fetching schedule:',
        error
      );
      return;
    }

    setSchedule((data || []) as Game[]);
  }

  async function saveNotes(id: number) {
    const { error } = await supabase
      .from('players')
      .update({ notes: tempNotes })
      .eq('id', id);

    if (error) {
      console.error(
        'Error saving notes:',
        error
      );
      return;
    }

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === id
          ? {
              ...player,
              notes: tempNotes,
            }
          : player
      )
    );

    setEditingNotesId(null);
  }

  function handleSortToggle(
    field: 'number' | 'name'
  ) {
    if (sortBy === field) {
      setSortOrder((currentOrder) =>
        currentOrder === 'asc'
          ? 'desc'
          : 'asc'
      );
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  const filteredPlayers = players
    .filter((player) => {
      const matchesPosition =
        selectedPosition === 'ALL' ||
        player.position === selectedPosition;

      const matchesSearch =
        player.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        player.number
          .toString()
          .includes(search);

      return (
        matchesPosition &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'number') {
        comparison =
          a.number - b.number;
      } else {
        comparison =
          a.name.localeCompare(b.name);
      }

      return sortOrder === 'asc'
        ? comparison
        : -comparison;
    });

  const filteredStaff = staff.filter(
    (member) =>
      member.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.title
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  function getSlotsForTab(
    tab: DepthChartTab
  ): DepthSlot[] {
    if (tab === 'offense') {
      return OFFENSE_SLOTS;
    }

    if (tab === 'defense') {
      return DEFENSE_SLOTS;
    }

    return SPECIAL_TEAMS_SLOTS;
  }

  function normalizePlayerName(
    name: string
  ) {
    return name
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getPlayerByName(
    playerName: string
  ): Player | undefined {
    const normalizedTarget =
      normalizePlayerName(playerName);

    return players.find(
      (player) =>
        normalizePlayerName(player.name) ===
        normalizedTarget
    );
  }

  function getDepthChartPlayers(
    tab: DepthChartTab
  ) {
    let positionPool: string[] = [];

    if (tab === 'offense') {
      positionPool = [
        'QB',
        'RB',
        'WR',
        'TE',
        'OL',
      ];
    } else if (tab === 'defense') {
      positionPool = [
        'DE',
        'DT',
        'LB',
        'CB',
        'S',
      ];
    } else {
      positionPool = [
        'K',
        'P',
        'LS',
      ];
    }

    const assignedPlayerNames =
      new Set(
        Object.values(
          STATIC_DEPTH_ASSIGNMENTS
        )
          .flat()
          .map(normalizePlayerName)
      );

    return players.filter(
      (player) =>
        positionPool.includes(
          player.position
        ) &&
        !assignedPlayerNames.has(
          normalizePlayerName(
            player.name
          )
        )
    );
  }

  function renderPlayerCard(
    player: Player,
    compact = false
  ) {
    const cardPadding = compact
      ? 'p-3'
      : 'p-4';

    return (
      <div
        key={player.id}
        className={`rounded-xl border border-white/10 bg-slate-900/90 ${cardPadding}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 font-mono text-sm font-bold text-blue-300">
            #{player.number}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/player/${player.id}`}
              className="block truncate font-semibold text-white transition hover:text-blue-400 hover:underline"
            >
              {player.name}
            </Link>

            <div className="mt-0.5 text-xs text-slate-500">
              {player.position}
              {player.eligibility
                ? ` • ${player.eligibility}`
                : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDepthSlot(
    slot: DepthSlot
  ) {
    const assignedPlayers =
      STATIC_DEPTH_ASSIGNMENTS[
        slot.id
      ] || [];

    return (
      <div
        key={slot.id}
        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Position
            </div>

            <div className="text-lg font-bold text-white">
              {slot.label}
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {slot.eligiblePositions.join(
              ' / '
            )}
          </div>
        </div>

        <div className="space-y-2">
          {assignedPlayers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-5 text-center text-xs text-slate-600">
              No player assigned
            </div>
          ) : (
            assignedPlayers.map(
              (
                playerName,
                index
              ) => {
                const player =
                  getPlayerByName(
                    playerName
                  );

                if (!player) {
                  return (
                    <div
                      key={`${slot.id}-${playerName}`}
                      className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
                    >
                      <div className="text-xs font-semibold text-red-400">
                        Player not found
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        {playerName}
                      </div>
                    </div>
                  );
                }

                let stringLabel =
                  `${index + 1}th String`;

                if (index === 0) {
                  stringLabel =
                    '1st String';
                } else if (
                  index === 1
                ) {
                  stringLabel =
                    '2nd String';
                } else if (
                  index === 2
                ) {
                  stringLabel =
                    '3rd String';
                }

                return (
                  <div
                    key={`${slot.id}-${player.id}`}
                  >
                    <div className="mb-1 ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {stringLabel}
                    </div>

                    {renderPlayerCard(
                      player,
                      true
                    )}
                  </div>
                );
              }
            )
          )}
        </div>
      </div>
    );
  }

  function renderDepthChart() {
    const slots =
      getSlotsForTab(
        depthChartTab
      );

    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Depth Chart
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              2026 Penn State depth chart
            </p>
          </div>

          <div className="mt-5 flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5">
            <button
              onClick={() =>
                setDepthChartTab(
                  'offense'
                )
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                depthChartTab ===
                'offense'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Offense
            </button>

            <button
              onClick={() =>
                setDepthChartTab(
                  'defense'
                )
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                depthChartTab ===
                'defense'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Defense
            </button>

            <button
              onClick={() =>
                setDepthChartTab(
                  'special-teams'
                )
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                depthChartTab ===
                'special-teams'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Special Teams
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slots.map(
            (slot) =>
              renderDepthSlot(
                slot
              )
          )}
        </div>

        {getDepthChartPlayers(
          depthChartTab
        ).length > 0 && (
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Unassigned Players
            </h3>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {getDepthChartPlayers(
                depthChartTab
              ).map((player) =>
                renderPlayerCard(
                  player,
                  true
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPositionEditor(
    position: string
  ) {
    let relevantSlots: DepthSlot[] = [];

    if (position === 'QB') {
      relevantSlots =
        OFFENSE_SLOTS.filter(
          (slot) =>
            slot.id === 'QB'
        );
    } else if (
      position === 'RB'
    ) {
      relevantSlots =
        OFFENSE_SLOTS.filter(
          (slot) =>
            slot.id === 'RB'
        );
    } else if (
      position === 'WR'
    ) {
      relevantSlots =
        OFFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'WR'
            )
        );
    } else if (
      position === 'TE'
    ) {
      relevantSlots =
        OFFENSE_SLOTS.filter(
          (slot) =>
            slot.id === 'TE'
        );
    } else if (
      position === 'OL'
    ) {
      relevantSlots =
        OFFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'OL'
            )
        );
    } else if (
      position === 'DE'
    ) {
      relevantSlots =
        DEFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'DE'
            )
        );
    } else if (
      position === 'DT'
    ) {
      relevantSlots =
        DEFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'DT'
            )
        );
    } else if (
      position === 'LB'
    ) {
      relevantSlots =
        DEFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'LB'
            )
        );
    } else if (
      position === 'CB'
    ) {
      relevantSlots =
        DEFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'CB'
            )
        );
    } else if (
      position === 'S'
    ) {
      relevantSlots =
        DEFENSE_SLOTS.filter(
          (slot) =>
            slot.eligiblePositions.includes(
              'S'
            )
        );
    } else if (
      position === 'K'
    ) {
      relevantSlots =
        SPECIAL_TEAMS_SLOTS.filter(
          (slot) =>
            slot.id === 'K'
        );
    } else if (
      position === 'P'
    ) {
      relevantSlots =
        SPECIAL_TEAMS_SLOTS.filter(
          (slot) =>
            slot.id === 'P'
        );
    } else if (
      position === 'LS'
    ) {
      relevantSlots =
        SPECIAL_TEAMS_SLOTS.filter(
          (slot) =>
            slot.id === 'LS'
        );
    }

    const positionPlayers =
      players.filter(
        (player) =>
          player.position ===
          position
      );

    const assignedToRelevantSlots =
      new Set(
        relevantSlots
          .flatMap(
            (slot) =>
              STATIC_DEPTH_ASSIGNMENTS[
                slot.id
              ] || []
          )
          .map(
            normalizePlayerName
          )
      );

    const availablePlayers =
      positionPlayers.filter(
        (player) =>
          !assignedToRelevantSlots.has(
            normalizePlayerName(
              player.name
            )
          )
      );

    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {position} Depth Chart
              </h2>

              <p className="text-sm text-slate-400">
                Static depth chart
              </p>
            </div>

            <div className="text-xs text-slate-500">
              {positionPlayers.length}{' '}
              players on roster
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-4">
              <h3 className="font-bold text-white">
                Available {position}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Players not currently assigned.
              </p>
            </div>

            <div className="space-y-2">
              {availablePlayers.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-6 text-center text-xs text-slate-600">
                  All players assigned.
                </div>
              ) : (
                availablePlayers.map(
                  (player) =>
                    renderPlayerCard(
                      player,
                      true
                    )
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {relevantSlots.map(
              (slot) =>
                renderDepthSlot(
                  slot
                )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 font-sans text-slate-100 sm:px-8 lg:py-12">
      <header className="mx-auto mb-8 max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          2026 Football Dashboard
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Manage player roster, scouting notes,
          coaching personnel, schedule, and depth
          chart.
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5 shadow-xl shadow-black/20 backdrop-blur sm:w-fit">
          <button
            onClick={() =>
              setActiveTab('roster')
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Player Roster
          </button>

          <button
            onClick={() =>
              setActiveTab('coaching')
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'coaching'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Coaching Staff
          </button>

          <button
            onClick={() =>
              setActiveTab('schedule')
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Schedule
          </button>

          <button
            onClick={() =>
              setActiveTab('depth-chart')
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === 'depth-chart'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Depth Chart
          </button>
        </div>

        {activeTab === 'roster' && (
          <>
            <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-2xl p-4 md:flex-row">
              <div className="flex flex-wrap items-center gap-1">
                {POSITIONS.map(
                  (position) => (
                    <button
                      key={position}
                      onClick={() =>
                        setSelectedPosition(
                          position
                        )
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedPosition ===
                        position
                          ? 'border-blue-400/30 bg-blue-500/20 text-blue-100 shadow-sm shadow-blue-950/30'
                          : 'border-transparent bg-white/[0.04] text-slate-400 hover:border-white/10 hover:bg-white/[0.08] hover:text-slate-100'
                      }`}
                    >
                      {position}
                    </button>
                  )
                )}
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-1">
                  <button
                    onClick={() =>
                      handleSortToggle(
                        'number'
                      )
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      sortBy ===
                      'number'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    # {sortBy ===
                      'number' &&
                      (sortOrder ===
                      'asc'
                        ? '↑'
                        : '↓')}
                  </button>

                  <button
                    onClick={() =>
                      handleSortToggle(
                        'name'
                      )
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      sortBy ===
                      'name'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Name{' '}
                    {sortBy ===
                      'name' &&
                      (sortOrder ===
                      'asc'
                        ? '↑'
                        : '↓')}
                  </button>
                </div>

                <input
  type="text"
  placeholder="Search name or jersey #..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-blue-950 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 md:w-64"
/>
              </div>
            </div>

            {selectedPosition ===
            'ALL' ? (
              <div className="glass-panel overflow-x-auto rounded-2xl">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-950/35 font-medium text-slate-400">
                      <th
                        className="cursor-pointer p-4 hover:text-white"
                        onClick={() =>
                          handleSortToggle(
                            'number'
                          )
                        }
                      >
                        # {sortBy ===
                          'number' &&
                          (sortOrder ===
                          'asc'
                            ? '↑'
                            : '↓')}
                      </th>

                      <th
                        className="cursor-pointer p-4 hover:text-white"
                        onClick={() =>
                          handleSortToggle(
                            'name'
                          )
                        }
                      >
                        Name{' '}
                        {sortBy ===
                          'name' &&
                          (sortOrder ===
                          'asc'
                            ? '↑'
                            : '↓')}
                      </th>

                      <th className="p-4">
                        Pos
                      </th>

                      <th className="p-4">
                        Class
                      </th>

                      <th className="p-4">
                        HT / WT
                      </th>

                      <th className="p-4">
                        Hometown / Prev. School
                      </th>

                      <th className="w-72 p-4">
                        Scouting Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-700/50">
                    {filteredPlayers.map(
                      (player) => (
                        <tr
                          key={
                            player.id
                          }
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

                          <td className="p-4 text-slate-300">
                            {player.eligibility}
                          </td>

                          <td className="p-4 text-slate-300">
                            {player.height},{' '}
                            {player.weight} lbs
                          </td>

                          <td className="p-4 text-xs text-slate-400">
                            <div>
                              {player.hometown}
                            </div>

                            {player.previous_school && (
                              <div className="text-blue-400">
                                Ex:{' '}
                                {
                                  player.previous_school
                                }
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {editingNotesId ===
                            player.id ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={
                                    tempNotes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setTempNotes(
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="dark-field w-full px-2 py-1 text-xs"
                                />

                                <button
                                  onClick={() =>
                                    saveNotes(
                                      player.id
                                    )
                                  }
                                  className="blue-button px-3 py-1 text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingNotesId(
                                    player.id
                                  );
                                  setTempNotes(
                                    player.notes ||
                                      ''
                                  );
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
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              renderPositionEditor(
                selectedPosition
              )
            )}
          </>
        )}

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
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                className="dark-field w-full px-4 py-2.5 text-sm md:w-64"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map(
                (member) => (
                  <div
                    key={
                      member.id
                    }
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
                      <span>
                        Staff ID: #
                        {member.id}
                      </span>

                      <span className="text-slate-400">
                        Football Operations
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="glass-panel overflow-x-auto rounded-2xl p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              2026 Season Schedule
            </h2>

            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-950/35 font-medium text-slate-400">
                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Time
                  </th>

                  <th className="p-3">
                    Opponent
                  </th>

                  <th className="p-3">
                    Location
                  </th>

                  <th className="p-3">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/50">
                {schedule.map(
                  (
                    game,
                    index
                  ) => (
                    <tr
                      key={
                        game.id ||
                        index
                      }
                      className="transition hover:bg-blue-500/[0.04]"
                    >
                      <td className="p-3 font-mono font-bold text-blue-400">
                        {game.Date}
                      </td>

                      <td className="p-3 text-slate-300">
                        {game.Time
                          ? game.Time.slice(
                              0,
                              5
                            )
                          : 'TBD'}
                      </td>

                      <td className="p-3 font-semibold">
                        {game.id ? (
                          <Link
                            href={`/matchup/${game.id}`}
                            className="text-blue-400 transition hover:text-blue-300 hover:underline"
                          >
                            {
                              game.Opponent
                            }
                          </Link>
                        ) : (
                          <span className="text-white">
                            {
                              game.Opponent
                            }
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-slate-300">
                        {game.Location}
                      </td>

                      <td className="p-3 text-xs italic text-slate-400">
                        {game.Note ||
                          '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'depth-chart' &&
          renderDepthChart()}
      </main>
    </div>
  );
}