/**
 * Tests for DraftDayNarrator
 */

import { Position } from '../../models/player/Position';
import {
  classifyPickValue,
  scoreToGrade,
  generatePickAnnouncement,
  generateStealReachAlert,
  generateUserTargetTaken,
  generateClockWarning,
  generateRoundSummary,
  generateTradeRumor,
  detectPositionRun,
  gradePickValue,
  generateTeamDraftGrade,
  validateWarRoomFeedEvent,
  type PickValueAlert,
} from '../DraftDayNarrator';
import { DraftPickResult } from '../DraftRoomSimulator';
import { Prospect } from '../Prospect';
import { Player } from '../../models/player/Player';
import { DraftPick } from '../../models/league/DraftPick';

// Helper to create a minimal mock prospect
function createMockProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: 'prospect-1',
    player: {
      id: 'player-1',
      firstName: 'John',
      lastName: 'Smith',
      position: Position.QB,
      roleFit: {
        ceiling: 'highEndStarter',
        currentRole: 'depth',
        roleEffectiveness: 50,
      },
    } as Player,
    collegeName: 'State University',
    consensusProjection: {
      projectedRound: 1,
      projectedPickRange: { min: 5, max: 15 },
      confidence: 70,
      source: 'consensus',
    },
    ...overrides,
  } as Prospect;
}

// Helper to create a mock DraftPick
function createMockDraftPick(overrides: Partial<DraftPick> = {}): DraftPick {
  return {
    id: 'pick-1',
    year: 2025,
    round: 1,
    originalTeamId: 'team-1',
    currentTeamId: 'team-1',
    overallPick: 10,
    selectedPlayerId: null,
    tradeHistory: [],
    ...overrides,
  };
}

// Helper to create a mock pick result
function createMockPickResult(overrides: Partial<DraftPickResult> = {}): DraftPickResult {
  return {
    pick: createMockDraftPick(),
    prospect: createMockProspect(),
    teamId: 'team-1',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('classifyPickValue', () => {
  it('should classify a major steal (diff >= 40)', () => {
    const result = classifyPickValue(200, 2, { min: 180, max: 250 });
    expect(result.type).toBe('steal');
    expect(result.magnitude).toBe('minor');
  });

  it('should classify a major steal when projected much later', () => {
    const result = classifyPickValue(10, 3, { min: 60, max: 80 });
    expect(result.type).toBe('steal');
    expect(result.magnitude).toBe('major');
  });

  it('should classify a moderate steal', () => {
    const result = classifyPickValue(10, 1, { min: 25, max: 45 });
    expect(result.type).toBe('steal');
    expect(result.magnitude).toBe('moderate');
  });

  it('should classify a major reach', () => {
    // Taken at pick 80 but projected at pick 10-20 (mid=15) -> reach of 65
    const result = classifyPickValue(80, 1, { min: 10, max: 20 });
    expect(result.type).toBe('reach');
    expect(result.magnitude).toBe('major');
  });

  it('should classify a moderate reach', () => {
    // Picked at 50 but projected at pick 10-20 (mid=15) -> reach of 35
    const result = classifyPickValue(50, 1, { min: 10, max: 20 });
    expect(result.type).toBe('reach');
    expect(result.magnitude).toBe('moderate');
  });

  it('should classify fair value', () => {
    const result = classifyPickValue(10, 1, { min: 8, max: 15 });
    expect(result.type).toBe('fair');
  });

  it('should handle null projections', () => {
    const result = classifyPickValue(10, null, null);
    expect(result.type).toBe('fair');
    expect(result.message).toBe('Unknown projection');
  });
});

describe('scoreToGrade', () => {
  it('should return A+ for scores >= 95', () => {
    expect(scoreToGrade(95)).toBe('A+');
    expect(scoreToGrade(100)).toBe('A+');
  });

  it('should return A for scores 90-94', () => {
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(94)).toBe('A');
  });

  it('should return C for scores 60-64', () => {
    expect(scoreToGrade(60)).toBe('C');
    expect(scoreToGrade(64)).toBe('C');
  });

  it('should return F for scores below 45', () => {
    expect(scoreToGrade(44)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });
});

describe('generatePickAnnouncement', () => {
  it('should generate user pick announcement with "YOUR PICK"', () => {
    const pickResult = createMockPickResult();
    const event = generatePickAnnouncement(pickResult, 'Eagles', true);

    expect(event.type).toBe('pick_announcement');
    expect(event.headline).toContain('YOUR PICK');
    expect(event.headline).toContain('John Smith');
    expect(event.urgency).toBe('high');
  });

  it('should generate AI pick announcement', () => {
    const pickResult = createMockPickResult();
    const event = generatePickAnnouncement(pickResult, 'Cowboys', false);

    expect(event.type).toBe('pick_announcement');
    expect(event.headline).toContain('Cowboys');
    expect(event.headline).toContain('John Smith');
    expect(event.urgency).toBe('low');
  });
});

describe('generateStealReachAlert', () => {
  it('should return null for fair value picks', () => {
    const pickResult = createMockPickResult();
    const alert: PickValueAlert = {
      type: 'fair',
      magnitude: 'minor',
      message: 'Fair',
      picksBeyondProjection: 0,
    };
    const event = generateStealReachAlert(pickResult, alert, 'Eagles');
    expect(event).toBeNull();
  });

  it('should generate steal alert', () => {
    const pickResult = createMockPickResult();
    const alert: PickValueAlert = {
      type: 'steal',
      magnitude: 'major',
      message: 'Massive steal',
      picksBeyondProjection: 45,
    };
    const event = generateStealReachAlert(pickResult, alert, 'Eagles');

    expect(event).not.toBeNull();
    expect(event!.type).toBe('steal_alert');
    expect(event!.headline).toContain('STEAL ALERT');
    expect(event!.urgency).toBe('high');
  });

  it('should generate reach alert', () => {
    const pickResult = createMockPickResult();
    const alert: PickValueAlert = {
      type: 'reach',
      magnitude: 'moderate',
      message: 'Reach',
      picksBeyondProjection: 25,
    };
    const event = generateStealReachAlert(pickResult, alert, 'Cowboys');

    expect(event).not.toBeNull();
    expect(event!.type).toBe('reach_alert');
    expect(event!.headline).toContain('REACH ALERT');
    expect(event!.urgency).toBe('medium');
  });
});

describe('generateUserTargetTaken', () => {
  it('should generate critical alert when user target is taken', () => {
    const pickResult = createMockPickResult({ teamId: 'other-team' });
    const event = generateUserTargetTaken(pickResult, 'Cowboys', 3, 'elite');

    expect(event.type).toBe('user_target_taken');
    expect(event.urgency).toBe('critical');
    expect(event.headline).toContain('YOUR TARGET TAKEN');
    expect(event.detail).toContain('#3 on your board');
    expect(event.detail).toContain('"elite"');
  });
});

describe('generateClockWarning', () => {
  it('should generate critical warning at 30 seconds', () => {
    const event = generateClockWarning(30, 5);
    expect(event.urgency).toBe('critical');
    expect(event.headline).toContain('30 seconds');
  });

  it('should generate high warning at 60 seconds', () => {
    const event = generateClockWarning(60, 5);
    expect(event.urgency).toBe('high');
    expect(event.headline).toContain('1 minute');
  });

  it('should generate medium warning at 120 seconds', () => {
    const event = generateClockWarning(120, 5);
    expect(event.urgency).toBe('medium');
    expect(event.headline).toContain('2 minutes');
  });
});

describe('generateRoundSummary', () => {
  it('should summarize round with user picks', () => {
    const picks = [
      createMockPickResult({ teamId: 'user-team' }),
      createMockPickResult({ teamId: 'other-team' }),
    ];
    const event = generateRoundSummary(1, picks, 'user-team');

    expect(event.type).toBe('round_summary');
    expect(event.headline).toContain('ROUND 1 COMPLETE');
    expect(event.detail).toContain('2 picks made');
    expect(event.detail).toContain('Your picks');
  });
});

describe('generateTradeRumor', () => {
  it('should generate a trade rumor', () => {
    const event = generateTradeRumor('Eagles', Position.QB, 5);

    expect(event.type).toBe('trade_rumor');
    expect(event.urgency).toBe('low');
    expect(event.headline).toBe('TRADE RUMOR');
    expect(event.detail.length).toBeGreaterThan(0);
  });
});

describe('detectPositionRun', () => {
  it('should detect 3 consecutive picks at same position group', () => {
    const picks = [
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.QB } as Player }),
      }),
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.QB } as Player }),
      }),
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.QB } as Player }),
      }),
    ];

    const run = detectPositionRun(picks);
    expect(run).not.toBeNull();
    expect(run!.consecutivePicks).toBe(3);
  });

  it('should return null for mixed positions', () => {
    const picks = [
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.QB } as Player }),
      }),
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.WR } as Player }),
      }),
      createMockPickResult({
        prospect: createMockProspect({ player: { position: Position.RB } as Player }),
      }),
    ];

    const run = detectPositionRun(picks);
    expect(run).toBeNull();
  });

  it('should return null for fewer than 3 picks', () => {
    const picks = [createMockPickResult(), createMockPickResult()];
    expect(detectPositionRun(picks)).toBeNull();
  });
});

describe('gradePickValue', () => {
  it('should give good grades for steals', () => {
    const prospect = createMockProspect();
    const grade = gradePickValue(30, 1, prospect, 3, { min: 60, max: 80 });

    expect(grade.valueScore).toBeGreaterThan(75);
    expect(grade.grade.startsWith('A') || grade.grade.startsWith('B')).toBe(true);
  });

  it('should give poor grades for reaches', () => {
    // Taken at pick 100 but projected at pick 10-20 (mid=15) -> major reach
    const prospect = createMockProspect();
    const grade = gradePickValue(100, 4, prospect, 1, { min: 10, max: 20 });

    expect(grade.valueScore).toBeLessThan(60);
  });

  it('should give average grades for fair value', () => {
    const prospect = createMockProspect();
    const grade = gradePickValue(10, 1, prospect, 1, { min: 8, max: 15 });

    expect(grade.valueScore).toBeGreaterThanOrEqual(60);
    expect(grade.valueScore).toBeLessThanOrEqual(90);
  });
});

describe('generateTeamDraftGrade', () => {
  it('should generate a grade with all components', () => {
    const picks = [
      createMockPickResult({
        pick: createMockDraftPick({ round: 1, overallPick: 10 }),
      }),
      createMockPickResult({
        pick: createMockDraftPick({ round: 2, overallPick: 42 }),
      }),
    ];

    const projections = new Map<
      string,
      { consensusRound: number | null; pickRange: { min: number; max: number } | null }
    >();
    projections.set('prospect-1', { consensusRound: 1, pickRange: { min: 8, max: 15 } });

    const grade = generateTeamDraftGrade('team-1', picks, projections);

    expect(grade.teamId).toBe('team-1');
    expect(grade.grade).toBeDefined();
    expect(grade.score).toBeGreaterThanOrEqual(0);
    expect(grade.score).toBeLessThanOrEqual(100);
    expect(grade.picks.length).toBe(2);
    expect(grade.summary.length).toBeGreaterThan(0);
    expect(grade.bestPick).not.toBeNull();
    expect(grade.worstPick).not.toBeNull();
  });

  it('should handle empty picks', () => {
    const grade = generateTeamDraftGrade('team-1', [], new Map());
    expect(grade.grade).toBe('C');
    expect(grade.score).toBe(60);
    expect(grade.picks.length).toBe(0);
  });
});

describe('validateWarRoomFeedEvent', () => {
  it('should validate a good event', () => {
    const event = generateClockWarning(30, 1);
    expect(validateWarRoomFeedEvent(event)).toBe(true);
  });

  it('should reject events with missing fields', () => {
    expect(
      validateWarRoomFeedEvent({
        id: '',
        headline: 'test',
        detail: 'test',
        timestamp: Date.now(),
      } as any)
    ).toBe(false);
  });
});
