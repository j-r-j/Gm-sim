/**
 * Mock Data for Demo/Testing
 * Provides sample data for testing screens without full game state.
 */

import { Position } from '../core/models/player/Position';
import { type DraftBoardProspect } from '../screens/DraftBoardScreen';
import { type PlayerProfileScreenProps } from '../screens/PlayerProfileScreen';
import { type GameSetupResult } from '../core/game/GameSetup';
import { type TeamGameState } from '../core/engine/TeamGameState';
import { type Coach } from '../core/models/staff/Coach';

/**
 * Create a mock skill value
 */
function mockSkill(min: number, max: number, maturityAge = 26) {
  return {
    trueValue: Math.round((min + max) / 2),
    perceivedMin: min,
    perceivedMax: max,
    maturityAge,
  };
}

/**
 * Mock draft prospects
 */
export const mockProspects: DraftBoardProspect[] = [
  {
    id: 'prospect-1',
    name: 'Marcus Williams',
    position: Position.QB,
    collegeName: 'Ohio State',
    age: 22,
    projectedRound: 1,
    projectedPickRange: { min: 1, max: 5 },
    userTier: 'Elite',
    flagged: true,
    positionRank: 1,
    overallRank: 1,
    skills: {
      armStrength: mockSkill(75, 85),
      accuracy: mockSkill(70, 80),
      decisionMaking: mockSkill(65, 75),
      pocketPresence: mockSkill(68, 78),
    },
    physical: {
      height: 75,
      weight: 220,
      armLength: 33,
      handSize: 10,
      wingspan: 78,
      speed: 4.55,
      acceleration: 72,
      agility: 68,
      strength: 60,
      verticalJump: 34,
    },
    combine: {
      fortyYardDash: 4.58,
      benchPress: 18,
      verticalJump: 34.5,
      broadJump: 116,
      threeConeDrill: 7.02,
      twentyYardShuttle: 4.25,
    },
    ovrRange: '75-85',
    confidence: 82,
    confidenceLabel: 'High',
  },
  {
    id: 'prospect-2',
    name: 'Jamal Carter',
    position: Position.RB,
    collegeName: 'Alabama',
    age: 21,
    projectedRound: 1,
    projectedPickRange: { min: 10, max: 20 },
    userTier: null,
    flagged: false,
    positionRank: 1,
    overallRank: 8,
    skills: {
      speed: mockSkill(80, 90),
      power: mockSkill(70, 80),
      vision: mockSkill(72, 82),
      receiving: mockSkill(65, 75),
    },
    physical: {
      height: 70,
      weight: 215,
      armLength: 31,
      handSize: 9,
      wingspan: 74,
      speed: 4.38,
      acceleration: 85,
      agility: 78,
      strength: 72,
      verticalJump: 38,
    },
    combine: {
      fortyYardDash: 4.4,
      benchPress: 20,
      verticalJump: 38.0,
      broadJump: 124,
      threeConeDrill: 6.85,
      twentyYardShuttle: 4.12,
    },
    ovrRange: '70-82',
    confidence: 68,
    confidenceLabel: 'Medium',
  },
  {
    id: 'prospect-3',
    name: 'DeAndre Johnson',
    position: Position.WR,
    collegeName: 'USC',
    age: 22,
    projectedRound: 1,
    projectedPickRange: { min: 5, max: 15 },
    userTier: 'Top 10',
    flagged: true,
    positionRank: 1,
    overallRank: 3,
    skills: {
      routeRunning: mockSkill(75, 85),
      catching: mockSkill(78, 88),
      separation: mockSkill(72, 82),
      yac: mockSkill(70, 80),
    },
    physical: {
      height: 73,
      weight: 205,
      armLength: 32,
      handSize: 9.5,
      wingspan: 77,
      speed: 4.42,
      acceleration: 80,
      agility: 75,
      strength: 55,
      verticalJump: 40,
    },
    combine: {
      fortyYardDash: 4.44,
      benchPress: 14,
      verticalJump: 40.5,
      broadJump: 128,
      threeConeDrill: 6.72,
      twentyYardShuttle: 4.08,
    },
    ovrRange: '72-86',
    confidence: 75,
    confidenceLabel: 'High',
  },
  {
    id: 'prospect-4',
    name: 'Tyler Morrison',
    position: Position.CB,
    collegeName: 'LSU',
    age: 21,
    projectedRound: 1,
    projectedPickRange: { min: 8, max: 18 },
    userTier: null,
    flagged: false,
    positionRank: 1,
    overallRank: 6,
    skills: {
      manCoverage: mockSkill(72, 82),
      zoneCoverage: mockSkill(70, 80),
      ballSkills: mockSkill(75, 85),
      tackling: mockSkill(60, 70),
    },
    physical: {
      height: 72,
      weight: 195,
      armLength: 32,
      handSize: 9,
      wingspan: 76,
      speed: 4.35,
      acceleration: 82,
      agility: 80,
      strength: 55,
      verticalJump: 42,
    },
    combine: {
      fortyYardDash: 4.37,
      benchPress: 12,
      verticalJump: 42.0,
      broadJump: 132,
      threeConeDrill: 6.65,
      twentyYardShuttle: 4.05,
    },
    ovrRange: '70-80',
    confidence: 60,
    confidenceLabel: 'Medium',
  },
  {
    id: 'prospect-5',
    name: 'Brandon Mitchell',
    position: Position.DE,
    collegeName: 'Georgia',
    age: 22,
    projectedRound: 1,
    projectedPickRange: { min: 3, max: 10 },
    userTier: 'Elite',
    flagged: true,
    positionRank: 1,
    overallRank: 2,
    skills: {
      passRush: mockSkill(78, 88),
      runDefense: mockSkill(70, 80),
      technique: mockSkill(72, 82),
      motor: mockSkill(75, 85),
    },
    physical: {
      height: 76,
      weight: 270,
      armLength: 34,
      handSize: 10.5,
      wingspan: 82,
      speed: 4.65,
      acceleration: 75,
      agility: 65,
      strength: 85,
      verticalJump: 32,
    },
    combine: {
      fortyYardDash: 4.68,
      benchPress: 28,
      verticalJump: 33.0,
      broadJump: 114,
      threeConeDrill: 7.15,
      twentyYardShuttle: 4.38,
    },
    ovrRange: '78-88',
    confidence: 88,
    confidenceLabel: 'Very High',
  },
  {
    id: 'prospect-6',
    name: 'Chris Anderson',
    position: Position.LT,
    collegeName: 'Notre Dame',
    age: 23,
    projectedRound: 1,
    projectedPickRange: { min: 12, max: 22 },
    userTier: null,
    flagged: false,
    positionRank: 1,
    overallRank: 10,
    skills: {
      passBlock: mockSkill(72, 82),
      runBlock: mockSkill(70, 80),
      footwork: mockSkill(68, 78),
      anchor: mockSkill(75, 85),
    },
    physical: {
      height: 78,
      weight: 315,
      armLength: 35,
      handSize: 10,
      wingspan: 84,
      speed: 5.15,
      acceleration: 55,
      agility: 50,
      strength: 90,
      verticalJump: 26,
    },
    combine: {
      fortyYardDash: 5.18,
      benchPress: 30,
      verticalJump: 26.5,
      broadJump: 100,
      threeConeDrill: 7.82,
      twentyYardShuttle: 4.72,
    },
    ovrRange: '68-80',
    confidence: 55,
    confidenceLabel: 'Medium',
  },
];

/**
 * Mock player profile data
 */
export const mockPlayerProfile: Omit<
  PlayerProfileScreenProps,
  'onBack' | 'onToggleFlag' | 'onUpdateNotes' | 'onUpdateTier'
> = {
  playerId: 'player-demo-1',
  firstName: 'Marcus',
  lastName: 'Williams',
  position: Position.QB,
  age: 22,
  experience: 0,
  skills: {
    armStrength: mockSkill(75, 85),
    accuracy: mockSkill(70, 80),
    decisionMaking: mockSkill(65, 75),
    pocketPresence: mockSkill(68, 78),
    scrambling: mockSkill(60, 70),
    leadership: mockSkill(72, 82),
  },
  physical: {
    height: 75,
    weight: 220,
    armLength: 33,
    handSize: 10,
    wingspan: 78,
    speed: 4.55,
    acceleration: 72,
    agility: 68,
    strength: 60,
    verticalJump: 34,
  },
  physicalsRevealed: true,
  hiddenTraits: {
    positive: ['clutch', 'filmJunkie'],
    negative: [],
    revealedToUser: ['clutch'],
  },
  collegeName: 'Ohio State',
  draftYear: 2025,
  projectedRound: 1,
  projectedPickRange: { min: 1, max: 5 },
  userTier: 'Elite',
  userNotes: 'Top QB prospect - great arm, smart player. Watch for decision making under pressure.',
  flagged: true,
};

/**
 * Create a minimal mock player for game setup
 */
function createMockPlayer(id: string, firstName: string, lastName: string, position: Position) {
  return {
    id,
    firstName,
    lastName,
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.6,
      acceleration: 70,
      agility: 70,
      strength: 70,
      verticalJump: 32,
    },
    skills: {},
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 60 },
    consistency: {
      tier: 'average' as const,
      currentStreak: 'neutral' as const,
      streakGamesRemaining: 0,
    },
    schemeFits: {
      offensive: {
        westCoast: 'neutral' as const,
        airRaid: 'neutral' as const,
        spreadOption: 'neutral' as const,
        powerRun: 'neutral' as const,
        zoneRun: 'neutral' as const,
        playAction: 'neutral' as const,
      },
      defensive: {
        fourThreeUnder: 'neutral' as const,
        threeFour: 'neutral' as const,
        coverThree: 'neutral' as const,
        coverTwo: 'neutral' as const,
        manPress: 'neutral' as const,
        blitzHeavy: 'neutral' as const,
      },
    },
    roleFit: {
      ceiling: 'solidStarter' as const,
      currentRole: 'solidStarter' as const,
      roleEffectiveness: 70,
    },
    contractId: null,
    injuryStatus: {
      severity: 'none' as const,
      type: 'none' as const,
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 70,
    collegeId: '',
    draftYear: 2022,
    draftRound: 3,
    draftPick: 85,
  };
}

/**
 * Create mock team game state
 */
function createMockTeamGameState(teamId: string, teamName: string): TeamGameState {
  // Create mock players
  const qb = createMockPlayer(`${teamId}-qb`, 'Demo', 'Quarterback', Position.QB);
  const rb1 = createMockPlayer(`${teamId}-rb1`, 'Demo', 'Runningback', Position.RB);
  const rb2 = createMockPlayer(`${teamId}-rb2`, 'Backup', 'Runningback', Position.RB);
  const wr1 = createMockPlayer(`${teamId}-wr1`, 'Demo', 'Receiver', Position.WR);
  const wr2 = createMockPlayer(`${teamId}-wr2`, 'Second', 'Receiver', Position.WR);
  const wr3 = createMockPlayer(`${teamId}-wr3`, 'Third', 'Receiver', Position.WR);
  const te1 = createMockPlayer(`${teamId}-te1`, 'Demo', 'Tightend', Position.TE);
  const te2 = createMockPlayer(`${teamId}-te2`, 'Backup', 'Tightend', Position.TE);
  const lt = createMockPlayer(`${teamId}-lt`, 'Left', 'Tackle', Position.LT);
  const lg = createMockPlayer(`${teamId}-lg`, 'Left', 'Guard', Position.LG);
  const c = createMockPlayer(`${teamId}-c`, 'Demo', 'Center', Position.C);
  const rg = createMockPlayer(`${teamId}-rg`, 'Right', 'Guard', Position.RG);
  const rt = createMockPlayer(`${teamId}-rt`, 'Right', 'Tackle', Position.RT);

  // Defense
  const de1 = createMockPlayer(`${teamId}-de1`, 'Demo', 'Edge', Position.DE);
  const de2 = createMockPlayer(`${teamId}-de2`, 'Second', 'Edge', Position.DE);
  const dt1 = createMockPlayer(`${teamId}-dt1`, 'Demo', 'Tackle', Position.DT);
  const dt2 = createMockPlayer(`${teamId}-dt2`, 'Second', 'Tackle', Position.DT);
  const olb1 = createMockPlayer(`${teamId}-olb1`, 'Demo', 'Linebacker', Position.OLB);
  const olb2 = createMockPlayer(`${teamId}-olb2`, 'Second', 'Linebacker', Position.OLB);
  const ilb1 = createMockPlayer(`${teamId}-ilb1`, 'Demo', 'Linebacker', Position.ILB);
  const ilb2 = createMockPlayer(`${teamId}-ilb2`, 'Second', 'Linebacker', Position.ILB);
  const cb1 = createMockPlayer(`${teamId}-cb1`, 'Demo', 'Corner', Position.CB);
  const cb2 = createMockPlayer(`${teamId}-cb2`, 'Second', 'Corner', Position.CB);
  const cb3 = createMockPlayer(`${teamId}-cb3`, 'Third', 'Corner', Position.CB);
  const fs = createMockPlayer(`${teamId}-fs`, 'Free', 'Safety', Position.FS);
  const ss = createMockPlayer(`${teamId}-ss`, 'Strong', 'Safety', Position.SS);

  // Special teams
  const k = createMockPlayer(`${teamId}-k`, 'Demo', 'Kicker', Position.K);
  const p = createMockPlayer(`${teamId}-p`, 'Demo', 'Punter', Position.P);

  const allPlayers = new Map();
  [
    qb,
    rb1,
    rb2,
    wr1,
    wr2,
    wr3,
    te1,
    te2,
    lt,
    lg,
    c,
    rg,
    rt,
    de1,
    de2,
    dt1,
    dt2,
    olb1,
    olb2,
    ilb1,
    ilb2,
    cb1,
    cb2,
    cb3,
    fs,
    ss,
    k,
    p,
  ].forEach((player) => {
    allPlayers.set(player.id, player);
  });

  return {
    teamId,
    teamName,
    offense: {
      qb,
      rb: [rb1, rb2],
      wr: [wr1, wr2, wr3],
      te: [te1, te2],
      ol: [lt, lg, c, rg, rt],
    },
    defense: {
      dl: [de1, de2, dt1, dt2],
      lb: [olb1, olb2, ilb1, ilb2],
      db: [cb1, cb2, cb3, fs, ss],
    },
    specialTeams: {
      k,
      p,
      returner: wr2,
    },
    allPlayers,
    coaches: {
      offensiveCoordinator: { id: 'mock-oc', playerChemistry: {} } as unknown as Coach,
      defensiveCoordinator: { id: 'mock-dc', playerChemistry: {} } as unknown as Coach,
      positionCoaches: new Map(),
    },
    offensiveScheme: 'westCoast',
    defensiveScheme: 'coverThree',
    offensiveTendencies: {
      runPassSplit: { run: 45, pass: 55 },
      playActionRate: 20,
      deepShotRate: 15,
      fourthDownAggressiveness: 'average',
      tempoPreference: 'balanced',
      situational: {
        aheadBy14Plus: { runModifier: 10, passModifier: -10 },
        behindBy14Plus: { runModifier: -15, passModifier: 15 },
        thirdAndShort: 'balanced',
        redZone: 'balanced',
        badWeather: { runModifier: 10, passModifier: -10 },
      },
    },
    defensiveTendencies: {
      baseFormation: '4-3',
      blitzRate: 30,
      manCoverageRate: 40,
      pressRate: 30,
      situational: {
        redZone: 'aggressive',
        twoMinuteDrill: 'normal',
        thirdAndLong: 'balanced',
      },
    },
    timeoutsRemaining: 3,
    fatigueLevels: new Map(),
    snapCounts: new Map(),
    weeklyVariances: new Map(),
  };
}

/**
 * Mock game setup for Gamecast demo
 */
export const mockGameSetup: GameSetupResult = {
  homeTeamState: createMockTeamGameState('home-team', 'New York Giants'),
  awayTeamState: createMockTeamGameState('away-team', 'Dallas Cowboys'),
  weather: {
    temperature: 68,
    precipitation: 'none',
    wind: 8,
    isDome: false,
  },
  stakes: 'regular',
  homeFieldAdvantage: 2.5,
};
