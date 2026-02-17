/**
 * College Stats Formatter
 * Utility functions for formatting position-specific college statistics
 * into display-friendly strings.
 */

import {
  PositionCollegeStats,
  QBCollegeStats,
  RBCollegeStats,
  WRCollegeStats,
  TECollegeStats,
  OLCollegeStats,
  DLCollegeStats,
  LBCollegeStats,
  DBCollegeStats,
  KPCollegeStats,
} from '../core/draft/Prospect';

/**
 * Structured highlight data for display components
 */
export interface CollegeStatsHighlight {
  primary: string;
  secondary: string;
  tertiary: string;
}

/**
 * Formats a number with commas for thousands
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Returns a one-line summary of college stats based on position type.
 */
export function formatCollegeStatLine(stats: PositionCollegeStats): string {
  switch (stats.type) {
    case 'QB': {
      const s = stats as QBCollegeStats;
      const compPct =
        s.passAttempts > 0 ? Math.round((s.passCompletions / s.passAttempts) * 100) : 0;
      return `${compPct}% comp, ${formatNumber(s.passYards)} yds, ${s.passTouchdowns} TD, ${s.interceptions} INT`;
    }
    case 'RB': {
      const s = stats as RBCollegeStats;
      const ypc = s.rushAttempts > 0 ? (s.rushYards / s.rushAttempts).toFixed(1) : '0.0';
      return `${formatNumber(s.rushYards)} yds, ${ypc} YPC, ${s.rushTouchdowns} TD`;
    }
    case 'WR': {
      const s = stats as WRCollegeStats;
      return `${s.receptions} rec, ${formatNumber(s.receivingYards)} yds, ${s.receivingTouchdowns} TD`;
    }
    case 'TE': {
      const s = stats as TECollegeStats;
      return `${s.receptions} rec, ${formatNumber(s.receivingYards)} yds, ${s.receivingTouchdowns} TD, ${s.blockingGrade.toFixed(0)} BLK`;
    }
    case 'OL': {
      const s = stats as OLCollegeStats;
      return `PB ${s.passBlockGrade.toFixed(0)}, RB ${s.runBlockGrade.toFixed(0)}, ${s.sacksAllowed} sacks allowed`;
    }
    case 'DL': {
      const s = stats as DLCollegeStats;
      return `${s.sacks} sacks, ${s.tacklesForLoss} TFL, ${s.forcedFumbles} FF`;
    }
    case 'LB': {
      const s = stats as LBCollegeStats;
      return `${s.totalTackles} tackles, ${s.sacks} sacks, ${s.interceptions} INT`;
    }
    case 'DB': {
      const s = stats as DBCollegeStats;
      return `${s.interceptions} INT, ${s.passesDefended} PD, ${s.totalTackles} tackles`;
    }
    case 'KP': {
      const s = stats as KPCollegeStats;
      const fgPct =
        s.fieldGoalAttempts > 0 ? Math.round((s.fieldGoalsMade / s.fieldGoalAttempts) * 100) : 0;
      return `${s.fieldGoalsMade}/${s.fieldGoalAttempts} FG (${fgPct}%), ${s.puntAverage.toFixed(1)} avg punt`;
    }
  }
}

/**
 * Returns structured highlight data (primary/secondary/tertiary) for display.
 */
export function getCollegeStatsHighlight(stats: PositionCollegeStats): CollegeStatsHighlight {
  switch (stats.type) {
    case 'QB': {
      const s = stats as QBCollegeStats;
      const compPct =
        s.passAttempts > 0 ? ((s.passCompletions / s.passAttempts) * 100).toFixed(1) : '0.0';
      return {
        primary: `${compPct}% completion`,
        secondary: `${formatNumber(s.passYards)} pass yds`,
        tertiary: `${s.passTouchdowns} TD / ${s.interceptions} INT`,
      };
    }
    case 'RB': {
      const s = stats as RBCollegeStats;
      const ypc = s.rushAttempts > 0 ? (s.rushYards / s.rushAttempts).toFixed(1) : '0.0';
      return {
        primary: `${formatNumber(s.rushYards)} rush yds`,
        secondary: `${ypc} YPC`,
        tertiary: `${s.rushTouchdowns} rush TD, ${s.receptions} rec`,
      };
    }
    case 'WR': {
      const s = stats as WRCollegeStats;
      return {
        primary: `${s.receptions} receptions`,
        secondary: `${formatNumber(s.receivingYards)} rec yds`,
        tertiary: `${s.receivingTouchdowns} TD, ${s.drops} drops`,
      };
    }
    case 'TE': {
      const s = stats as TECollegeStats;
      return {
        primary: `${s.receptions} rec, ${formatNumber(s.receivingYards)} yds`,
        secondary: `${s.receivingTouchdowns} TD`,
        tertiary: `${s.blockingGrade.toFixed(0)} blocking grade`,
      };
    }
    case 'OL': {
      const s = stats as OLCollegeStats;
      return {
        primary: `PB ${s.passBlockGrade.toFixed(0)} / RB ${s.runBlockGrade.toFixed(0)}`,
        secondary: `${s.sacksAllowed} sacks allowed`,
        tertiary: `${s.penaltiesCommitted} penalties`,
      };
    }
    case 'DL': {
      const s = stats as DLCollegeStats;
      return {
        primary: `${s.sacks} sacks`,
        secondary: `${s.tacklesForLoss} TFL`,
        tertiary: `${s.totalTackles} tackles, ${s.forcedFumbles} FF`,
      };
    }
    case 'LB': {
      const s = stats as LBCollegeStats;
      return {
        primary: `${s.totalTackles} tackles`,
        secondary: `${s.sacks} sacks, ${s.tacklesForLoss} TFL`,
        tertiary: `${s.interceptions} INT, ${s.passesDefended} PD`,
      };
    }
    case 'DB': {
      const s = stats as DBCollegeStats;
      return {
        primary: `${s.interceptions} INT`,
        secondary: `${s.passesDefended} PD`,
        tertiary: `${s.totalTackles} tackles, ${s.touchdowns} TD`,
      };
    }
    case 'KP': {
      const s = stats as KPCollegeStats;
      const fgPct =
        s.fieldGoalAttempts > 0
          ? ((s.fieldGoalsMade / s.fieldGoalAttempts) * 100).toFixed(1)
          : '0.0';
      return {
        primary: `${fgPct}% FG (${s.fieldGoalsMade}/${s.fieldGoalAttempts})`,
        secondary: `Long: ${s.longFieldGoal} yds`,
        tertiary: `${s.puntAverage.toFixed(1)} avg punt, ${s.touchbacks} TB`,
      };
    }
  }
}
