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

  // Recruiting
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

type DepthAssignments = Record<string, number[]>;

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

const ALL_DEPTH_SLOTS = [
  ...OFFENSE_SLOTS,
  ...DEFENSE_SLOTS,
  ...SPECIAL_TEAMS_SLOTS,
];

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

  const [depthAssignments, setDepthAssignments] =
    useState<DepthAssignments>({});

  const [draggedPlayerId, setDraggedPlayerId] =
    useState<number | null>(null);

  const [draggedFromSlot, setDraggedFromSlot] =
    useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchStaffData();
    fetchSchedule();
  }, []);

  useEffect(() => {
    initializeDepthAssignments();
  }, [players]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (Object.keys(depthAssignments).length === 0) {
      return;
    }

    window.localStorage.setItem(
      'psu-football-depth-chart-v2',
      JSON.stringify(depthAssignments)
    );
  }, [depthAssignments]);

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
        matchesPosition && matchesSearch
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'number') {
        comparison = a.number - b.number;
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

  function initializeDepthAssignments() {
    if (players.length === 0) {
      return;
    }

    const validPlayerIds = new Set(
      players.map((player) => player.id)
    );

    let saved: DepthAssignments | null =
      null;

    if (typeof window !== 'undefined') {
      try {
        const stored =
          window.localStorage.getItem(
            'psu-football-depth-chart-v2'
          );

        if (stored) {
          const parsed = JSON.parse(
            stored
          );

          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            saved =
              parsed as DepthAssignments;
          }
        }
      } catch (error) {
        console.error(
          'Error loading depth chart:',
          error
        );
      }
    }

    const cleaned: DepthAssignments = {};

    if (saved) {
      if (
        Array.isArray(saved.MIKE) &&
        !Array.isArray(saved.ILB)
      ) {
        saved.ILB = saved.MIKE;
      }

      if (!Array.isArray(saved.OLB)) {
        saved.OLB = [
          ...(Array.isArray(saved.WILL)
            ? saved.WILL
            : []),
          ...(Array.isArray(saved.SAM)
            ? saved.SAM
            : []),
        ];
      }
    }

    ALL_DEPTH_SLOTS.forEach((slot) => {
      const ids: number[] =
        saved &&
        Array.isArray(saved[slot.id])
          ? saved[slot.id]
          : [];

      cleaned[slot.id] = ids.filter(
        (id, index, array) =>
          validPlayerIds.has(id) &&
          array.indexOf(id) === index
      );
    });

    const assignedIds = new Set(
      Object.values(cleaned).flat()
    );

    const unassignedPlayers =
      players.filter(
        (player) =>
          !assignedIds.has(player.id)
      );

    const addToSlot = (
      slotId: string,
      player: Player
    ) => {
      if (!cleaned[slotId]) {
        cleaned[slotId] = [];
      }

      if (
        !cleaned[slotId].includes(
          player.id
        )
      ) {
        cleaned[slotId].push(
          player.id
        );

        assignedIds.add(player.id);
      }
    };

    const addPlayersToSlots = (
      playerPosition: string,
      slotIds: string[]
    ) => {
      const availablePlayers =
        unassignedPlayers.filter(
          (player) =>
            player.position ===
              playerPosition &&
            !assignedIds.has(
              player.id
            )
        );

      availablePlayers.forEach(
        (player, index) => {
          const slotId =
            slotIds[
              index % slotIds.length
            ];

          addToSlot(
            slotId,
            player
          );
        }
      );
    };

    addPlayersToSlots('QB', ['QB']);
    addPlayersToSlots('RB', ['RB']);

    addPlayersToSlots(
      'WR',
      ['X', 'Y', 'Z']
    );

    addPlayersToSlots('TE', ['TE']);

    addPlayersToSlots(
      'OL',
      ['OT', 'G1', 'C', 'G2', 'T']
    );

    addPlayersToSlots(
      'DE',
      ['DE1', 'DE2']
    );

    addPlayersToSlots(
      'DT',
      ['DT1', 'DT2']
    );

    addPlayersToSlots(
      'LB',
      ['ILB', 'OLB']
    );

    addPlayersToSlots(
      'CB',
      ['CB', 'NICKLE']
    );

    addPlayersToSlots(
      'S',
      ['SS', 'FS', 'NICKLE']
    );

    addPlayersToSlots('K', ['K']);
    addPlayersToSlots('P', ['P']);
    addPlayersToSlots('LS', ['LS']);

    setDepthAssignments(cleaned);
  }

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

    const assignedPlayerIds =
      new Set(
        Object.values(
          depthAssignments
        ).flat()
      );

    return players.filter(
      (player) =>
        positionPool.includes(
          player.position
        ) &&
        !assignedPlayerIds.has(
          player.id
        )
    );
  }

  function getPlayerById(
    playerId: number
  ): Player | undefined {
    return players.find(
      (player) =>
        player.id === playerId
    );
  }

  function playerCanEnterSlot(
    player: Player,
    slot: DepthSlot
  ) {
    return slot.eligiblePositions.includes(
      player.position
    );
  }

  function removePlayerFromAllSlots(
    playerId: number,
    assignments: DepthAssignments
  ) {
    Object.keys(assignments).forEach(
      (slotId) => {
        assignments[slotId] =
          assignments[slotId].filter(
            (id) =>
              id !== playerId
          );
      }
    );
  }

  function movePlayerToSlot(
    playerId: number,
    slotId: string,
    targetIndex?: number
  ) {
    const slot =
      ALL_DEPTH_SLOTS.find(
        (item) =>
          item.id === slotId
      );

    const player =
      getPlayerById(playerId);

    if (!slot || !player) {
      return;
    }

    if (
      !playerCanEnterSlot(
        player,
        slot
      )
    ) {
      return;
    }

    setDepthAssignments(
      (currentAssignments) => {
        const nextAssignments: DepthAssignments =
          {};

        Object.keys(
          currentAssignments
        ).forEach((key) => {
          nextAssignments[key] = [
            ...(currentAssignments[
              key
            ] || []),
          ];
        });

        ALL_DEPTH_SLOTS.forEach(
          (item) => {
            if (
              !nextAssignments[
                item.id
              ]
            ) {
              nextAssignments[
                item.id
              ] = [];
            }
          }
        );

        removePlayerFromAllSlots(
          playerId,
          nextAssignments
        );

        const destination =
          nextAssignments[
            slotId
          ] || [];

        const insertAt =
          typeof targetIndex ===
          'number'
            ? Math.max(
                0,
                Math.min(
                  targetIndex,
                  destination.length
                )
              )
            : destination.length;

        destination.splice(
          insertAt,
          0,
          playerId
        );

        nextAssignments[
          slotId
        ] = destination;

        return nextAssignments;
      }
    );
  }

  function handleDragStart(
    playerId: number,
    fromSlot: string | null
  ) {
    setDraggedPlayerId(
      playerId
    );

    setDraggedFromSlot(
      fromSlot
    );
  }

  function handleDragEnd() {
    setDraggedPlayerId(null);
    setDraggedFromSlot(null);
  }

  function handleDropOnSlot(
    slotId: string,
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (
      draggedPlayerId === null
    ) {
      return;
    }

    movePlayerToSlot(
      draggedPlayerId,
      slotId
    );

    handleDragEnd();
  }

  function handleDropOnPlayer(
    slotId: string,
    targetIndex: number,
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (
      draggedPlayerId === null
    ) {
      return;
    }

    movePlayerToSlot(
      draggedPlayerId,
      slotId,
      targetIndex
    );

    handleDragEnd();
  }

  function renderPlayerCard(
    player: Player,
    fromSlot: string | null,
    compact = false
  ) {
    return (
      <div
        key={player.id}
        draggable
        onDragStart={(event) => {
          event.stopPropagation();

          handleDragStart(
            player.id,
            fromSlot
          );
        }}
        onDragEnd={handleDragEnd}
        className={`cursor-grab rounded-xl border border-white/10 bg-slate-900/90 transition hover:border-blue-400/50 hover:bg-slate-800/90 active:cursor-grabbing ${
          compact
            ? 'p-3'
            : 'p-4'
        } ${
          draggedPlayerId ===
          player.id
            ? 'opacity-40'
            : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 font-mono text-sm font-bold text-blue-300">
            #{player.number}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-white">
              {player.name}
            </div>

            <div className="mt-0.5 text-xs text-slate-500">
              {player.position}
              {player.eligibility
                ? ` • ${player.eligibility}`
                : ''}
            </div>
          </div>

          <div className="text-slate-600">
            ⋮⋮
          </div>
        </div>
      </div>
    );
  }

  function renderDepthSlot(
    slot: DepthSlot
  ) {
    const assignedIds =
      depthAssignments[
        slot.id
      ] || [];

    return (
      <div
        key={slot.id}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) =>
          handleDropOnSlot(
            slot.id,
            event
          )
        }
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
          {assignedIds.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-5 text-center text-xs text-slate-600">
              Drag player here
            </div>
          ) : (
            assignedIds.map(
              (
                playerId,
                index
              ) => {
                const player =
                  getPlayerById(
                    playerId
                  );

                if (!player) {
                  return null;
                }

                return (
                  <div
                    key={`${slot.id}-${player.id}`}
                    onDragOver={(
                      event
                    ) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) =>
                      handleDropOnPlayer(
                        slot.id,
                        index,
                        event
                      )
                    }
                  >
                    <div className="mb-1 ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {index ===
                      0
                        ? '1st String'
                        : index ===
                          1
                          ? '2nd String'
                          : index ===
                            2
                            ? '3rd String'
                            : `${index + 1}th String`}
                    </div>

                    {renderPlayerCard(
                      player,
                      slot.id,
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

  function resetDepthChart() {
    if (
      typeof window !==
      'undefined'
    ) {
      window.localStorage.removeItem(
        'psu-football-depth-chart-v2'
      );
    }

    setDepthAssignments({});
  }

  function renderDepthChart() {
    const slots =
      getSlotsForTab(
        depthChartTab
      );

    const availablePlayers =
      getDepthChartPlayers(
        depthChartTab
      ).sort(
        (a, b) =>
          a.position.localeCompare(
            b.position
          ) ||
          a.name.localeCompare(
            b.name
          )
      );

    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Depth Chart
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Drag players into
                position groups and
                arrange them by
                string.
              </p>
            </div>
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-4">
              <h3 className="font-bold text-white">
                Available Players
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Players disappear
                from this list once
                assigned to a
                position.
              </p>
            </div>

            <div className="space-y-2">
              {availablePlayers.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-6 text-center text-xs text-slate-600">
                  All eligible
                  players are
                  assigned.
                </div>
              ) : (
                availablePlayers.map(
                  (player) =>
                    renderPlayerCard(
                      player,
                      null,
                      true
                    )
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) =>
              renderDepthSlot(
                slot
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPositionEditor(
    position: string
  ) {
    let relevantSlots: DepthSlot[] =
      [];

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
        relevantSlots.flatMap(
          (slot) =>
            depthAssignments[
              slot.id
            ] || []
        )
      );

    const availablePlayers =
      positionPlayers.filter(
        (player) =>
          !assignedToRelevantSlots.has(
            player.id
          )
      );

    return (
      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {position} Depth
                Chart
              </h2>

              <p className="text-sm text-slate-400">
                Drag players into
                the appropriate
                role.
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
                Drag a player into
                a role.
              </p>
            </div>

            <div className="space-y-2">
              {availablePlayers.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-6 text-center text-xs text-slate-600">
                  All players
                  assigned.
                </div>
              ) : (
                availablePlayers.map(
                  (player) =>
                    renderPlayerCard(
                      player,
                      null,
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
          2026 Football
          Dashboard
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Manage player roster,
          scouting notes, coaching
          personnel, schedule, and
          depth chart.
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5 shadow-xl shadow-black/20 backdrop-blur sm:w-fit">
          <button
            onClick={() =>
              setActiveTab(
                'roster'
              )
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab ===
              'roster'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Player Roster
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'coaching'
              )
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab ===
              'coaching'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Coaching Staff
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'schedule'
              )
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab ===
              'schedule'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Schedule
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'depth-chart'
              )
            }
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab ===
              'depth-chart'
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-950/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Depth Chart
          </button>
        </div>

        {activeTab ===
          'roster' && (
          <>
            <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-2xl p-4 md:flex-row">
              <div className="flex flex-wrap items-center gap-1">
                {POSITIONS.map(
                  (position) => (
                    <button
                      key={
                        position
                      }
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
                      {
                        position
                      }
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
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                  }
                  className="dark-field w-full px-4 py-2.5 text-sm md:w-64"
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
                        #{' '}
                        {sortBy ===
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
                        Hometown /
                        Prev. School
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
                            #
                            {
                              player.number
                            }
                          </td>

                          <td className="p-4 font-semibold text-white">
                            <Link
                              href={`/player/${player.id}`}
                              className="text-blue-400 transition hover:text-blue-300 hover:underline"
                            >
                              {
                                player.name
                              }
                            </Link>
                          </td>

                          <td className="p-4">
                            <span className="rounded-md border border-blue-400/15 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-300">
                              {
                                player.position
                              }
                            </span>
                          </td>

                          <td className="p-4 text-slate-300">
                            {
                              player.eligibility
                            }
                          </td>

                          <td className="p-4 text-slate-300">
                            {
                              player.height
                            }
                            ,{' '}
                            {
                              player.weight
                            }{' '}
                            lbs
                          </td>

                          <td className="p-4 text-xs text-slate-400">
                            <div>
                              {
                                player.hometown
                              }
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
                                {player.notes ||
                                  (
                                    <span className="not-italic text-slate-500">
                                      + Add
                                      notes...
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

        {activeTab ===
          'coaching' && (
          <div className="space-y-6">
            <div className="glass-panel flex flex-col items-start justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-white">
                Coaching & Support
                Personnel
              </h2>

              <input
                type="text"
                placeholder="Search staff or title..."
                value={
                  search
                }
                onChange={(event) =>
                  setSearch(
                    event
                      .target
                      .value
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
                        {
                          member.name
                        }
                      </h3>

                      <p className="text-sm font-medium text-blue-400">
                        {
                          member.title
                        }
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3 text-xs text-slate-500">
                      <span>
                        Staff ID: #
                        {
                          member.id
                        }
                      </span>

                      <span className="text-slate-400">
                        Football
                        Operations
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab ===
          'schedule' && (
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
                        {
                          game.Date
                        }
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
                        {
                          game.Location
                        }
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

        {activeTab ===
          'depth-chart' &&
          renderDepthChart()}
      </main>
    </div>
  );
}