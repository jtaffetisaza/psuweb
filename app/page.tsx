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

interface DragData {
  playerId: number;
  sourceSlotId: string | null;
}

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
    eligiblePositions: ['DE'],
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
    eligiblePositions: ['DE'],
  },
  {
    id: 'WILL',
    label: 'WILL',
    eligiblePositions: ['LB'],
  },
  {
    id: 'MIKE',
    label: 'MIKE',
    eligiblePositions: ['LB'],
  },
  {
    id: 'SAM',
    label: 'SAM',
    eligiblePositions: ['LB'],
  },
  {
    id: 'CB',
    label: 'CB',
    eligiblePositions: ['CB'],
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

const DEPTH_STORAGE_KEY =
  'psu-football-depth-chart-v2';

export default function RosterDashboard() {
  const [activeTab, setActiveTab] = useState<
    'roster' | 'coaching' | 'schedule' | 'depth-chart'
  >('roster');

  const [depthChartTab, setDepthChartTab] = useState<
    'offense' | 'defense' | 'special-teams'
  >('offense');

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

  const [depthAssignments, setDepthAssignments] =
    useState<DepthAssignments>({});

  const [depthLoaded, setDepthLoaded] =
    useState(false);

  const [draggedPlayer, setDraggedPlayer] =
    useState<DragData | null>(null);

  useEffect(() => {
    fetchPlayers();
    fetchStaffData();
    fetchSchedule();
  }, []);

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('position', {
        ascending: true,
      })
      .order('number', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Error fetching players:',
        error
      );
    } else {
      setPlayers(data || []);
    }
  }

  async function fetchStaffData() {
    const { data, error } = await supabase
      .from('football_staff')
      .select('*')
      .order('id', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Error fetching staff:',
        error
      );
    } else {
      setStaff(data || []);
    }
  }

  async function fetchSchedule() {
    const { data, error } = await supabase
      .from('Schedule')
      .select('*')
      .order('Date', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Error fetching schedule:',
        error
      );
    } else {
      setSchedule(data || []);
    }
  }

  useEffect(() => {
    if (!players.length || depthLoaded) return;

    initializeDepthAssignments(players);
  }, [players, depthLoaded]);

  function initializeDepthAssignments(
    currentPlayers: Player[]
  ) {
    let saved: DepthAssignments | null = null;

    try {
      const raw = localStorage.getItem(
        DEPTH_STORAGE_KEY
      );

      if (raw) {
        saved = JSON.parse(raw);
      }
    } catch (error) {
      console.error(
        'Error loading depth chart:',
        error
      );
    }

    if (saved) {
      const validPlayerIds = new Set(
        currentPlayers.map(
          (player) => player.id
        )
      );

      const cleaned: DepthAssignments = {};

      ALL_DEPTH_SLOTS.forEach((slot) => {
        const ids = Array.isArray(
          saved?.[slot.id]
        )
          ? saved?.[slot.id]
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

      const missingPlayers =
        currentPlayers.filter(
          (player) =>
            !assignedIds.has(player.id)
        );

      const defaults =
        createDefaultAssignments(
          missingPlayers
        );

      ALL_DEPTH_SLOTS.forEach((slot) => {
        cleaned[slot.id] = [
          ...(cleaned[slot.id] || []),
          ...(defaults[slot.id] || []),
        ];
      });

      setDepthAssignments(cleaned);

      localStorage.setItem(
        DEPTH_STORAGE_KEY,
        JSON.stringify(cleaned)
      );

      setDepthLoaded(true);

      return;
    }

    const defaults =
      createDefaultAssignments(
        currentPlayers
      );

    setDepthAssignments(defaults);

    localStorage.setItem(
      DEPTH_STORAGE_KEY,
      JSON.stringify(defaults)
    );

    setDepthLoaded(true);
  }

  function createDefaultAssignments(
    currentPlayers: Player[]
  ): DepthAssignments {
    const assignments: DepthAssignments = {};

    ALL_DEPTH_SLOTS.forEach((slot) => {
      assignments[slot.id] = [];
    });

    const byPosition = (
      position: string
    ) =>
      currentPlayers.filter(
        (player) =>
          player.position === position
      );

    const qbs = byPosition('QB');

    assignments.QB = qbs.map(
      (player) => player.id
    );

    const rbs = byPosition('RB');

    assignments.RB = rbs.map(
      (player) => player.id
    );

    const wrs = byPosition('WR');

    wrs.forEach((player, index) => {
      const slots = ['X', 'Y', 'Z'];

      const slot =
        slots[index % slots.length];

      assignments[slot].push(
        player.id
      );
    });

    const tes = byPosition('TE');

    assignments.TE = tes.map(
      (player) => player.id
    );

    const ols = byPosition('OL');

    ols.forEach((player, index) => {
      const slots = [
        'OT',
        'G1',
        'C',
        'G2',
        'T',
      ];

      const slot =
        slots[index % slots.length];

      assignments[slot].push(
        player.id
      );
    });

    const des = byPosition('DE');

    des.forEach((player, index) => {
      assignments[
        index % 2 === 0
          ? 'DE1'
          : 'DE2'
      ].push(player.id);
    });

    const dts = byPosition('DT');

    dts.forEach((player, index) => {
      assignments[
        index % 2 === 0
          ? 'DT1'
          : 'DT2'
      ].push(player.id);
    });

    const lbs = byPosition('LB');

    lbs.forEach((player, index) => {
      const slots = [
        'WILL',
        'MIKE',
        'SAM',
      ];

      const slot =
        slots[index % slots.length];

      assignments[slot].push(
        player.id
      );
    });

    const cbs = byPosition('CB');

    cbs.forEach((player, index) => {
      assignments[
        index % 2 === 0
          ? 'CB'
          : 'NICKLE'
      ].push(player.id);
    });

    const safeties = byPosition('S');

    safeties.forEach((player, index) => {
      const slots = [
        'SS',
        'FS',
        'NICKLE',
      ];

      const slot =
        slots[index % slots.length];

      assignments[slot].push(
        player.id
      );
    });

    assignments.K = byPosition('K').map(
      (player) => player.id
    );

    assignments.P = byPosition('P').map(
      (player) => player.id
    );

    assignments.LS = byPosition('LS').map(
      (player) => player.id
    );

    return assignments;
  }

  function saveDepthAssignments(
    assignments: DepthAssignments
  ) {
    setDepthAssignments(assignments);

    try {
      localStorage.setItem(
        DEPTH_STORAGE_KEY,
        JSON.stringify(assignments)
      );
    } catch (error) {
      console.error(
        'Error saving depth chart:',
        error
      );
    }
  }

  function resetDepthChart() {
    if (
      !window.confirm(
        'Reset the entire depth chart to the default arrangement?'
      )
    ) {
      return;
    }

    const defaults =
      createDefaultAssignments(players);

    saveDepthAssignments(defaults);
  }

  function getPlayerById(id: number) {
    return players.find(
      (player) => player.id === id
    );
  }

  function getPlayerSlot(
    playerId: number
  ): DepthSlot | null {
    const slot =
      ALL_DEPTH_SLOTS.find((slot) =>
        (
          depthAssignments[slot.id] || []
        ).includes(playerId)
      );

    return slot || null;
  }

  function getDepthNumber(
    slotId: string,
    playerId: number
  ) {
    const playersInSlot =
      depthAssignments[slotId] || [];

    const index =
      playersInSlot.indexOf(playerId);

    return index >= 0
      ? index + 1
      : null;
  }

  function canPlayerEnterSlot(
    player: Player,
    slot: DepthSlot
  ) {
    return slot.eligiblePositions.includes(
      player.position
    );
  }

  function removePlayerFromAllSlots(
    assignments: DepthAssignments,
    playerId: number
  ): DepthAssignments {
    const next: DepthAssignments = {};

    ALL_DEPTH_SLOTS.forEach((slot) => {
      next[slot.id] = (
        assignments[slot.id] || []
      ).filter(
        (id) => id !== playerId
      );
    });

    return next;
  }

  function movePlayerToSlot(
    playerId: number,
    targetSlotId: string,
    targetIndex?: number
  ) {
    const player =
      getPlayerById(playerId);

    if (!player) return;

    const targetSlot =
      ALL_DEPTH_SLOTS.find(
        (slot) =>
          slot.id === targetSlotId
      );

    if (!targetSlot) return;

    if (
      !canPlayerEnterSlot(
        player,
        targetSlot
      )
    ) {
      return;
    }

    let next =
      removePlayerFromAllSlots(
        depthAssignments,
        playerId
      );

    const targetPlayers = [
      ...(next[targetSlotId] || []),
    ];

    let insertIndex =
      typeof targetIndex === 'number'
        ? targetIndex
        : targetPlayers.length;

    insertIndex = Math.max(
      0,
      Math.min(
        insertIndex,
        targetPlayers.length
      )
    );

    targetPlayers.splice(
      insertIndex,
      0,
      playerId
    );

    next[targetSlotId] =
      targetPlayers;

    saveDepthAssignments(next);
  }

  function handleDragStart(
    playerId: number,
    sourceSlotId: string | null
  ) {
    setDraggedPlayer({
      playerId,
      sourceSlotId,
    });
  }

  function handleDragEnd() {
    setDraggedPlayer(null);
  }

  function handleDropOnSlot(
    slotId: string
  ) {
    if (!draggedPlayer) return;

    movePlayerToSlot(
      draggedPlayer.playerId,
      slotId
    );

    setDraggedPlayer(null);
  }

  function handleDropOnPlayer(
    slotId: string,
    targetPlayerId: number
  ) {
    if (!draggedPlayer) return;

    if (
      draggedPlayer.playerId ===
      targetPlayerId
    ) {
      setDraggedPlayer(null);
      return;
    }

    const targetPlayers = [
      ...(depthAssignments[slotId] || []),
    ];

    const targetIndex =
      targetPlayers.indexOf(
        targetPlayerId
      );

    movePlayerToSlot(
      draggedPlayer.playerId,
      slotId,
      targetIndex >= 0
        ? targetIndex
        : targetPlayers.length
    );

    setDraggedPlayer(null);
  }

  async function saveNotes(id: number) {
    const { error } = await supabase
      .from('players')
      .update({
        notes: tempNotes,
      })
      .eq('id', id);

    if (!error) {
      setPlayers(
        players.map((player) =>
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
  }

  const handleSortToggle = (
    field: 'number' | 'name'
  ) => {
    if (sortBy === field) {
      setSortOrder(
        sortOrder === 'asc'
          ? 'desc'
          : 'asc'
      );
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredPlayers = players
    .filter((player) => {
      const matchesPos =
        selectedPosition === 'ALL' ||
        player.position ===
          selectedPosition;

      const matchesSearch =
        player.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        player.number
          .toString()
          .includes(search);

      return (
        matchesPos &&
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
          a.name.localeCompare(
            b.name
          );
      }

      return sortOrder === 'asc'
        ? comparison
        : -comparison;
    });

  const filteredStaff =
    staff.filter(
      (member) =>
        member.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        member.title
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  function getEditorSlotsForPosition(
    position: string
  ) {
    switch (position) {
      case 'QB':
        return ['QB'];

      case 'RB':
        return ['RB'];

      case 'WR':
        return ['X', 'Y', 'Z'];

      case 'TE':
        return ['TE'];

      case 'OL':
        return [
          'OT',
          'G1',
          'C',
          'G2',
          'T',
        ];

      case 'DE':
        return ['DE1', 'DE2'];

      case 'DT':
        return ['DT1', 'DT2'];

      case 'LB':
        return [
          'WILL',
          'MIKE',
          'SAM',
        ];

      case 'CB':
        return [
          'CB',
          'NICKLE',
        ];

      case 'S':
        return [
          'SS',
          'FS',
          'NICKLE',
        ];

      case 'K':
        return ['K'];

      case 'P':
        return ['P'];

      case 'LS':
        return ['LS'];

      default:
        return [];
    }
  }

  function getAvailablePlayers(
    position: string
  ) {
    return players
      .filter(
        (player) =>
          player.position ===
          position
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );
  }

  function renderPlayerCard(
    player: Player,
    slotId: string | null,
    compact = false
  ) {
    const currentSlot =
      getPlayerSlot(player.id);

    const depthNumber = slotId
      ? getDepthNumber(
          slotId,
          player.id
        )
      : null;

    return (
      <div
        key={player.id}
        draggable
        onDragStart={() =>
          handleDragStart(
            player.id,
            slotId
          )
        }
        onDragEnd={handleDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (slotId) {
            handleDropOnPlayer(
              slotId,
              player.id
            );
          }
        }}
        className={`group cursor-grab rounded-lg border border-white/10 bg-slate-900/80 transition hover:border-blue-400/40 hover:bg-blue-500/[0.08] ${
          compact
            ? 'px-3 py-2'
            : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2">
          {depthNumber !== null ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-500/20 text-xs font-bold text-blue-300">
              {depthNumber}
            </div>
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-600">
              +
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500">
                #{player.number}
              </span>

              <Link
                href={`/player/${player.id}`}
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="truncate text-sm font-semibold text-white hover:text-blue-300 hover:underline"
              >
                {player.name}
              </Link>
            </div>

            {!compact && (
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                <span>
                  {player.position}
                </span>

                {currentSlot && (
                  <>
                    <span>•</span>

                    <span className="text-blue-400">
                      {
                        currentSlot.label
                      }
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <span className="text-slate-600 transition group-hover:text-blue-400">
            ⋮⋮
          </span>
        </div>
      </div>
    );
  }

  function renderDepthSlot(
    slot: DepthSlot,
    compact = false
  ) {
    const playerIds =
      depthAssignments[slot.id] ||
      [];

    return (
      <div
        key={slot.id}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleDropOnSlot(
            slot.id
          );
        }}
        className={`flex min-h-[190px] flex-col rounded-xl border border-white/10 bg-slate-950/50 p-3 transition ${
          draggedPlayer
            ? 'hover:border-blue-400/60 hover:bg-blue-500/[0.05]'
            : ''
        } ${
          compact
            ? 'min-w-[190px]'
            : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {slot.label}
            </h3>

            <p className="text-[9px] uppercase tracking-widest text-slate-600">
              {
                playerIds.length
              }{' '}
              players
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {playerIds.length ===
          0 ? (
            <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-700/70 text-center text-[10px] uppercase tracking-wider text-slate-600">
              Drop player here
            </div>
          ) : (
            playerIds.map(
              (playerId) => {
                const player =
                  getPlayerById(
                    playerId
                  );

                if (!player)
                  return null;

                return renderPlayerCard(
                  player,
                  slot.id,
                  compact
                );
              }
            )
          )}
        </div>
      </div>
    );
  }

  function renderPositionEditor(
    position: string
  ) {
    const slots =
      getEditorSlotsForPosition(
        position
      );

    const availablePlayers =
      getAvailablePlayers(
        position
      );

    return (
      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">
                {position} Depth
                Chart
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Drag players from
                the pool into a
                position. Drag within
                a position to set
                1st, 2nd, and 3rd
                string.
              </p>
            </div>

            <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
              {
                availablePlayers.length
              }{' '}
              {position}
              {availablePlayers.length ===
              1
                ? ''
                : 's'}{' '}
              on roster
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[250px_1fr]">
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Player Pool
              </h3>

              <p className="mt-1 text-[10px] leading-4 text-slate-600">
                Drag any {position}{' '}
                into a position on
                the right.
              </p>
            </div>

            <div className="space-y-1.5">
              {availablePlayers.map(
                (player) =>
                  renderPlayerCard(
                    player,
                    null,
                    true
                  )
              )}
            </div>
          </div>

          <div
            className={`grid gap-3 ${
              slots.length <= 3
                ? 'md:grid-cols-3'
                : slots.length <= 5
                  ? 'md:grid-cols-3 xl:grid-cols-5'
                  : 'md:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            {slots.map(
              (slotId) => {
                const slot =
                  ALL_DEPTH_SLOTS.find(
                    (item) =>
                      item.id ===
                      slotId
                  );

                if (!slot)
                  return null;

                return renderDepthSlot(
                  slot,
                  true
                );
              }
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
   * Returns ONLY players who belong to
   * the selected side of the ball AND
   * are not currently assigned anywhere
   * on the depth chart.
   */
  function getDepthChartPlayers(
    tab:
      | 'offense'
      | 'defense'
      | 'special-teams'
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

    return players
      .filter(
        (player) =>
          positionPool.includes(
            player.position
          ) &&
          !assignedPlayerIds.has(
            player.id
          )
      )
      .sort(
        (a, b) =>
          a.position.localeCompare(
            b.position
          ) ||
          a.name.localeCompare(
            b.name
          )
      );
  }

  function getCurrentDepthSlots() {
    if (
      depthChartTab === 'offense'
    ) {
      return OFFENSE_SLOTS;
    }

    if (
      depthChartTab === 'defense'
    ) {
      return DEFENSE_SLOTS;
    }

    return SPECIAL_TEAMS_SLOTS;
  }

  function getCurrentTabTitle() {
    if (
      depthChartTab === 'offense'
    ) {
      return 'Offense Depth Chart';
    }

    if (
      depthChartTab === 'defense'
    ) {
      return 'Defense Depth Chart';
    }

    return 'Special Teams Depth Chart';
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
          coaching personnel, depth
          chart, scouting notes, and
          schedule.
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        {/* MAIN NAVIGATION */}
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5 shadow-xl shadow-black/20 backdrop-blur sm:w-fit">
          <button
            onClick={() =>
              setActiveTab(
                'roster'
              )
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

        {/* PLAYER ROSTER */}
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
                <input
                  type="text"
                  placeholder="Search name or jersey #..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
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
                        #
                        {sortBy ===
                          'number' &&
                          (sortOrder ===
                          'asc'
                            ? ' ↑'
                            : ' ↓')}
                      </th>

                      <th
                        className="cursor-pointer p-4 hover:text-white"
                        onClick={() =>
                          handleSortToggle(
                            'name'
                          )
                        }
                      >
                        Name
                        {sortBy ===
                          'name' &&
                          (sortOrder ===
                          'asc'
                            ? ' ↑'
                            : ' ↓')}
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
                        Hometown / Prev.
                        School
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
                                {player.notes || (
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

        {/* COACHING STAFF */}
        {activeTab === 'coaching' && (
          <div className="space-y-6">
            <div className="glass-panel flex flex-col items-start justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
              <h2 className="text-lg font-semibold text-white">
                Coaching & Support
                Personnel
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
                    key={member.id}
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

        {/* SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="glass-panel overflow-x-auto rounded-2xl p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              2026 Season
              Schedule
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
                  (game, index) => (
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

                      <td className="p-3 font-semibold text-white">
                        {
                          game.Opponent
                        }
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

        {/* DEPTH CHART */}
        {activeTab ===
          'depth-chart' && (
          <div className="space-y-6">
            {/* DEPTH CHART HEADER */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Depth Chart
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Build the depth chart
                    like a coaching staff.
                    Drag players from the
                    applicable player pool
                    into each position.
                  </p>
                </div>

                <button
                  onClick={
                    resetDepthChart
                  }
                  className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Reset Depth Chart
                </button>
              </div>
            </div>

            {/* DEPTH CHART SUB TABS */}
            <div className="glass-panel rounded-2xl p-2">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() =>
                    setDepthChartTab(
                      'offense'
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                    depthChartTab ===
                    'offense'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-slate-500 hover:bg-white/5 hover:text-white'
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
                  className={`rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                    depthChartTab ===
                    'defense'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-slate-500 hover:bg-white/5 hover:text-white'
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
                  className={`rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                    depthChartTab ===
                    'special-teams'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-slate-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Special Teams
                </button>
              </div>
            </div>

            {/* CURRENT DEPTH CHART */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />

                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-blue-400">
                  {
                    getCurrentTabTitle()
                  }
                </h2>

                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[240px_1fr]">
                {/* PLAYER POOL */}
                <div className="glass-panel rounded-2xl p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Player Pool
                    </h3>

                    <p className="mt-1 text-[10px] leading-4 text-slate-600">
                      Only unassigned
                      players appear
                      here.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {getDepthChartPlayers(
                      depthChartTab
                    ).map(
                      (player) =>
                        renderPlayerCard(
                          player,
                          null,
                          true
                        )
                    )}

                    {getDepthChartPlayers(
                      depthChartTab
                    ).length ===
                      0 && (
                      <div className="rounded-lg border border-dashed border-slate-700/70 p-5 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          All players
                          assigned
                        </p>

                        <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-700">
                          Drag players
                          between slots
                          to adjust
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* POSITION SLOTS */}
                <div
                  className={`grid gap-3 ${
                    getCurrentDepthSlots()
                      .length <=
                    3
                      ? 'md:grid-cols-3'
                      : getCurrentDepthSlots()
                            .length <=
                          5
                        ? 'md:grid-cols-3 xl:grid-cols-5'
                        : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                  }`}
                >
                  {getCurrentDepthSlots().map(
                    (slot) =>
                      renderDepthSlot(
                        slot
                      )
                  )}
                </div>
              </div>
            </div>

            {/* INSTRUCTIONS */}
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                Drag a player into a
                position • Drag players
                up or down to change
                their string • Changes
                save automatically
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}