'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  status?: string;
  injury_note?: string;
  depth_rank: number;
  star_rating: number;
  stats: Record<string, any>;
  cfbd_player_id: string;
  recruiting_class: number;
  national_rank: number;
  position_rank: number;
  state_rank: number;
  recruiting_position: string;
  recruiting_team: string;
  scouting_tag: string;
  scouting_note: string;
}

interface SeasonStats {
  id: number;
  player_id: number;
  cfbd_player_id: string;
  season: number;
  team: string;
  position: string;
  games: number | null;
  stats: Record<string, any>;
}

interface CareerStats {
  passingYards: number;
  passingTD: number;
  passingINT: number;
  completions: number;
  attempts: number;
  rushingYards: number;
  rushingTD: number;
  carries: number;
  receivingYards: number;
  receivingTD: number;
  receptions: number;
  tackles: number;
  soloTackles: number;
  tfl: number;
  sacks: number;
  interceptions: number;
  passesDefended: number;
  forcedFumbles: number;
  fumbleRecoveries: number;
  fgMade: number;
  fgAttempted: number;
  xpMade: number;
  xpAttempted: number;
  punts: number;
  puntYards: number;
  puntLong: number;
}

function num(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatStat(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (decimals > 0) return value.toFixed(decimals);
  return value.toLocaleString();
}

function hasValue(value: any): boolean {
  return value !== undefined && value !== null && Number(value) !== 0;
}

function getGamesPlayed(season: SeasonStats): string {
  const stats = season.stats || {};
  const s2026 = stats['2026'] || {};

  // Check the updated 2026 object and JSON keys FIRST, then fall back to season.games column
  const fallback =
    s2026.games_played ??
    stats['Games Played'] ??
    stats.GP ??
    stats.GAMES ??
    stats.games ??
    season.games;

  if (hasValue(fallback)) {
    return formatStat(num(fallback));
  }
  return '—';
}

function getPositionGroup(position: string): string {
  const pos = position.toUpperCase();

  if (pos === 'QB') return 'QB';
  if (['RB', 'FB'].includes(pos)) return 'RB';
  if (['WR', 'TE'].includes(pos)) return 'RECEIVER';
  if (['OT', 'OL', 'OG', 'OC', 'C', 'G', 'T'].includes(pos)) return 'OL';
  if (['DE', 'DT', 'DL', 'NT'].includes(pos)) return 'DL';
  if (pos === 'LB') return 'LB';
  if (['CB', 'S', 'DB', 'SAF'].includes(pos)) return 'DB';
  if (['K', 'PK'].includes(pos)) return 'K';
  if (['P', 'PUNTER'].includes(pos)) return 'P';
  if (['LS', 'LONG SNAPPER'].includes(pos)) return 'LS';

  return 'OTHER';
}

function getCareerStats(seasonStats: SeasonStats[]): CareerStats {
  return seasonStats.reduce(
    (career, season) => {
      const s = season.stats || {};
      const s2026 = s['2026'] || {};

      const passing = s2026.passing || s.passing || {};
      const rushing = s2026.rushing || s.rushing || {};
      const receiving = s2026.receiving || s.receiving || {};
      const defensive = s2026.defensive || s.defensive || {};
      const interceptions = s2026.interceptions || s.interceptions || {};
      const fumbles = s2026.fumbles || s.fumbles || {};
      const kicking = s2026.kicking || s.kicking || {};
      const punting = s2026.punting || s.punting || {};

      career.passingYards += num(passing.yards ?? passing.YDS ?? s['Passing YDS']);
      career.passingTD += num(passing.touchdowns ?? passing.TD ?? s['Passing TD']);
      career.passingINT += num(passing.interceptions ?? passing.INT ?? s['Passing INT']);

      career.completions += num(passing.completions ?? passing.COMPLETIONS ?? passing.CMP);
      career.attempts += num(passing.attempts ?? passing.ATT);

      career.rushingYards += num(rushing.yards ?? rushing.YDS ?? s['Rushing YDS']);
      career.rushingTD += num(rushing.touchdowns ?? rushing.TD ?? s['Rushing TD']);
      career.carries += num(rushing.attempts ?? rushing.CAR ?? s['Rushing CAR']);

      career.receivingYards += num(receiving.yards ?? receiving.YDS ?? s['Receiving YDS']);
      career.receivingTD += num(receiving.touchdowns ?? receiving.TD ?? s['Receiving TD']);
      career.receptions += num(receiving.receptions ?? receiving.REC ?? s['Receiving REC']);

      career.tackles += num(defensive.total ?? defensive.TOT ?? defensive.TACKLES);
      career.soloTackles += num(defensive.solo ?? defensive.SOLO);
      career.tfl += num(defensive.tfl ?? defensive.TFL);
      career.sacks += num(defensive.sacks ?? defensive.SACKS);
      career.passesDefended += num(defensive.pd ?? defensive.PD);

      career.interceptions += num(interceptions.int ?? interceptions.INT ?? defensive.INT);
      career.forcedFumbles += num(defensive.ff ?? defensive.FF ?? fumbles.FF);
      career.fumbleRecoveries += num(fumbles.rec ?? fumbles.REC ?? defensive.FR);

      career.fgMade += num(kicking.fgm ?? kicking.FGM);
      career.fgAttempted += num(kicking.fga ?? kicking.FGA);
      career.xpMade += num(kicking.xpm ?? kicking.XPM);
      career.xpAttempted += num(kicking.xpa ?? kicking.XPA);

      career.punts += num(punting.punts ?? punting.NO ?? punting.PUNTS);
      career.puntYards += num(punting.yards ?? punting.YDS);
      career.puntLong = Math.max(career.puntLong, num(punting.long ?? punting.LONG));

      return career;
    },
    {
      passingYards: 0,
      passingTD: 0,
      passingINT: 0,
      completions: 0,
      attempts: 0,
      rushingYards: 0,
      rushingTD: 0,
      carries: 0,
      receivingYards: 0,
      receivingTD: 0,
      receptions: 0,
      tackles: 0,
      soloTackles: 0,
      tfl: 0,
      sacks: 0,
      interceptions: 0,
      passesDefended: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      fgMade: 0,
      fgAttempted: 0,
      xpMade: 0,
      xpAttempted: 0,
      punts: 0,
      puntYards: 0,
      puntLong: 0,
    }
  );
}

function getCareerSnapshot(position: string, career: CareerStats) {
  const group = getPositionGroup(position);

  switch (group) {
    case 'QB':
      return [
        { label: 'Pass Yards', value: formatStat(career.passingYards) },
        { label: 'Pass TD', value: formatStat(career.passingTD) },
        { label: 'INT', value: formatStat(career.passingINT) },
        { label: 'Rush Yards', value: formatStat(career.rushingYards) },
        { label: 'Rush TD', value: formatStat(career.rushingTD) },
      ];

    case 'RB':
      return [
        { label: 'Rush Yards', value: formatStat(career.rushingYards) },
        { label: 'Rush TD', value: formatStat(career.rushingTD) },
        { label: 'Carries', value: formatStat(career.carries) },
        { label: 'Receptions', value: formatStat(career.receptions) },
        { label: 'Rec Yards', value: formatStat(career.receivingYards) },
      ];

    case 'RECEIVER':
      return [
        { label: 'Receptions', value: formatStat(career.receptions) },
        { label: 'Rec Yards', value: formatStat(career.receivingYards) },
        { label: 'Rec TD', value: formatStat(career.receivingTD) },
        ...(career.rushingYards > 0
          ? [{ label: 'Rush Yards', value: formatStat(career.rushingYards) }]
          : []),
      ];

    case 'DL':
      return [
        { label: 'Tackles', value: formatStat(career.tackles) },
        { label: 'TFL', value: formatStat(career.tfl, 1) },
        { label: 'Sacks', value: formatStat(career.sacks, 1) },
        ...(career.passesDefended > 0
          ? [{ label: 'PD', value: formatStat(career.passesDefended) }]
          : []),
      ];

    case 'LB':
      return [
        { label: 'Tackles', value: formatStat(career.tackles) },
        { label: 'TFL', value: formatStat(career.tfl, 1) },
        { label: 'Sacks', value: formatStat(career.sacks, 1) },
        ...(career.passesDefended > 0
          ? [{ label: 'PD', value: formatStat(career.passesDefended) }]
          : []),
        ...(career.interceptions > 0
          ? [{ label: 'INT', value: formatStat(career.interceptions) }]
          : []),
      ];

    case 'DB':
      return [
        { label: 'Tackles', value: formatStat(career.tackles) },
        { label: 'TFL', value: formatStat(career.tfl, 1) },
        { label: 'INT', value: formatStat(career.interceptions) },
        { label: 'PD', value: formatStat(career.passesDefended) },
        ...(career.sacks > 0
          ? [{ label: 'Sacks', value: formatStat(career.sacks, 1) }]
          : []),
      ];

    case 'K':
      return [
        { label: 'FG Made', value: formatStat(career.fgMade) },
        { label: 'FG Att', value: formatStat(career.fgAttempted) },
        { label: 'XP Made', value: formatStat(career.xpMade) },
        { label: 'XP Att', value: formatStat(career.xpAttempted) },
      ];

    case 'P':
      return [
        { label: 'Punts', value: formatStat(career.punts) },
        { label: 'Punt Yards', value: formatStat(career.puntYards) },
        ...(career.punts > 0
          ? [{ label: 'Avg', value: formatStat(career.puntYards / career.punts, 1) }]
          : []),
        { label: 'Long', value: formatStat(career.puntLong) },
      ];

    default:
      return [];
  }
}

function getCurrentSeasonStats(position: string, stats: Record<string, any>) {
  const group = getPositionGroup(position);

  const s2026 = stats['2026'] || {};

  const passing = s2026.passing || stats.passing || {};
  const rushing = s2026.rushing || stats.rushing || {};
  const receiving = s2026.receiving || stats.receiving || {};
  const defensive = s2026.defensive || stats.defensive || {};

  const passYds = passing.yards ?? passing.YDS ?? stats['Passing YDS'] ?? 0;
  const passTd = passing.touchdowns ?? passing.TD ?? stats['Passing TD'] ?? 0;
  const passInt = passing.interceptions ?? passing.INT ?? stats['Passing INT'] ?? 0;

  const rushYds = rushing.yards ?? rushing.YDS ?? stats['Rushing YDS'] ?? 0;
  const rushTd = rushing.touchdowns ?? rushing.TD ?? stats['Rushing TD'] ?? 0;
  const rushCar = rushing.attempts ?? rushing.CAR ?? stats['Rushing CAR'] ?? 0;

  const recYds = receiving.yards ?? receiving.YDS ?? stats['Receiving YDS'] ?? 0;
  const recTd = receiving.touchdowns ?? receiving.TD ?? stats['Receiving TD'] ?? 0;
  const recRec = receiving.receptions ?? receiving.REC ?? stats['Receiving REC'] ?? 0;

  switch (group) {
    case 'QB':
      return [
        { label: 'Pass Yards', value: formatStat(num(passYds)) },
        { label: 'Pass TD', value: formatStat(num(passTd)) },
        { label: 'INT', value: formatStat(num(passInt)) },
        { label: 'Rush Yards', value: formatStat(num(rushYds)) },
        { label: 'Rush TD', value: formatStat(num(rushTd)) },
      ].filter((stat) => stat.value !== '0');

    case 'RB':
      return [
        { label: 'Rush Yards', value: formatStat(num(rushYds)) },
        { label: 'Rush TD', value: formatStat(num(rushTd)) },
        { label: 'Carries', value: formatStat(num(rushCar)) },
        { label: 'Receptions', value: formatStat(num(recRec)) },
        { label: 'Rec Yards', value: formatStat(num(recYds)) },
      ].filter((stat) => stat.value !== '0');

    case 'RECEIVER':
      return [
        { label: 'Receptions', value: formatStat(num(recRec)) },
        { label: 'Rec Yards', value: formatStat(num(recYds)) },
        { label: 'Rec TD', value: formatStat(num(recTd)) },
        ...(num(rushYds) > 0 ? [{ label: 'Rush Yards', value: formatStat(num(rushYds)) }] : []),
      ].filter((stat) => stat.value !== '0');

    default:
      return [];
  }
}

function getCareerColumns(position: string) {
  switch (getPositionGroup(position)) {
    case 'QB':
      return ['Season', 'Team', 'GP', 'Comp', 'Att', 'Pass Yds', 'Pass TD', 'INT', 'Rush Yds', 'Rush TD'];
    case 'RB':
      return ['Season', 'Team', 'GP', 'Car', 'Rush Yds', 'Rush TD', 'Rec', 'Rec Yds', 'Rec TD'];
    case 'RECEIVER':
      return ['Season', 'Team', 'GP', 'Rec', 'Rec Yds', 'TD', 'YPR', 'Long'];
    case 'DL':
      return ['Season', 'Team', 'GP', 'Tackles', 'TFL', 'Sacks', 'PD'];
    case 'LB':
      return ['Season', 'Team', 'GP', 'Tackles', 'TFL', 'Sacks', 'PD', 'INT'];
    case 'DB':
      return ['Season', 'Team', 'GP', 'Tackles', 'TFL', 'Sacks', 'INT', 'PD'];
    case 'K':
      return ['Season', 'Team', 'GP', 'FGM', 'FGA', 'XPM', 'XPA'];
    case 'P':
      return ['Season', 'Team', 'GP', 'Punts', 'Punt Yds', 'Avg', 'Long'];
    default:
      return ['Season', 'Team', 'GP'];
  }
}

function getCareerRow(season: SeasonStats, position: string): string[] {
  const s = season.stats || {};
  const s2026 = s['2026'] || {};

  const passing = s2026.passing || s.passing || {};
  const rushing = s2026.rushing || s.rushing || {};
  const receiving = s2026.receiving || s.receiving || {};
  const defensive = s2026.defensive || s.defensive || {};
  const interceptions = s2026.interceptions || s.interceptions || {};
  const kicking = s2026.kicking || s.kicking || {};
  const punting = s2026.punting || s.punting || {};

  const gp = getGamesPlayed(season);

  switch (getPositionGroup(position)) {
    case 'QB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(passing.completions ?? passing.COMPLETIONS ?? passing.CMP)),
        formatStat(num(passing.attempts ?? passing.ATT)),
        formatStat(num(passing.yards ?? passing.YDS ?? s['Passing YDS'])),
        formatStat(num(passing.touchdowns ?? passing.TD ?? s['Passing TD'])),
        formatStat(num(passing.interceptions ?? passing.INT ?? s['Passing INT'])),
        formatStat(num(rushing.yards ?? rushing.YDS ?? s['Rushing YDS'])),
        formatStat(num(rushing.touchdowns ?? rushing.TD ?? s['Rushing TD'])),
      ];

    case 'RB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(rushing.attempts ?? rushing.CAR ?? s['Rushing CAR'])),
        formatStat(num(rushing.yards ?? rushing.YDS ?? s['Rushing YDS'])),
        formatStat(num(rushing.touchdowns ?? rushing.TD ?? s['Rushing TD'])),
        formatStat(num(receiving.receptions ?? receiving.REC ?? s['Receiving REC'])),
        formatStat(num(receiving.yards ?? receiving.YDS ?? s['Receiving YDS'])),
        formatStat(num(receiving.touchdowns ?? receiving.TD ?? s['Receiving TD'])),
      ];

    case 'RECEIVER': {
      const rec = receiving.receptions ?? receiving.REC ?? s['Receiving REC'] ?? 0;
      const yds = receiving.yards ?? receiving.YDS ?? s['Receiving YDS'] ?? 0;
      const td = receiving.touchdowns ?? receiving.TD ?? s['Receiving TD'] ?? 0;
      const ypr = receiving.ypr ?? receiving.YPR ?? (num(rec) > 0 ? num(yds) / num(rec) : 0);
      const long = receiving.long ?? receiving.LONG ?? s['Receiving LONG'] ?? 0;

      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(rec)),
        formatStat(num(yds)),
        formatStat(num(td)),
        hasValue(ypr) ? formatStat(num(ypr), 1) : '—',
        hasValue(long) ? formatStat(num(long)) : '—',
      ];
    }

    case 'DL':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(defensive.total ?? defensive.TOT ?? defensive.TACKLES)),
        formatStat(num(defensive.tfl ?? defensive.TFL), 1),
        formatStat(num(defensive.sacks ?? defensive.SACKS), 1),
        formatStat(num(defensive.pd ?? defensive.PD)),
      ];

    case 'LB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(defensive.total ?? defensive.TOT ?? defensive.TACKLES)),
        formatStat(num(defensive.tfl ?? defensive.TFL), 1),
        formatStat(num(defensive.sacks ?? defensive.SACKS), 1),
        formatStat(num(defensive.pd ?? defensive.PD)),
        formatStat(num(interceptions.int ?? interceptions.INT ?? defensive.INT)),
      ];

    case 'DB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(defensive.total ?? defensive.TOT ?? defensive.TACKLES)),
        formatStat(num(defensive.tfl ?? defensive.TFL), 1),
        formatStat(num(defensive.sacks ?? defensive.SACKS), 1),
        formatStat(num(interceptions.int ?? interceptions.INT ?? defensive.INT)),
        formatStat(num(defensive.pd ?? defensive.PD)),
      ];

    case 'K':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(num(kicking.fgm ?? kicking.FGM)),
        formatStat(num(kicking.fga ?? kicking.FGA)),
        formatStat(num(kicking.xpm ?? kicking.XPM)),
        formatStat(num(kicking.xpa ?? kicking.XPA)),
      ];

    case 'P': {
      const punts = num(punting.punts ?? punting.NO ?? punting.PUNTS);
      const yards = num(punting.yards ?? punting.YDS);

      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(punts),
        formatStat(yards),
        punts > 0 ? formatStat(yards / punts, 1) : '—',
        formatStat(num(punting.long ?? punting.LONG)),
      ];
    }

    default:
      return [season.season.toString(), season.team || '—', gp];
  }
}

function getSeasonHighlights(season: SeasonStats, position: string): string[] {
  const s = season.stats || {};
  const s2026 = s['2026'] || {};
  const highlights: string[] = [];

  const group = getPositionGroup(position);

  const passing = s2026.passing || s.passing || {};
  const rushing = s2026.rushing || s.rushing || {};
  const receiving = s2026.receiving || s.receiving || {};
  const defensive = s2026.defensive || s.defensive || {};
  const interceptions = s2026.interceptions || s.interceptions || {};
  const kicking = s2026.kicking || s.kicking || {};
  const punting = s2026.punting || s.punting || {};

  if (group === 'QB') {
    const yds = passing.yards ?? passing.YDS ?? s['Passing YDS'];
    const td = passing.touchdowns ?? passing.TD ?? s['Passing TD'];
    const rush = rushing.yards ?? rushing.YDS ?? s['Rushing YDS'];

    if (hasValue(yds)) highlights.push(`${formatStat(num(yds))} passing yards`);
    if (hasValue(td)) highlights.push(`${formatStat(num(td))} passing touchdowns`);
    if (hasValue(rush)) highlights.push(`${formatStat(num(rush))} rushing yards`);
  }

  if (group === 'RB') {
    const rushYds = rushing.yards ?? rushing.YDS ?? s['Rushing YDS'];
    const rushTd = rushing.touchdowns ?? rushing.TD ?? s['Rushing TD'];
    const recYds = receiving.yards ?? receiving.YDS ?? s['Receiving YDS'];

    if (hasValue(rushYds)) highlights.push(`${formatStat(num(rushYds))} rushing yards`);
    if (hasValue(rushTd)) highlights.push(`${formatStat(num(rushTd))} rushing touchdowns`);
    if (hasValue(recYds)) highlights.push(`${formatStat(num(recYds))} receiving yards`);
  }

  if (group === 'RECEIVER') {
    const rec = receiving.receptions ?? receiving.REC ?? s['Receiving REC'];
    const yds = receiving.yards ?? receiving.YDS ?? s['Receiving YDS'];
    const td = receiving.touchdowns ?? receiving.TD ?? s['Receiving TD'];
    const long = receiving.long ?? receiving.LONG ?? s['Receiving LONG'];

    if (hasValue(rec)) highlights.push(`${formatStat(num(rec))} receptions`);
    if (hasValue(yds)) highlights.push(`${formatStat(num(yds))} receiving yards`);
    if (hasValue(td)) highlights.push(`${formatStat(num(td))} receiving touchdowns`);
    if (hasValue(long)) highlights.push(`${formatStat(num(long))}-yard long reception`);
  }

  if (['DL', 'LB', 'DB'].includes(group)) {
    const tackles = num(defensive.total ?? defensive.TOT ?? defensive.TACKLES);
    const tfl = defensive.tfl ?? defensive.TFL;
    const sacks = defensive.sacks ?? defensive.SACKS;
    const ints = interceptions.int ?? interceptions.INT ?? defensive.INT;
    const pd = defensive.pd ?? defensive.PD;

    if (tackles > 0) highlights.push(`${formatStat(tackles)} total tackles`);
    if (hasValue(tfl)) highlights.push(`${formatStat(num(tfl), 1)} tackles for loss`);
    if (hasValue(sacks)) highlights.push(`${formatStat(num(sacks), 1)} sacks`);
    if (hasValue(ints)) highlights.push(`${formatStat(num(ints))} interceptions`);
    if (hasValue(pd)) highlights.push(`${formatStat(num(pd))} passes defended`);
  }

  if (group === 'K') {
    const fgm = kicking.fgm ?? kicking.FGM;
    const xpm = kicking.xpm ?? kicking.XPM;

    if (hasValue(fgm)) highlights.push(`${formatStat(num(fgm))} field goals made`);
    if (hasValue(xpm)) highlights.push(`${formatStat(num(xpm))} extra points made`);
  }

  if (group === 'P') {
    const punts = num(punting.punts ?? punting.NO ?? punting.PUNTS);
    const yards = num(punting.yards ?? punting.YDS);
    const long = punting.long ?? punting.LONG;

    if (punts > 0) {
      highlights.push(`${formatStat(punts)} punts`);
      if (yards > 0) highlights.push(`${formatStat(yards / punts, 1)} yards per punt`);
    }
    if (hasValue(long)) highlights.push(`${formatStat(num(long))}-yard long punt`);
  }

  return highlights.slice(0, 4);
}

export default function PlayerPage() {
  const params = useParams();

  const [player, setPlayer] = useState<Player | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPlayer() {
      try {
        setLoading(true);
        setError('');

        const playerId = Number(params.id);
        if (!Number.isFinite(playerId)) throw new Error('Invalid player ID');

        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (playerError) throw playerError;

        const { data: statsData, error: statsError } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('player_id', playerId)
          .order('season', { ascending: false });

        if (statsError) throw statsError;

        setPlayer(playerData);
        setSeasonStats(statsData || []);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Unable to load player');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) loadPlayer();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-slate-500 font-medium">Loading player profile...</p>
        </div>
      </main>
    );
  }

  if (error || !player) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-blue-800 font-bold hover:underline">
            ← Back to Roster
          </Link>
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-xl font-bold text-red-900">Player not found</h1>
            <p className="mt-2 text-slate-600">{error || 'This player could not be found.'}</p>
          </div>
        </div>
      </main>
    );
  }

  const currentSeason = seasonStats.find((stat) => stat.season === 2026) || null;
  const currentSeasonData = currentSeason?.stats || player.stats || {};

  const careerStats = getCareerStats(seasonStats);
  const careerSnapshot = getCareerSnapshot(player.position, careerStats);
  const currentSeasonStats = getCurrentSeasonStats(player.position, currentSeasonData);
  const careerColumns = getCareerColumns(player.position);

  const isIR =
    String(player.status || '').toUpperCase().includes('OUT') ||
    String(player.status || '').toUpperCase().includes('IR');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* BACK LINK */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-bold text-blue-800 hover:text-blue-900 transition hover:underline"
        >
          ← Back to Roster
        </Link>

        {/* HERO HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 font-mono text-2xl font-bold text-blue-900">
                #{player.number}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-blue-800 font-bold">
                  Penn State Football
                </p>

                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                    {player.name}
                  </h1>

                  {isIR && (
                    <span className="rounded-full bg-red-100 border border-red-300 px-3 py-1 text-xs font-bold text-red-800 uppercase tracking-wide">
                      {player.status || 'IR - OUT'}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-blue-900 font-bold">
                    {player.position}
                  </span>

                  {player.eligibility && (
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-700">
                      {player.eligibility}
                    </span>
                  )}

                  {player.depth_rank && (
                    <span className="rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-700">
                      Depth #{player.depth_rank}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
              {player.height && (
                <p className="text-sm text-slate-700 font-medium">
                  <span className="text-slate-400 font-normal">Height:</span> {player.height}
                </p>
              )}
              {player.weight && (
                <p className="text-sm text-slate-700 font-medium mt-1">
                  <span className="text-slate-400 font-normal">Weight:</span> {player.weight} lbs
                </p>
              )}
            </div>

          </div>
        </section>

        {/* SCOUTING & INJURY NOTES */}
        {(player.scouting_tag || player.scouting_note || player.injury_note) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">
                Penn State Scouting & Notes
              </h2>

              {player.scouting_tag && (
                <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900">
                  {player.scouting_tag}
                </span>
              )}
            </div>

            {player.injury_note && (
              <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
                Status Note: {player.injury_note}
              </p>
            )}

            {player.scouting_note && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {player.scouting_note}
              </p>
            )}
          </section>
        )}

        {/* CAREER SNAPSHOT */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Career Snapshot
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Career production based on recorded statistics
            </p>
          </div>

          {careerSnapshot.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {careerSnapshot.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No career statistics recorded for this player.
            </div>
          )}
        </section>

        {/* 2026 SEASON */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              2026 Season
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Current season production
            </p>
          </div>

          {currentSeasonStats.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {currentSeasonStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No 2026 statistics recorded yet.
            </div>
          )}
        </section>

        {/* CAREER STATS TABLE */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Career Stats
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Season-by-season production
            </p>
          </div>

          {seasonStats.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    {careerColumns.map((column) => (
                      <th key={column} className="p-4 whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {seasonStats.map((season) => {
                    const row = getCareerRow(season, player.position);

                    return (
                      <tr key={season.id} className="transition hover:bg-slate-50">
                        {row.map((value, index) => (
                          <td
                            key={`${season.id}-${index}`}
                            className={`p-4 whitespace-nowrap ${
                              index === 0
                                ? 'font-bold text-slate-900'
                                : 'text-slate-700 font-medium'
                            }`}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No season statistics recorded.
            </div>
          )}
        </section>

        {/* PLAYER DETAILS */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">
            Player Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hometown</p>
              <p className="mt-1 font-semibold text-slate-800">{player.hometown || '—'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">High School</p>
              <p className="mt-1 font-semibold text-slate-800">{player.high_school || '—'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Previous School</p>
              <p className="mt-1 font-semibold text-slate-800">{player.previous_school || '—'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Eligibility</p>
              <p className="mt-1 font-semibold text-slate-800">{player.eligibility || '—'}</p>
            </div>
          </div>
        </section>

        {/* RECRUITING PROFILE */}
        {(player.recruiting_class ||
          player.national_rank ||
          player.position_rank ||
          player.state_rank ||
          player.recruiting_position ||
          player.recruiting_team ||
          player.star_rating) && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              Recruiting Profile
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {player.star_rating > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating</p>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={
                          index < player.star_rating
                            ? 'text-amber-400 text-lg'
                            : 'text-slate-200 text-lg'
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {player.recruiting_class && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Class</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">{player.recruiting_class}</p>
                </div>
              )}

              {player.national_rank && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">National Rank</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">#{player.national_rank}</p>
                </div>
              )}

              {player.position_rank && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Position Rank</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">#{player.position_rank}</p>
                </div>
              )}

              {player.state_rank && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">State Rank</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">#{player.state_rank}</p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-1">
              {player.recruiting_position && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recruiting Position</p>
                  <p className="mt-1 font-semibold text-slate-800">{player.recruiting_position}</p>
                </div>
              )}

              {player.recruiting_team && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recruiting Team</p>
                  <p className="mt-1 font-semibold text-slate-800">{player.recruiting_team}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SEASON HISTORY */}
        {seasonStats.length > 0 && (
          <section className="space-y-3 pb-8">
            <h2 className="text-xl font-bold text-slate-900">
              Season History
            </h2>

            <div className="space-y-3">
              {seasonStats.map((season) => {
                const highlights = getSeasonHighlights(season, player.position);
                const gamesPlayed = getGamesPlayed(season);

                return (
                  <div
                    key={season.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          {season.season}
                        </h3>
                        <p className="text-xs font-medium text-slate-500">
                          {season.team || 'Team not recorded'}
                        </p>
                      </div>

                      {gamesPlayed !== '—' && (
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md self-start md:self-auto">
                          {gamesPlayed} {gamesPlayed === '1' ? 'game' : 'games'}
                        </span>
                      )}
                    </div>

                    {highlights.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-900"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}