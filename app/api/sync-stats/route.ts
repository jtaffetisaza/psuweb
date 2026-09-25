import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch Penn State Roster from ESPN
    const rosterRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/215/roster',
      { cache: 'no-store' }
    );
    const rosterData = await rosterRes.json();
    const athletes = rosterData.athletes.flatMap((group: any) => group.items || []);

    // 2. Load DB players
    const { data: dbPlayers } = await supabase.from('players').select('id, name');
    if (!dbPlayers) throw new Error('Database unreachable');

    let updatedCount = 0;

    for (const athlete of athletes) {
      const fullName = (athlete.fullName || '').trim();
      const espnId = athlete.id;

      if (!fullName) continue;

      const cleanEspnName = fullName
        .replace(/['’]/g, '')
        .replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, '')
        .toLowerCase()
        .trim();

      const dbPlayer = dbPlayers.find((p) => {
        const dbNameClean = p.name
          .replace(/['’]/g, '')
          .replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, '')
          .toLowerCase()
          .trim();
        return dbNameClean.includes(cleanEspnName) || cleanEspnName.includes(dbNameClean);
      });

      if (!dbPlayer) continue;

      // 3. Fetch ESPN gamelog
      const statsRes = await fetch(
        `https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/athletes/${espnId}/gamelog?season=2026`,
        { cache: 'no-store' }
      );

      if (!statsRes.ok) continue;
      const statsData = await statsRes.json();
      const seasonStats = statsData.seasonTypes?.find((s: any) => s.year === 2026) || statsData.seasonTypes?.[0];

      if (!seasonStats) continue;

      const categories = seasonStats.categories || [];
      const formattedStats = {
        passing: categories.find((c: any) => c.name === 'passing')?.stats || {},
        rushing: categories.find((c: any) => c.name === 'rushing')?.stats || {},
        receiving: categories.find((c: any) => c.name === 'receiving')?.stats || {},
        defensive: categories.find((c: any) => c.name === 'defensive')?.stats || {},
      };

      const { error: upsertErr } = await supabase.from('player_season_stats').upsert(
        {
          player_id: dbPlayer.id,
          cfbd_player_id: String(espnId),
          season: 2026,
          team: 'Penn State',
          games: seasonStats.eventsCount || 2,
          stats: formattedStats,
        },
        { onConflict: 'player_id,season' }
      );

      if (!upsertErr) updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced 2026 stats for ${updatedCount} players via ESPN API.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}