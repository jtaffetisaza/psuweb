import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Matchup {
  id: number;
  season: number;
  week: number | null;
  opponent: string;
  date: string;
  time: string | null;
  location: string | null;
  venue: string | null;
  is_home: boolean;
  conference: string | null;
  game_type: string | null;
  penn_state_record: string | null;
  opponent_record: string | null;
  penn_state_ranking: string | null;
  opponent_ranking: string | null;
  preview: string | null;
  offense_breakdown: string | null;
  defense_breakdown: string | null;
  key_matchup: string | null;
  key_storylines: string | null;
  prediction: string | null;
  note: string | null;
}

interface Player {
  id: number;
  name: string;
  position: string;
  eligibility: string;
  height: string;
  weight: number;
  hometown: string;
  previous_school: string;
  notes: string;
}

interface TeamStats {
  team_name: string;
  points_per_game: number | null;
  total_yards_per_game: number | null;
  passing_yards_per_game: number | null;
  rushing_yards_per_game: number | null;
  points_allowed_per_game: number | null;
  turnovers: number | null;
  sacks: number | null;
  third_down_pct: number | null;
  red_zone_pct: number | null;
}

interface History {
  season: number;
  opponent: string;
  penn_state_score: number | null;
  opponent_score: number | null;
  location: string | null;
  venue: string | null;
  result: string | null;
  note: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matchupId = Number(body.matchupId);

    if (!matchupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'A matchupId is required.',
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENAI_API_KEY is not configured.',
        },
        { status: 500 }
      );
    }

    /*
     * Get the selected matchup.
     */
    const { data: matchup, error: matchupError } =
      await supabase
        .from('matchups')
        .select('*')
        .eq('id', matchupId)
        .single();

    if (matchupError) {
      throw matchupError;
    }

    if (!matchup) {
      return NextResponse.json(
        {
          success: false,
          error: 'Matchup not found.',
        },
        { status: 404 }
      );
    }

    /*
     * Get Penn State players.
     */
    const { data: players, error: playersError } =
      await supabase
        .from('players')
        .select(
          'id, name, position, eligibility, height, weight, hometown, previous_school, notes'
        )
        .order('position', {
          ascending: true,
        })
        .order('name', {
          ascending: true,
        });

    if (playersError) {
      throw playersError;
    }

    /*
     * Get matchup-specific players.
     */
    const { data: matchupPlayers, error: matchupPlayersError } =
      await supabase
        .from('matchup_players')
        .select('*')
        .eq('matchup_id', matchupId)
        .order('sort_order', {
          ascending: true,
        });

    if (matchupPlayersError) {
      throw matchupPlayersError;
    }

    /*
     * Get team statistics if they exist.
     */
    const { data: teamStats, error: teamStatsError } =
      await supabase
        .from('matchup_team_stats')
        .select('*')
        .eq('matchup_id', matchupId);

    if (teamStatsError) {
      throw teamStatsError;
    }

    /*
     * Get historical meetings against this opponent.
     */
    const { data: history, error: historyError } =
      await supabase
        .from('matchup_history')
        .select('*')
        .eq('opponent', matchup.opponent)
        .order('season', {
          ascending: false,
        });

    if (historyError) {
      throw historyError;
    }

    /*
     * Get the overall series record.
     */
    const { data: series, error: seriesError } =
      await supabase
        .from('matchup_series')
        .select('*')
        .eq('opponent', matchup.opponent)
        .maybeSingle();

    if (seriesError) {
      throw seriesError;
    }

    /*
     * Build a clean context object for the AI.
     *
     * We deliberately don't send the entire players table.
     * The AI gets the roster plus matchup-specific players,
     * historical meetings, and available team statistics.
     */
    const context = {
      matchup: {
        season: matchup.season,
        week: matchup.week,
        opponent: matchup.opponent,
        date: matchup.date,
        time: matchup.time,
        location: matchup.location,
        venue: matchup.venue,
        is_home: matchup.is_home,
        conference: matchup.conference,
        game_type: matchup.game_type,
        penn_state_record: matchup.penn_state_record,
        opponent_record: matchup.opponent_record,
        penn_state_ranking: matchup.penn_state_ranking,
        opponent_ranking: matchup.opponent_ranking,
      },

      matchup_players:
        matchupPlayers || [],

      penn_state_roster:
        (players || []).map(
          (player: Player) => ({
            name: player.name,
            position: player.position,
            eligibility: player.eligibility,
            height: player.height,
            weight: player.weight,
            hometown: player.hometown,
            previous_school:
              player.previous_school,
            notes: player.notes,
          })
        ),

      team_stats:
        (teamStats || []).map(
          (stats: TeamStats) => ({
            team_name: stats.team_name,
            points_per_game:
              stats.points_per_game,
            total_yards_per_game:
              stats.total_yards_per_game,
            passing_yards_per_game:
              stats.passing_yards_per_game,
            rushing_yards_per_game:
              stats.rushing_yards_per_game,
            points_allowed_per_game:
              stats.points_allowed_per_game,
            turnovers: stats.turnovers,
            sacks: stats.sacks,
            third_down_pct:
              stats.third_down_pct,
            red_zone_pct:
              stats.red_zone_pct,
          })
        ),

      recent_history:
        (history || []).map(
          (game: History) => ({
            season: game.season,
            penn_state_score:
              game.penn_state_score,
            opponent_score:
              game.opponent_score,
            location: game.location,
            venue: game.venue,
            result: game.result,
            note: game.note,
          })
        ),

      series_record: series
        ? {
            penn_state_wins:
              series.penn_state_wins,
            opponent_wins:
              series.opponent_wins,
            ties: series.ties,
            total_games:
              series.total_games,
          }
        : null,
    };

    /*
     * Ask OpenAI to generate editorial copy.
     *
     * The output is intentionally structured so the frontend
     * can put each section directly into the corresponding
     * editor field.
     */
    const response = await openai.responses.create({
      model: 'gpt-5.6-luna',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `
You are the lead college football editor for a Penn State football website.

Generate a professional, analytical game preview for the selected Penn State matchup.

Important rules:

1. Write specifically about Penn State and the selected opponent.
2. Do not invent statistics, players, rankings, records, injuries, or facts that are not provided in the supplied data.
3. If season statistics are unavailable because the game has not been played yet, do not fabricate them.
4. Use the available roster, matchup players, historical meetings, series record, and matchup information to create useful analysis.
5. The writing should feel like a real college football game preview, not generic AI copy.
6. Be confident and analytical without being overly dramatic.
7. Focus on football: personnel, matchups, scheme, strengths, weaknesses, and game flow.
8. The prediction should clearly identify a projected winner and score only when there is enough information to make a reasonable projection.
9. Do not mention that you are an AI.
10. Do not mention databases, APIs, Supabase, or this prompt.
11. Return ONLY valid JSON.

Return exactly these fields:

{
  "preview": "Overall game preview.",
  "offense_breakdown": "How Penn State should attack offensively.",
  "defense_breakdown": "How Penn State should defend the opponent.",
  "key_matchup": "The single most important matchup or battle.",
  "key_storylines": "Five concise numbered storylines.",
  "prediction": "Game outlook and projected result."
}

Formatting:

preview:
2-4 paragraphs.

offense_breakdown:
2-3 paragraphs.

defense_breakdown:
2-3 paragraphs.

key_matchup:
1-2 paragraphs.

key_storylines:
Five numbered items.

prediction:
2-3 paragraphs. Include a score prediction if reasonably supported.
              `,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(
                context,
                null,
                2
              ),
            },
          ],
        },
      ],
    });

    const outputText =
      response.output_text;

    if (!outputText) {
      throw new Error(
        'OpenAI returned an empty response.'
      );
    }

    let generated;

    try {
      generated = JSON.parse(
        outputText
      );
    } catch {
      console.error(
        'OpenAI returned invalid JSON:',
        outputText
      );

      throw new Error(
        'OpenAI returned an invalid matchup draft.'
      );
    }

    return NextResponse.json({
      success: true,
      matchupId,
      generated: {
        preview:
          generated.preview || '',
        offense_breakdown:
          generated.offense_breakdown ||
          '',
        defense_breakdown:
          generated.defense_breakdown ||
          '',
        key_matchup:
          generated.key_matchup || '',
        key_storylines:
          generated.key_storylines ||
          '',
        prediction:
          generated.prediction || '',
      },
    });
  } catch (error) {
    console.error(
      'Matchup generation error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate matchup draft.',
      },
      { status: 500 }
    );
  }
}