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

  if (decimals > 0) {
    return value.toFixed(decimals);
  }

  return value.toLocaleString();
}

function hasValue(value: any): boolean {
  return (
    value !== undefined &&
    value !== null &&
    Number(value) !== 0
  );
}

/*
 * Games Played
 *
 * Primary source:
 *   player_season_stats.games
 *
 * Fallbacks:
 *   stats.GP
 *   stats.GAMES
 *   stats.games
 *
 * This does NOT attempt to guess games played from
 * statistical totals.
 */
function getGamesPlayed(season: SeasonStats): string {
  if (hasValue(season.games)) {
    return formatStat(num(season.games));
  }

  const stats = season.stats || {};

  const fallback =
    stats.GP ??
    stats.GAMES ??
    stats.games;

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
  if (
    ['OT', 'OL', 'OG', 'OC', 'C', 'G', 'T'].includes(pos)
  ) {
    return 'OL';
  }
  if (
    ['DE', 'DT', 'DL', 'NT'].includes(pos)
  ) {
    return 'DL';
  }
  if (pos === 'LB') return 'LB';
  if (
    ['CB', 'S', 'DB', 'SAF'].includes(pos)
  ) {
    return 'DB';
  }
  if (['K', 'PK'].includes(pos)) return 'K';
  if (['P', 'PUNTER'].includes(pos)) return 'P';
  if (['LS', 'LONG SNAPPER'].includes(pos)) return 'LS';

  return 'OTHER';
}

function getCareerStats(
  seasonStats: SeasonStats[]
): CareerStats {
  return seasonStats.reduce(
    (career, season) => {
      const s = season.stats || {};

      const passing = s.passing || {};
      const rushing = s.rushing || {};
      const receiving = s.receiving || {};
      const defensive = s.defensive || {};
      const interceptions = s.interceptions || {};
      const fumbles = s.fumbles || {};
      const kicking = s.kicking || {};
      const punting = s.punting || {};

      career.passingYards += num(passing.YDS);
      career.passingTD += num(passing.TD);
      career.passingINT += num(passing.INT);

      career.completions += num(
        passing.COMPLETIONS ?? passing.CMP
      );

      career.attempts += num(passing.ATT);

      career.rushingYards += num(rushing.YDS);
      career.rushingTD += num(rushing.TD);
      career.carries += num(rushing.CAR);

      career.receivingYards += num(receiving.YDS);
      career.receivingTD += num(receiving.TD);
      career.receptions += num(receiving.REC);

      career.tackles += num(
        defensive.TOT ?? defensive.TACKLES
      );

      career.soloTackles += num(defensive.SOLO);
      career.tfl += num(defensive.TFL);
      career.sacks += num(defensive.SACKS);
      career.passesDefended += num(defensive.PD);

      career.interceptions += num(
        interceptions.INT ?? defensive.INT
      );

      career.forcedFumbles += num(
        defensive.FF ?? fumbles.FF
      );

      career.fumbleRecoveries += num(
        fumbles.REC ?? defensive.FR
      );

      career.fgMade += num(kicking.FGM);
      career.fgAttempted += num(kicking.FGA);
      career.xpMade += num(kicking.XPM);
      career.xpAttempted += num(kicking.XPA);

      career.punts += num(
        punting.NO ?? punting.PUNTS
      );

      career.puntYards += num(punting.YDS);

      career.puntLong = Math.max(
        career.puntLong,
        num(punting.LONG)
      );

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

function getCareerSnapshot(
  position: string,
  career: CareerStats
) {
  const group = getPositionGroup(position);

  switch (group) {
    case 'QB':
      return [
        {
          label: 'Pass Yards',
          value: formatStat(career.passingYards),
        },
        {
          label: 'Pass TD',
          value: formatStat(career.passingTD),
        },
        {
          label: 'INT',
          value: formatStat(career.passingINT),
        },
        {
          label: 'Rush Yards',
          value: formatStat(career.rushingYards),
        },
        {
          label: 'Rush TD',
          value: formatStat(career.rushingTD),
        },
      ];

    case 'RB':
      return [
        {
          label: 'Rush Yards',
          value: formatStat(career.rushingYards),
        },
        {
          label: 'Rush TD',
          value: formatStat(career.rushingTD),
        },
        {
          label: 'Carries',
          value: formatStat(career.carries),
        },
        {
          label: 'Receptions',
          value: formatStat(career.receptions),
        },
        {
          label: 'Rec Yards',
          value: formatStat(career.receivingYards),
        },
      ];

    case 'RECEIVER':
      return [
        {
          label: 'Receptions',
          value: formatStat(career.receptions),
        },
        {
          label: 'Rec Yards',
          value: formatStat(career.receivingYards),
        },
        {
          label: 'Rec TD',
          value: formatStat(career.receivingTD),
        },
        ...(career.rushingYards > 0
          ? [
              {
                label: 'Rush Yards',
                value: formatStat(
                  career.rushingYards
                ),
              },
            ]
          : []),
      ];

    case 'DL':
      return [
        {
          label: 'Tackles',
          value: formatStat(career.tackles),
        },
        {
          label: 'TFL',
          value: formatStat(career.tfl, 1),
        },
        {
          label: 'Sacks',
          value: formatStat(career.sacks, 1),
        },
        ...(career.passesDefended > 0
          ? [
              {
                label: 'PD',
                value: formatStat(
                  career.passesDefended
                ),
              },
            ]
          : []),
      ];

    case 'LB':
      return [
        {
          label: 'Tackles',
          value: formatStat(career.tackles),
        },
        {
          label: 'TFL',
          value: formatStat(career.tfl, 1),
        },
        {
          label: 'Sacks',
          value: formatStat(career.sacks, 1),
        },
        ...(career.passesDefended > 0
          ? [
              {
                label: 'PD',
                value: formatStat(
                  career.passesDefended
                ),
              },
            ]
          : []),
        ...(career.interceptions > 0
          ? [
              {
                label: 'INT',
                value: formatStat(
                  career.interceptions
                ),
              },
            ]
          : []),
      ];

    case 'DB':
      return [
        {
          label: 'Tackles',
          value: formatStat(career.tackles),
        },
        {
          label: 'TFL',
          value: formatStat(career.tfl, 1),
        },
        {
          label: 'INT',
          value: formatStat(
            career.interceptions
          ),
        },
        {
          label: 'PD',
          value: formatStat(
            career.passesDefended
          ),
        },
        ...(career.sacks > 0
          ? [
              {
                label: 'Sacks',
                value: formatStat(
                  career.sacks,
                  1
                ),
              },
            ]
          : []),
      ];

    case 'K':
      return [
        {
          label: 'FG Made',
          value: formatStat(career.fgMade),
        },
        {
          label: 'FG Att',
          value: formatStat(career.fgAttempted),
        },
        {
          label: 'XP Made',
          value: formatStat(career.xpMade),
        },
        {
          label: 'XP Att',
          value: formatStat(career.xpAttempted),
        },
      ];

    case 'P':
      return [
        {
          label: 'Punts',
          value: formatStat(career.punts),
        },
        {
          label: 'Punt Yards',
          value: formatStat(career.puntYards),
        },
        ...(career.punts > 0
          ? [
              {
                label: 'Avg',
                value: formatStat(
                  career.puntYards /
                    career.punts,
                  1
                ),
              },
            ]
          : []),
        {
          label: 'Long',
          value: formatStat(
            career.puntLong
          ),
        },
      ];

    default:
      return [];
  }
}

function getCurrentSeasonStats(
  position: string,
  stats: Record<string, any>
) {
  const group = getPositionGroup(position);

  const passing = stats.passing || {};
  const rushing = stats.rushing || {};
  const receiving = stats.receiving || {};
  const defensive = stats.defensive || {};
  const interceptions = stats.interceptions || {};
  const kicking = stats.kicking || {};
  const punting = stats.punting || {};

  switch (group) {
    case 'QB':
      return [
        {
          label: 'Pass Yards',
          value: formatStat(num(passing.YDS)),
        },
        {
          label: 'Pass TD',
          value: formatStat(num(passing.TD)),
        },
        {
          label: 'INT',
          value: formatStat(num(passing.INT)),
        },
        {
          label: 'Rush Yards',
          value: formatStat(num(rushing.YDS)),
        },
        {
          label: 'Rush TD',
          value: formatStat(num(rushing.TD)),
        },
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'RB':
      return [
        {
          label: 'Rush Yards',
          value: formatStat(num(rushing.YDS)),
        },
        {
          label: 'Rush TD',
          value: formatStat(num(rushing.TD)),
        },
        {
          label: 'Carries',
          value: formatStat(num(rushing.CAR)),
        },
        {
          label: 'Receptions',
          value: formatStat(num(receiving.REC)),
        },
        {
          label: 'Rec Yards',
          value: formatStat(num(receiving.YDS)),
        },
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'RECEIVER':
      return [
        {
          label: 'Receptions',
          value: formatStat(num(receiving.REC)),
        },
        {
          label: 'Rec Yards',
          value: formatStat(num(receiving.YDS)),
        },
        {
          label: 'Rec TD',
          value: formatStat(num(receiving.TD)),
        },
        ...(hasValue(rushing.YDS)
          ? [
              {
                label: 'Rush Yards',
                value: formatStat(
                  num(rushing.YDS)
                ),
              },
            ]
          : []),
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'DL':
      return [
        {
          label: 'Tackles',
          value: formatStat(
            num(
              defensive.TOT ??
                defensive.TACKLES
            )
          ),
        },
        {
          label: 'TFL',
          value: formatStat(
            num(defensive.TFL),
            1
          ),
        },
        {
          label: 'Sacks',
          value: formatStat(
            num(defensive.SACKS),
            1
          ),
        },
        ...(hasValue(defensive.PD)
          ? [
              {
                label: 'PD',
                value: formatStat(
                  num(defensive.PD)
                ),
              },
            ]
          : []),
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'LB':
      return [
        {
          label: 'Tackles',
          value: formatStat(
            num(
              defensive.TOT ??
                defensive.TACKLES
            )
          ),
        },
        {
          label: 'TFL',
          value: formatStat(
            num(defensive.TFL),
            1
          ),
        },
        {
          label: 'Sacks',
          value: formatStat(
            num(defensive.SACKS),
            1
          ),
        },
        ...(hasValue(defensive.PD)
          ? [
              {
                label: 'PD',
                value: formatStat(
                  num(defensive.PD)
                ),
              },
            ]
          : []),
        ...(hasValue(interceptions.INT)
          ? [
              {
                label: 'INT',
                value: formatStat(
                  num(interceptions.INT)
                ),
              },
            ]
          : []),
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'DB':
      return [
        {
          label: 'Tackles',
          value: formatStat(
            num(
              defensive.TOT ??
                defensive.TACKLES
            )
          ),
        },
        {
          label: 'TFL',
          value: formatStat(
            num(defensive.TFL),
            1
          ),
        },
        {
          label: 'INT',
          value: formatStat(
            num(
              interceptions.INT ??
                defensive.INT
            )
          ),
        },
        {
          label: 'PD',
          value: formatStat(
            num(defensive.PD)
          ),
        },
        ...(hasValue(defensive.SACKS)
          ? [
              {
                label: 'Sacks',
                value: formatStat(
                  num(defensive.SACKS),
                  1
                ),
              },
            ]
          : []),
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'K':
      return [
        {
          label: 'FG Made',
          value: formatStat(
            num(kicking.FGM)
          ),
        },
        {
          label: 'FG Att',
          value: formatStat(
            num(kicking.FGA)
          ),
        },
        {
          label: 'XP Made',
          value: formatStat(
            num(kicking.XPM)
          ),
        },
        {
          label: 'XP Att',
          value: formatStat(
            num(kicking.XPA)
          ),
        },
      ].filter(
        (stat) => stat.value !== '0'
      );

    case 'P':
      return [
        {
          label: 'Punts',
          value: formatStat(
            num(
              punting.NO ??
                punting.PUNTS
            )
          ),
        },
        {
          label: 'Punt Yards',
          value: formatStat(
            num(punting.YDS)
          ),
        },
        ...(hasValue(
          punting.NO ??
            punting.PUNTS
        )
          ? [
              {
                label: 'Avg',
                value: formatStat(
                  num(punting.YDS) /
                    num(
                      punting.NO ??
                        punting.PUNTS
                    ),
                  1
                ),
              },
            ]
          : []),
        {
          label: 'Long',
          value: formatStat(
            num(punting.LONG)
          ),
        },
      ].filter(
        (stat) => stat.value !== '0'
      );

    default:
      return [];
  }
}

function getCareerColumns(position: string) {
  switch (getPositionGroup(position)) {
    case 'QB':
      return [
        'Season',
        'Team',
        'GP',
        'Comp',
        'Att',
        'Pass Yds',
        'Pass TD',
        'INT',
        'Rush Yds',
        'Rush TD',
      ];

    case 'RB':
      return [
        'Season',
        'Team',
        'GP',
        'Car',
        'Rush Yds',
        'Rush TD',
        'Rec',
        'Rec Yds',
        'Rec TD',
      ];

    case 'RECEIVER':
      return [
        'Season',
        'Team',
        'GP',
        'Rec',
        'Rec Yds',
        'TD',
        'YPR',
        'Long',
      ];

    case 'DL':
      return [
        'Season',
        'Team',
        'GP',
        'Tackles',
        'TFL',
        'Sacks',
        'PD',
      ];

    case 'LB':
      return [
        'Season',
        'Team',
        'GP',
        'Tackles',
        'TFL',
        'Sacks',
        'PD',
        'INT',
      ];

    case 'DB':
      return [
        'Season',
        'Team',
        'GP',
        'Tackles',
        'TFL',
        'Sacks',
        'INT',
        'PD',
      ];

    case 'K':
      return [
        'Season',
        'Team',
        'GP',
        'FGM',
        'FGA',
        'XPM',
        'XPA',
      ];

    case 'P':
      return [
        'Season',
        'Team',
        'GP',
        'Punts',
        'Punt Yds',
        'Avg',
        'Long',
      ];

    default:
      return [
        'Season',
        'Team',
        'GP',
      ];
  }
}

function getCareerRow(
  season: SeasonStats,
  position: string
): string[] {
  const s = season.stats || {};

  const passing = s.passing || {};
  const rushing = s.rushing || {};
  const receiving = s.receiving || {};
  const defensive = s.defensive || {};
  const interceptions = s.interceptions || {};
  const kicking = s.kicking || {};
  const punting = s.punting || {};

  const gp = getGamesPlayed(season);

  switch (getPositionGroup(position)) {
    case 'QB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(
            passing.COMPLETIONS ??
              passing.CMP
          )
        ),
        formatStat(
          num(passing.ATT)
        ),
        formatStat(
          num(passing.YDS)
        ),
        formatStat(
          num(passing.TD)
        ),
        formatStat(
          num(passing.INT)
        ),
        formatStat(
          num(rushing.YDS)
        ),
        formatStat(
          num(rushing.TD)
        ),
      ];

    case 'RB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(rushing.CAR)
        ),
        formatStat(
          num(rushing.YDS)
        ),
        formatStat(
          num(rushing.TD)
        ),
        formatStat(
          num(receiving.REC)
        ),
        formatStat(
          num(receiving.YDS)
        ),
        formatStat(
          num(receiving.TD)
        ),
      ];

    case 'RECEIVER':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(receiving.REC)
        ),
        formatStat(
          num(receiving.YDS)
        ),
        formatStat(
          num(receiving.TD)
        ),
        hasValue(receiving.YPR)
          ? formatStat(
              num(receiving.YPR),
              1
            )
          : '—',
        hasValue(receiving.LONG)
          ? formatStat(
              num(receiving.LONG)
            )
          : '—',
      ];

    case 'DL':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(
            defensive.TOT ??
              defensive.TACKLES
          )
        ),
        formatStat(
          num(defensive.TFL),
          1
        ),
        formatStat(
          num(defensive.SACKS),
          1
        ),
        formatStat(
          num(defensive.PD)
        ),
      ];

    case 'LB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(
            defensive.TOT ??
              defensive.TACKLES
          )
        ),
        formatStat(
          num(defensive.TFL),
          1
        ),
        formatStat(
          num(defensive.SACKS),
          1
        ),
        formatStat(
          num(defensive.PD)
        ),
        formatStat(
          num(
            interceptions.INT ??
              defensive.INT
          )
        ),
      ];

    case 'DB':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(
            defensive.TOT ??
              defensive.TACKLES
          )
        ),
        formatStat(
          num(defensive.TFL),
          1
        ),
        formatStat(
          num(defensive.SACKS),
          1
        ),
        formatStat(
          num(
            interceptions.INT ??
              defensive.INT
          )
        ),
        formatStat(
          num(defensive.PD)
        ),
      ];

    case 'K':
      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(
          num(kicking.FGM)
        ),
        formatStat(
          num(kicking.FGA)
        ),
        formatStat(
          num(kicking.XPM)
        ),
        formatStat(
          num(kicking.XPA)
        ),
      ];

    case 'P': {
      const punts = num(
        punting.NO ??
          punting.PUNTS
      );

      const yards = num(
        punting.YDS
      );

      return [
        season.season.toString(),
        season.team || '—',
        gp,
        formatStat(punts),
        formatStat(yards),
        punts > 0
          ? formatStat(
              yards / punts,
              1
            )
          : '—',
        formatStat(
          num(punting.LONG)
        ),
      ];
    }

    default:
      return [
        season.season.toString(),
        season.team || '—',
        gp,
      ];
  }
}

function getSeasonHighlights(
  season: SeasonStats,
  position: string
): string[] {
  const s = season.stats || {};
  const highlights: string[] = [];

  const group = getPositionGroup(position);

  const passing = s.passing || {};
  const rushing = s.rushing || {};
  const receiving = s.receiving || {};
  const defensive = s.defensive || {};
  const interceptions = s.interceptions || {};
  const kicking = s.kicking || {};
  const punting = s.punting || {};

  if (group === 'QB') {
    if (hasValue(passing.YDS)) {
      highlights.push(
        `${formatStat(
          num(passing.YDS)
        )} passing yards`
      );
    }

    if (hasValue(passing.TD)) {
      highlights.push(
        `${formatStat(
          num(passing.TD)
        )} passing touchdowns`
      );
    }

    if (hasValue(rushing.YDS)) {
      highlights.push(
        `${formatStat(
          num(rushing.YDS)
        )} rushing yards`
      );
    }
  }

  if (group === 'RB') {
    if (hasValue(rushing.YDS)) {
      highlights.push(
        `${formatStat(
          num(rushing.YDS)
        )} rushing yards`
      );
    }

    if (hasValue(rushing.TD)) {
      highlights.push(
        `${formatStat(
          num(rushing.TD)
        )} rushing touchdowns`
      );
    }

    if (hasValue(receiving.YDS)) {
      highlights.push(
        `${formatStat(
          num(receiving.YDS)
        )} receiving yards`
      );
    }
  }

  if (group === 'RECEIVER') {
    if (hasValue(receiving.REC)) {
      highlights.push(
        `${formatStat(
          num(receiving.REC)
        )} receptions`
      );
    }

    if (hasValue(receiving.YDS)) {
      highlights.push(
        `${formatStat(
          num(receiving.YDS)
        )} receiving yards`
      );
    }

    if (hasValue(receiving.TD)) {
      highlights.push(
        `${formatStat(
          num(receiving.TD)
        )} receiving touchdowns`
      );
    }

    if (hasValue(receiving.LONG)) {
      highlights.push(
        `${formatStat(
          num(receiving.LONG)
        )}-yard long reception`
      );
    }
  }

  if (
    group === 'DL' ||
    group === 'LB' ||
    group === 'DB'
  ) {
    const tackles = num(
      defensive.TOT ??
        defensive.TACKLES
    );

    if (tackles > 0) {
      highlights.push(
        `${formatStat(
          tackles
        )} total tackles`
      );
    }

    if (hasValue(defensive.TFL)) {
      highlights.push(
        `${formatStat(
          num(defensive.TFL),
          1
        )} tackles for loss`
      );
    }

    if (hasValue(defensive.SACKS)) {
      highlights.push(
        `${formatStat(
          num(defensive.SACKS),
          1
        )} sacks`
      );
    }

    const ints = num(
      interceptions.INT ??
        defensive.INT
    );

    if (ints > 0) {
      highlights.push(
        `${formatStat(
          ints
        )} interceptions`
      );
    }

    if (hasValue(defensive.PD)) {
      highlights.push(
        `${formatStat(
          num(defensive.PD)
        )} passes defended`
      );
    }
  }

  if (group === 'K') {
    if (hasValue(kicking.FGM)) {
      highlights.push(
        `${formatStat(
          num(kicking.FGM)
        )} field goals made`
      );
    }

    if (hasValue(kicking.XPM)) {
      highlights.push(
        `${formatStat(
          num(kicking.XPM)
        )} extra points made`
      );
    }
  }

  if (group === 'P') {
    const punts = num(
      punting.NO ??
        punting.PUNTS
    );

    const yards = num(
      punting.YDS
    );

    if (punts > 0) {
      highlights.push(
        `${formatStat(
          punts
        )} punts`
      );

      if (yards > 0) {
        highlights.push(
          `${formatStat(
            yards / punts,
            1
          )} yards per punt`
        );
      }
    }

    if (hasValue(punting.LONG)) {
      highlights.push(
        `${formatStat(
          num(punting.LONG)
        )}-yard long punt`
      );
    }
  }

  return highlights.slice(0, 4);
}

export default function PlayerPage() {
  const params = useParams();

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [seasonStats, setSeasonStats] =
    useState<SeasonStats[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function loadPlayer() {
      try {
        setLoading(true);
        setError('');

        const playerId = Number(
          params.id
        );

        if (!Number.isFinite(playerId)) {
          throw new Error(
            'Invalid player ID'
          );
        }

        const {
          data: playerData,
          error: playerError,
        } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (playerError) {
          throw playerError;
        }

        const {
          data: statsData,
          error: statsError,
        } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('player_id', playerId)
          .order('season', {
            ascending: false,
          });

        if (statsError) {
          throw statsError;
        }

        setPlayer(playerData);
        setSeasonStats(
          statsData || []
        );
      } catch (err: any) {
        console.error(err);

        setError(
          err?.message ||
            'Unable to load player'
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadPlayer();
    }
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-slate-400">
            Loading player...
          </p>
        </div>
      </main>
    );
  }

  if (error || !player) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Roster
          </Link>

          <div className="mt-10 rounded-xl border border-red-900 bg-red-950/30 p-6">
            <h1 className="text-xl font-bold">
              Player not found
            </h1>

            <p className="mt-2 text-slate-400">
              {error ||
                'This player could not be found.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const currentSeason =
    seasonStats.find(
      (stat) =>
        stat.season === 2026
    ) || null;

  const currentSeasonData =
    currentSeason?.stats || {};

  const careerStats =
    getCareerStats(seasonStats);

  const careerSnapshot =
    getCareerSnapshot(
      player.position,
      careerStats
    );

  const currentSeasonStats =
    getCurrentSeasonStats(
      player.position,
      currentSeasonData
    );

  const careerColumns =
    getCareerColumns(
      player.position
    );

  const scoutingTag =
    player.scouting_tag;

  const scoutingNote =
    player.scouting_note;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* BACK */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to Roster
        </Link>

        {/* HERO */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">

              <div>
                <div className="flex items-center gap-4">

                  <div className="text-6xl font-black text-slate-600">
                    #{player.number}
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-blue-400 font-semibold">
                      Penn State Football
                    </p>

                    <h1 className="mt-1 text-4xl md:text-5xl font-black tracking-tight">
                      {player.name}
                    </h1>
                  </div>

                </div>

                <div className="mt-5 flex flex-wrap gap-3">

                  <span className="rounded-full bg-blue-600/20 border border-blue-500/30 px-4 py-1.5 text-sm font-semibold text-blue-300">
                    {player.position}
                  </span>

                  {player.eligibility && (
                    <span className="rounded-full bg-slate-800 px-4 py-1.5 text-sm text-slate-300">
                      {player.eligibility}
                    </span>
                  )}

                  {player.depth_rank && (
                    <span className="rounded-full bg-slate-800 px-4 py-1.5 text-sm text-slate-300">
                      Depth #{player.depth_rank}
                    </span>
                  )}

                </div>
              </div>

              <div className="text-left md:text-right">

                {player.height && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">
                      Height
                    </span>{' '}
                    {player.height}
                  </p>
                )}

                {player.weight && (
                  <p className="text-slate-300">
                    <span className="text-slate-500">
                      Weight
                    </span>{' '}
                    {player.weight} lbs
                  </p>
                )}

              </div>

            </div>
          </div>
        </section>

        {/* SCOUTING */}
        {(scoutingTag ||
          scoutingNote) && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">

            <div className="flex items-center justify-between gap-4">

              <h2 className="text-xl font-bold">
                Penn State Scouting
              </h2>

              {scoutingTag && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    scoutingTag === 'Star'
                      ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'
                      : scoutingTag === 'Impact'
                      ? 'bg-green-400/15 text-green-300 border border-green-400/30'
                      : scoutingTag ===
                        'Star in the Making'
                      ? 'bg-purple-400/15 text-purple-300 border border-purple-400/30'
                      : scoutingTag ===
                        'Developmental'
                      ? 'bg-blue-400/15 text-blue-300 border border-blue-400/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {scoutingTag}
                </span>
              )}

            </div>

            {scoutingNote && (
              <p className="mt-4 text-slate-300 leading-7">
                {scoutingNote}
              </p>
            )}

          </section>
        )}

        {/* CAREER SNAPSHOT */}
        <section className="mt-10">

          <div className="flex items-end justify-between mb-5">
            <div>

              <h2 className="text-2xl font-bold">
                Career Snapshot
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Career production based on recorded statistics
              </p>

            </div>
          </div>

          {careerSnapshot.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

              {careerSnapshot.map(
                (stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                  >

                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      {stat.value}
                    </p>

                  </div>
                )
              )}

            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
              No career statistics recorded for this player.
            </div>
          )}

        </section>

        {/* 2026 SEASON */}
        <section className="mt-10">

          <div className="mb-5">

            <h2 className="text-2xl font-bold">
              2026 Season
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current season production
            </p>

          </div>

          {currentSeason ? (
            currentSeasonStats.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

                {currentSeasonStats.map(
                  (stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                    >

                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {stat.value}
                      </p>

                    </div>
                  )
                )}

              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
                No 2026 statistics recorded yet.
              </div>
            )
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
              No 2026 season statistics recorded.
            </div>
          )}

        </section>

        {/* CAREER STATS */}
        <section className="mt-10">

          <div className="mb-5">

            <h2 className="text-2xl font-bold">
              Career Stats
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Season-by-season production
            </p>

          </div>

          {seasonStats.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">

              <table className="w-full min-w-max text-sm">

                <thead className="bg-slate-900">

                  <tr>
                    {careerColumns.map(
                      (column) => (
                        <th
                          key={column}
                          className="px-5 py-4 text-left font-semibold text-slate-400 whitespace-nowrap"
                        >
                          {column}
                        </th>
                      )
                    )}
                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-800">

                  {seasonStats.map(
                    (season) => {

                      const row =
                        getCareerRow(
                          season,
                          player.position
                        );

                      return (
                        <tr
                          key={season.id}
                          className="bg-slate-950 hover:bg-slate-900/60"
                        >

                          {row.map(
                            (
                              value,
                              index
                            ) => (
                              <td
                                key={`${season.id}-${index}`}
                                className={`px-5 py-4 whitespace-nowrap ${
                                  index === 0
                                    ? 'font-semibold text-white'
                                    : 'text-slate-300'
                                }`}
                              >
                                {value}
                              </td>
                            )
                          )}

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
              No season statistics recorded.
            </div>
          )}

        </section>

        {/* PLAYER DETAILS */}
        <section className="mt-10">

          <h2 className="text-2xl font-bold mb-5">
            Player Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Hometown
              </p>

              <p className="mt-2 text-slate-200">
                {player.hometown || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                High School
              </p>

              <p className="mt-2 text-slate-200">
                {player.high_school || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Previous School
              </p>

              <p className="mt-2 text-slate-200">
                {player.previous_school || '—'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Eligibility
              </p>

              <p className="mt-2 text-slate-200">
                {player.eligibility || '—'}
              </p>
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
          <section className="mt-10">

            <h2 className="text-2xl font-bold mb-5">
              Recruiting Profile
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

              {/* STARS */}
              {player.star_rating > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Rating
                  </p>

                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <span
                        key={index}
                        className={
                          index <
                          player.star_rating
                            ? 'text-yellow-400 text-xl'
                            : 'text-slate-700 text-xl'
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>

                </div>
              )}

              {player.recruiting_class && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Class
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    {player.recruiting_class}
                  </p>

                </div>
              )}

              {player.national_rank && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    National Rank
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    #{player.national_rank}
                  </p>

                </div>
              )}

              {player.position_rank && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Position Rank
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    #{player.position_rank}
                  </p>

                </div>
              )}

              {player.state_rank && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    State Rank
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    #{player.state_rank}
                  </p>

                </div>
              )}

            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">

              {player.recruiting_position && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Recruiting Position
                  </p>

                  <p className="mt-2 text-slate-200">
                    {player.recruiting_position}
                  </p>

                </div>
              )}

              {player.recruiting_team && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Recruiting Team
                  </p>

                  <p className="mt-2 text-slate-200">
                    {player.recruiting_team}
                  </p>

                </div>
              )}

            </div>

          </section>
        )}

        {/* SEASON HISTORY */}
        {seasonStats.length > 0 && (
          <section className="mt-10 pb-12">

            <h2 className="text-2xl font-bold mb-5">
              Season History
            </h2>

            <div className="space-y-4">

              {seasonStats.map(
                (season) => {

                  const highlights =
                    getSeasonHighlights(
                      season,
                      player.position
                    );

                  const gamesPlayed =
                    getGamesPlayed(
                      season
                    );

                  return (
                    <div
                      key={season.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                    >

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                        <div>

                          <h3 className="text-lg font-bold">
                            {season.season}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {season.team ||
                              'Team not recorded'}
                          </p>

                        </div>

                        {gamesPlayed !== '—' && (
                          <span className="text-sm text-slate-400">
                            {gamesPlayed}{' '}
                            {gamesPlayed === '1'
                              ? 'game'
                              : 'games'}
                          </span>
                        )}

                      </div>

                      {highlights.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">

                          {highlights.map(
                            (highlight) => (
                              <span
                                key={highlight}
                                className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                              >
                                {highlight}
                              </span>
                            )
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

      </div>
    </main>
  );
}