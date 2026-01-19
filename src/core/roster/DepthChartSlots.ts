/**
 * Depth Chart Slots
 * Defines specific lineup slots for realistic NFL depth chart management
 * Separate from Position - a player has a position, but fills a slot on the depth chart
 */

import { Position } from '../models/player/Position';

/**
 * All depth chart slots organized by unit
 * These represent the actual "spots" on the depth chart, not player positions
 */
export enum DepthChartSlot {
  // === OFFENSE ===
  // Quarterbacks
  QB1 = 'QB1',
  QB2 = 'QB2',
  QB3 = 'QB3',

  // Running Backs
  RB1 = 'RB1', // Primary running back
  RB2 = 'RB2', // Secondary/change-of-pace back
  RB3 = 'RB3', // Third string
  FB = 'FB', // Fullback (optional in modern NFL)
  THIRD_DOWN_RB = '3DRB', // 3rd down passing specialist

  // Wide Receivers
  WR1 = 'WR1', // Primary outside receiver (X receiver)
  WR2 = 'WR2', // Secondary outside receiver (Z receiver)
  WR3 = 'WR3', // Third receiver (backup)
  SLOT_WR = 'SLOT', // Slot receiver (Y receiver)
  WR4 = 'WR4', // Fourth receiver
  WR5 = 'WR5', // Fifth receiver

  // Tight Ends
  TE1 = 'TE1',
  TE2 = 'TE2',
  TE3 = 'TE3',

  // Offensive Line
  LT1 = 'LT1',
  LT2 = 'LT2',
  LG1 = 'LG1',
  LG2 = 'LG2',
  C1 = 'C1',
  C2 = 'C2',
  RG1 = 'RG1',
  RG2 = 'RG2',
  RT1 = 'RT1',
  RT2 = 'RT2',

  // === DEFENSE (4-3 Base) ===
  // Defensive Line
  LE1 = 'LE1', // Left End
  LE2 = 'LE2',
  RE1 = 'RE1', // Right End
  RE2 = 'RE2',
  DT1 = 'DT1', // Defensive Tackle 1 (1-tech)
  DT2 = 'DT2', // Defensive Tackle 2 (3-tech)
  DT3 = 'DT3', // Backup DT

  // Pass Rush Specialists
  RUSH_LE = 'RLE', // Rush Left End (nickel/dime pass rush specialist)
  RUSH_RE = 'RRE', // Rush Right End
  RUSH_DT = 'RDT', // Rush Defensive Tackle (interior pass rush)

  // Linebackers
  LOLB1 = 'LOLB1', // Left Outside Linebacker
  LOLB2 = 'LOLB2',
  MLB1 = 'MLB1', // Middle Linebacker
  MLB2 = 'MLB2',
  ROLB1 = 'ROLB1', // Right Outside Linebacker
  ROLB2 = 'ROLB2',
  SUB_LB = 'SUBLB', // Sub package linebacker (coverage specialist)

  // Cornerbacks
  CB1 = 'CB1', // Primary cornerback
  CB2 = 'CB2', // Secondary cornerback
  CB3 = 'CB3', // Third cornerback
  SLOT_CB = 'NCB', // Nickel/Slot cornerback
  CB4 = 'CB4', // Fourth cornerback

  // Safeties
  FS1 = 'FS1', // Free Safety
  FS2 = 'FS2',
  SS1 = 'SS1', // Strong Safety
  SS2 = 'SS2',

  // === SPECIAL TEAMS ===
  K1 = 'K1', // Kicker
  K2 = 'K2',
  P1 = 'P1', // Punter
  P2 = 'P2',
  LS = 'LS', // Long Snapper
  H = 'H', // Holder
  KR1 = 'KR1', // Kick Returner
  KR2 = 'KR2',
  PR1 = 'PR1', // Punt Returner
  PR2 = 'PR2',
}

/**
 * Mapping of depth chart slots to positions that can fill them
 */
export const SLOT_ELIGIBLE_POSITIONS: Record<DepthChartSlot, Position[]> = {
  // QB
  [DepthChartSlot.QB1]: [Position.QB],
  [DepthChartSlot.QB2]: [Position.QB],
  [DepthChartSlot.QB3]: [Position.QB],

  // RB
  [DepthChartSlot.RB1]: [Position.RB],
  [DepthChartSlot.RB2]: [Position.RB],
  [DepthChartSlot.RB3]: [Position.RB],
  [DepthChartSlot.FB]: [Position.RB, Position.TE], // FB can be RB or TE in modern NFL
  [DepthChartSlot.THIRD_DOWN_RB]: [Position.RB, Position.WR], // Pass-catching RBs

  // WR
  [DepthChartSlot.WR1]: [Position.WR],
  [DepthChartSlot.WR2]: [Position.WR],
  [DepthChartSlot.WR3]: [Position.WR],
  [DepthChartSlot.SLOT_WR]: [Position.WR, Position.RB], // Slot can be WR or pass-catching RB
  [DepthChartSlot.WR4]: [Position.WR],
  [DepthChartSlot.WR5]: [Position.WR],

  // TE
  [DepthChartSlot.TE1]: [Position.TE],
  [DepthChartSlot.TE2]: [Position.TE],
  [DepthChartSlot.TE3]: [Position.TE],

  // OL
  [DepthChartSlot.LT1]: [Position.LT, Position.LG, Position.RT],
  [DepthChartSlot.LT2]: [Position.LT, Position.LG, Position.RT],
  [DepthChartSlot.LG1]: [Position.LG, Position.LT, Position.C, Position.RG],
  [DepthChartSlot.LG2]: [Position.LG, Position.LT, Position.C, Position.RG],
  [DepthChartSlot.C1]: [Position.C, Position.LG, Position.RG],
  [DepthChartSlot.C2]: [Position.C, Position.LG, Position.RG],
  [DepthChartSlot.RG1]: [Position.RG, Position.RT, Position.C, Position.LG],
  [DepthChartSlot.RG2]: [Position.RG, Position.RT, Position.C, Position.LG],
  [DepthChartSlot.RT1]: [Position.RT, Position.RG, Position.LT],
  [DepthChartSlot.RT2]: [Position.RT, Position.RG, Position.LT],

  // DL
  [DepthChartSlot.LE1]: [Position.DE],
  [DepthChartSlot.LE2]: [Position.DE],
  [DepthChartSlot.RE1]: [Position.DE],
  [DepthChartSlot.RE2]: [Position.DE],
  [DepthChartSlot.DT1]: [Position.DT],
  [DepthChartSlot.DT2]: [Position.DT],
  [DepthChartSlot.DT3]: [Position.DT],
  [DepthChartSlot.RUSH_LE]: [Position.DE, Position.OLB],
  [DepthChartSlot.RUSH_RE]: [Position.DE, Position.OLB],
  [DepthChartSlot.RUSH_DT]: [Position.DT, Position.DE],

  // LB
  [DepthChartSlot.LOLB1]: [Position.OLB],
  [DepthChartSlot.LOLB2]: [Position.OLB],
  [DepthChartSlot.MLB1]: [Position.ILB],
  [DepthChartSlot.MLB2]: [Position.ILB],
  [DepthChartSlot.ROLB1]: [Position.OLB],
  [DepthChartSlot.ROLB2]: [Position.OLB],
  [DepthChartSlot.SUB_LB]: [Position.ILB, Position.OLB, Position.SS], // Coverage LB

  // CB
  [DepthChartSlot.CB1]: [Position.CB],
  [DepthChartSlot.CB2]: [Position.CB],
  [DepthChartSlot.CB3]: [Position.CB],
  [DepthChartSlot.SLOT_CB]: [Position.CB, Position.SS], // Nickel corner can be CB or box safety
  [DepthChartSlot.CB4]: [Position.CB],

  // S
  [DepthChartSlot.FS1]: [Position.FS, Position.SS],
  [DepthChartSlot.FS2]: [Position.FS, Position.SS],
  [DepthChartSlot.SS1]: [Position.SS, Position.FS],
  [DepthChartSlot.SS2]: [Position.SS, Position.FS],

  // ST
  [DepthChartSlot.K1]: [Position.K],
  [DepthChartSlot.K2]: [Position.K, Position.P],
  [DepthChartSlot.P1]: [Position.P],
  [DepthChartSlot.P2]: [Position.P, Position.K],
  [DepthChartSlot.LS]: [Position.TE, Position.C], // Long snappers typically TE or C
  [DepthChartSlot.H]: [Position.P, Position.QB], // Holder is usually punter or backup QB
  [DepthChartSlot.KR1]: [Position.WR, Position.RB, Position.CB],
  [DepthChartSlot.KR2]: [Position.WR, Position.RB, Position.CB],
  [DepthChartSlot.PR1]: [Position.WR, Position.RB, Position.CB],
  [DepthChartSlot.PR2]: [Position.WR, Position.RB, Position.CB],
};

/**
 * Slot info for display and categorization
 */
export interface SlotInfo {
  slot: DepthChartSlot;
  displayName: string;
  shortName: string;
  category: 'offense' | 'defense' | 'specialTeams';
  subcategory: string;
  isSpecialist: boolean;
  isRequired: boolean;
  depthLevel: number; // 1 = starter, 2 = backup, 3+ = depth
}

/**
 * Complete slot information lookup
 */
export const SLOT_INFO: Record<DepthChartSlot, SlotInfo> = {
  // QB
  [DepthChartSlot.QB1]: {
    slot: DepthChartSlot.QB1,
    displayName: 'Starting Quarterback',
    shortName: 'QB1',
    category: 'offense',
    subcategory: 'Quarterbacks',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.QB2]: {
    slot: DepthChartSlot.QB2,
    displayName: 'Backup Quarterback',
    shortName: 'QB2',
    category: 'offense',
    subcategory: 'Quarterbacks',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 2,
  },
  [DepthChartSlot.QB3]: {
    slot: DepthChartSlot.QB3,
    displayName: 'Third String QB',
    shortName: 'QB3',
    category: 'offense',
    subcategory: 'Quarterbacks',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 3,
  },

  // RB
  [DepthChartSlot.RB1]: {
    slot: DepthChartSlot.RB1,
    displayName: 'Starting Running Back',
    shortName: 'RB1',
    category: 'offense',
    subcategory: 'Running Backs',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.RB2]: {
    slot: DepthChartSlot.RB2,
    displayName: 'Backup Running Back',
    shortName: 'RB2',
    category: 'offense',
    subcategory: 'Running Backs',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 2,
  },
  [DepthChartSlot.RB3]: {
    slot: DepthChartSlot.RB3,
    displayName: 'Third String RB',
    shortName: 'RB3',
    category: 'offense',
    subcategory: 'Running Backs',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 3,
  },
  [DepthChartSlot.FB]: {
    slot: DepthChartSlot.FB,
    displayName: 'Fullback',
    shortName: 'FB',
    category: 'offense',
    subcategory: 'Running Backs',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },
  [DepthChartSlot.THIRD_DOWN_RB]: {
    slot: DepthChartSlot.THIRD_DOWN_RB,
    displayName: '3rd Down Back',
    shortName: '3DRB',
    category: 'offense',
    subcategory: 'Running Backs',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },

  // WR
  [DepthChartSlot.WR1]: {
    slot: DepthChartSlot.WR1,
    displayName: 'Primary Receiver (X)',
    shortName: 'WR1',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.WR2]: {
    slot: DepthChartSlot.WR2,
    displayName: 'Secondary Receiver (Z)',
    shortName: 'WR2',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.WR3]: {
    slot: DepthChartSlot.WR3,
    displayName: 'Third Receiver',
    shortName: 'WR3',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.SLOT_WR]: {
    slot: DepthChartSlot.SLOT_WR,
    displayName: 'Slot Receiver (Y)',
    shortName: 'SLOT',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.WR4]: {
    slot: DepthChartSlot.WR4,
    displayName: 'Fourth Receiver',
    shortName: 'WR4',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.WR5]: {
    slot: DepthChartSlot.WR5,
    displayName: 'Fifth Receiver',
    shortName: 'WR5',
    category: 'offense',
    subcategory: 'Wide Receivers',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 3,
  },

  // TE
  [DepthChartSlot.TE1]: {
    slot: DepthChartSlot.TE1,
    displayName: 'Starting Tight End',
    shortName: 'TE1',
    category: 'offense',
    subcategory: 'Tight Ends',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.TE2]: {
    slot: DepthChartSlot.TE2,
    displayName: 'Backup Tight End',
    shortName: 'TE2',
    category: 'offense',
    subcategory: 'Tight Ends',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 2,
  },
  [DepthChartSlot.TE3]: {
    slot: DepthChartSlot.TE3,
    displayName: 'Third String TE',
    shortName: 'TE3',
    category: 'offense',
    subcategory: 'Tight Ends',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 3,
  },

  // OL
  [DepthChartSlot.LT1]: {
    slot: DepthChartSlot.LT1,
    displayName: 'Starting Left Tackle',
    shortName: 'LT1',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.LT2]: {
    slot: DepthChartSlot.LT2,
    displayName: 'Backup Left Tackle',
    shortName: 'LT2',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.LG1]: {
    slot: DepthChartSlot.LG1,
    displayName: 'Starting Left Guard',
    shortName: 'LG1',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.LG2]: {
    slot: DepthChartSlot.LG2,
    displayName: 'Backup Left Guard',
    shortName: 'LG2',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.C1]: {
    slot: DepthChartSlot.C1,
    displayName: 'Starting Center',
    shortName: 'C1',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.C2]: {
    slot: DepthChartSlot.C2,
    displayName: 'Backup Center',
    shortName: 'C2',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.RG1]: {
    slot: DepthChartSlot.RG1,
    displayName: 'Starting Right Guard',
    shortName: 'RG1',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.RG2]: {
    slot: DepthChartSlot.RG2,
    displayName: 'Backup Right Guard',
    shortName: 'RG2',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.RT1]: {
    slot: DepthChartSlot.RT1,
    displayName: 'Starting Right Tackle',
    shortName: 'RT1',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.RT2]: {
    slot: DepthChartSlot.RT2,
    displayName: 'Backup Right Tackle',
    shortName: 'RT2',
    category: 'offense',
    subcategory: 'Offensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },

  // DL
  [DepthChartSlot.LE1]: {
    slot: DepthChartSlot.LE1,
    displayName: 'Starting Left End',
    shortName: 'LE1',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.LE2]: {
    slot: DepthChartSlot.LE2,
    displayName: 'Backup Left End',
    shortName: 'LE2',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.RE1]: {
    slot: DepthChartSlot.RE1,
    displayName: 'Starting Right End',
    shortName: 'RE1',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.RE2]: {
    slot: DepthChartSlot.RE2,
    displayName: 'Backup Right End',
    shortName: 'RE2',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.DT1]: {
    slot: DepthChartSlot.DT1,
    displayName: 'Defensive Tackle 1',
    shortName: 'DT1',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.DT2]: {
    slot: DepthChartSlot.DT2,
    displayName: 'Defensive Tackle 2',
    shortName: 'DT2',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.DT3]: {
    slot: DepthChartSlot.DT3,
    displayName: 'Backup Defensive Tackle',
    shortName: 'DT3',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.RUSH_LE]: {
    slot: DepthChartSlot.RUSH_LE,
    displayName: 'Rush Left End',
    shortName: 'RLE',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },
  [DepthChartSlot.RUSH_RE]: {
    slot: DepthChartSlot.RUSH_RE,
    displayName: 'Rush Right End',
    shortName: 'RRE',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },
  [DepthChartSlot.RUSH_DT]: {
    slot: DepthChartSlot.RUSH_DT,
    displayName: 'Rush Defensive Tackle',
    shortName: 'RDT',
    category: 'defense',
    subcategory: 'Defensive Line',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },

  // LB
  [DepthChartSlot.LOLB1]: {
    slot: DepthChartSlot.LOLB1,
    displayName: 'Starting Left OLB',
    shortName: 'LOLB1',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.LOLB2]: {
    slot: DepthChartSlot.LOLB2,
    displayName: 'Backup Left OLB',
    shortName: 'LOLB2',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.MLB1]: {
    slot: DepthChartSlot.MLB1,
    displayName: 'Starting Middle LB',
    shortName: 'MLB1',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.MLB2]: {
    slot: DepthChartSlot.MLB2,
    displayName: 'Backup Middle LB',
    shortName: 'MLB2',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 2,
  },
  [DepthChartSlot.ROLB1]: {
    slot: DepthChartSlot.ROLB1,
    displayName: 'Starting Right OLB',
    shortName: 'ROLB1',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.ROLB2]: {
    slot: DepthChartSlot.ROLB2,
    displayName: 'Backup Right OLB',
    shortName: 'ROLB2',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.SUB_LB]: {
    slot: DepthChartSlot.SUB_LB,
    displayName: 'Sub Package LB',
    shortName: 'SUBLB',
    category: 'defense',
    subcategory: 'Linebackers',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 1,
  },

  // CB
  [DepthChartSlot.CB1]: {
    slot: DepthChartSlot.CB1,
    displayName: 'Starting Cornerback 1',
    shortName: 'CB1',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.CB2]: {
    slot: DepthChartSlot.CB2,
    displayName: 'Starting Cornerback 2',
    shortName: 'CB2',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.CB3]: {
    slot: DepthChartSlot.CB3,
    displayName: 'Third Cornerback',
    shortName: 'CB3',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.SLOT_CB]: {
    slot: DepthChartSlot.SLOT_CB,
    displayName: 'Nickel Cornerback',
    shortName: 'NCB',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.CB4]: {
    slot: DepthChartSlot.CB4,
    displayName: 'Fourth Cornerback',
    shortName: 'CB4',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },

  // Safety
  [DepthChartSlot.FS1]: {
    slot: DepthChartSlot.FS1,
    displayName: 'Starting Free Safety',
    shortName: 'FS1',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.FS2]: {
    slot: DepthChartSlot.FS2,
    displayName: 'Backup Free Safety',
    shortName: 'FS2',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.SS1]: {
    slot: DepthChartSlot.SS1,
    displayName: 'Starting Strong Safety',
    shortName: 'SS1',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.SS2]: {
    slot: DepthChartSlot.SS2,
    displayName: 'Backup Strong Safety',
    shortName: 'SS2',
    category: 'defense',
    subcategory: 'Secondary',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },

  // Special Teams
  [DepthChartSlot.K1]: {
    slot: DepthChartSlot.K1,
    displayName: 'Starting Kicker',
    shortName: 'K1',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.K2]: {
    slot: DepthChartSlot.K2,
    displayName: 'Backup Kicker',
    shortName: 'K2',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.P1]: {
    slot: DepthChartSlot.P1,
    displayName: 'Starting Punter',
    shortName: 'P1',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: false,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.P2]: {
    slot: DepthChartSlot.P2,
    displayName: 'Backup Punter',
    shortName: 'P2',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: false,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.LS]: {
    slot: DepthChartSlot.LS,
    displayName: 'Long Snapper',
    shortName: 'LS',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.H]: {
    slot: DepthChartSlot.H,
    displayName: 'Holder',
    shortName: 'H',
    category: 'specialTeams',
    subcategory: 'Kicking',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.KR1]: {
    slot: DepthChartSlot.KR1,
    displayName: 'Kick Returner',
    shortName: 'KR1',
    category: 'specialTeams',
    subcategory: 'Returns',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.KR2]: {
    slot: DepthChartSlot.KR2,
    displayName: 'Backup Kick Returner',
    shortName: 'KR2',
    category: 'specialTeams',
    subcategory: 'Returns',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 2,
  },
  [DepthChartSlot.PR1]: {
    slot: DepthChartSlot.PR1,
    displayName: 'Punt Returner',
    shortName: 'PR1',
    category: 'specialTeams',
    subcategory: 'Returns',
    isSpecialist: true,
    isRequired: true,
    depthLevel: 1,
  },
  [DepthChartSlot.PR2]: {
    slot: DepthChartSlot.PR2,
    displayName: 'Backup Punt Returner',
    shortName: 'PR2',
    category: 'specialTeams',
    subcategory: 'Returns',
    isSpecialist: true,
    isRequired: false,
    depthLevel: 2,
  },
};

/**
 * Get slots by category
 */
export function getSlotsByCategory(
  category: 'offense' | 'defense' | 'specialTeams'
): DepthChartSlot[] {
  return Object.values(DepthChartSlot).filter((slot) => SLOT_INFO[slot].category === category);
}

/**
 * Get slots grouped by subcategory
 */
export function getSlotsBySubcategory(
  category: 'offense' | 'defense' | 'specialTeams'
): Record<string, DepthChartSlot[]> {
  const slots = getSlotsByCategory(category);
  const grouped: Record<string, DepthChartSlot[]> = {};

  for (const slot of slots) {
    const subcategory = SLOT_INFO[slot].subcategory;
    if (!grouped[subcategory]) {
      grouped[subcategory] = [];
    }
    grouped[subcategory].push(slot);
  }

  return grouped;
}

/**
 * Get required starting slots
 */
export function getRequiredSlots(): DepthChartSlot[] {
  return Object.values(DepthChartSlot).filter(
    (slot) => SLOT_INFO[slot].isRequired && SLOT_INFO[slot].depthLevel === 1
  );
}

/**
 * Get specialist slots (non-standard roles)
 */
export function getSpecialistSlots(): DepthChartSlot[] {
  return Object.values(DepthChartSlot).filter((slot) => SLOT_INFO[slot].isSpecialist);
}

/**
 * Check if a player's position can fill a slot
 */
export function canFillSlot(playerPosition: Position, slot: DepthChartSlot): boolean {
  return SLOT_ELIGIBLE_POSITIONS[slot].includes(playerPosition);
}

/**
 * Get the primary position for a slot
 */
export function getPrimaryPositionForSlot(slot: DepthChartSlot): Position {
  return SLOT_ELIGIBLE_POSITIONS[slot][0];
}
