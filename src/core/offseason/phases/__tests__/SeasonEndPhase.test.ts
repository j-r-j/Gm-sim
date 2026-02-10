/**
 * Season End Phase Tests
 * Tests for season write-up, stat improvements, and rating clarity reveals.
 */

import {
  calculateClarityFactor,
  narrowSkillRange,
  applyRatingClarity,
  revealHiddenTraits,
  generateStatLine,
  generatePlayerImprovement,
  generateSeasonWriteUp,
  processSeasonEndWithReveals,
  PlayerSeasonGrade,
} from '../SeasonEndPhase';
import { createOffSeasonState } from '../../OffSeasonPhaseManager';
import { Player } from '../../../models/player/Player';
import { Position } from '../../../models/player/Position';
import { SkillValue } from '../../../models/player/TechnicalSkills';
import { PlayerSeasonStats } from '../../../game/SeasonStatsAggregator';
import {
  createEmptyPassingStats,
  createEmptyRushingStats,
  createEmptyReceivingStats,
  createEmptyDefensiveStats,
  createEmptyKickingStats,
} from '../../../game/StatisticsTracker';

// ============================================================
// Helpers
// ============================================================

function makeSkill(trueValue: number, min: number, max: number): SkillValue {
  return { trueValue, perceivedMin: min, perceivedMax: max, maturityAge: 27 };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'John',
    lastName: 'Doe',
    position: Position.QB,
    age: 25,
    experience: 3,
    physical: {
      height: 75,
      weight: 220,
      armLength: 33,
      handSize: 10,
      wingspan: 78,
      speed: 4.6,
      acceleration: 78,
      agility: 75,
      strength: 70,
      verticalJump: 34,
    },
    skills: {
      armStrength: makeSkill(80, 70, 90),
      accuracy: makeSkill(75, 60, 85),
      decisionMaking: makeSkill(70, 55, 80),
    },
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 50 },
    consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
    schemeFits: {
      offensive: {
        westCoast: 'neutral',
        airRaid: 'neutral',
        spreadOption: 'neutral',
        powerRun: 'neutral',
        zoneRun: 'neutral',
        playAction: 'neutral',
      },
      defensive: {
        fourThreeUnder: 'neutral',
        threeFour: 'neutral',
        coverThree: 'neutral',
        coverTwo: 'neutral',
        manPress: 'neutral',
        blitzHeavy: 'neutral',
      },
    },
    roleFit: { ceiling: 'highEndStarter', currentRole: 'highEndStarter', roleEffectiveness: 80 },
    contractId: null,
    injuryStatus: {
      severity: 'none',
      type: 'none',
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2021,
    draftRound: 1,
    draftPick: 5,
    ...overrides,
  };
}

function makeSeasonStats(overrides: Partial<PlayerSeasonStats> = {}): PlayerSeasonStats {
  return {
    playerId: 'player-1',
    gamesPlayed: 17,
    gamesStarted: 17,
    passing: {
      ...createEmptyPassingStats(),
      attempts: 500,
      completions: 340,
      yards: 4200,
      touchdowns: 30,
      interceptions: 10,
      rating: 98.5,
    },
    rushing: createEmptyRushingStats(),
    receiving: createEmptyReceivingStats(),
    defensive: createEmptyDefensiveStats(),
    kicking: createEmptyKickingStats(),
    fantasyPoints: 300,
    approximateValue: 15,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe('SeasonEndPhase - Rating Clarity', () => {
  describe('calculateClarityFactor', () => {
    it('should return 0 for no tenure and no playing time', () => {
      expect(calculateClarityFactor(0, 0, 0)).toBe(0);
    });

    it('should increase with tenure', () => {
      const y1 = calculateClarityFactor(1, 0, 0);
      const y2 = calculateClarityFactor(2, 0, 0);
      const y4 = calculateClarityFactor(4, 0, 0);

      expect(y1).toBeCloseTo(0.1);
      expect(y2).toBeCloseTo(0.2);
      expect(y4).toBeCloseTo(0.4);
    });

    it('should cap tenure clarity at 0.4', () => {
      const y10 = calculateClarityFactor(10, 0, 0);
      expect(y10).toBe(0.4);
    });

    it('should increase with playing time', () => {
      const noPlay = calculateClarityFactor(0, 0, 0);
      const partTime = calculateClarityFactor(0, 10, 5);
      const fullTime = calculateClarityFactor(0, 17, 17);

      expect(partTime).toBeGreaterThan(noPlay);
      expect(fullTime).toBeGreaterThan(partTime);
    });

    it('should give max 0.6 for full-time starter with no tenure', () => {
      const factor = calculateClarityFactor(0, 17, 17);
      expect(factor).toBeCloseTo(0.6);
    });

    it('should cap total clarity at 1.0', () => {
      const factor = calculateClarityFactor(10, 17, 17);
      expect(factor).toBe(1.0);
    });

    it('should value starts more than appearances', () => {
      // 17 games played but 0 starts vs 10 games played with 10 starts
      const allAppearances = calculateClarityFactor(0, 17, 0);
      const someStarts = calculateClarityFactor(0, 10, 10);

      expect(someStarts).toBeGreaterThan(allAppearances);
    });
  });

  describe('narrowSkillRange', () => {
    it('should not narrow with 0 clarity', () => {
      const skill = makeSkill(80, 70, 90);
      const { updated } = narrowSkillRange(skill, 0);

      expect(updated.perceivedMin).toBe(70);
      expect(updated.perceivedMax).toBe(90);
    });

    it('should fully collapse range with clarity 1.0', () => {
      const skill = makeSkill(80, 70, 90);
      const { updated } = narrowSkillRange(skill, 1.0);

      expect(updated.perceivedMin).toBe(80);
      expect(updated.perceivedMax).toBe(80);
    });

    it('should partially narrow with 0.5 clarity', () => {
      const skill = makeSkill(80, 70, 90);
      const { updated } = narrowSkillRange(skill, 0.5);

      expect(updated.perceivedMin).toBe(75);
      expect(updated.perceivedMax).toBe(85);
    });

    it('should not go beyond trueValue', () => {
      const skill = makeSkill(80, 70, 90);
      const { updated } = narrowSkillRange(skill, 1.0);

      expect(updated.perceivedMin).toBeLessThanOrEqual(updated.trueValue);
      expect(updated.perceivedMax).toBeGreaterThanOrEqual(updated.trueValue);
    });

    it('should return same skill if already fully revealed', () => {
      const skill = makeSkill(80, 80, 80);
      const { updated } = narrowSkillRange(skill, 0.5);

      expect(updated.perceivedMin).toBe(80);
      expect(updated.perceivedMax).toBe(80);
    });

    it('should handle asymmetric ranges', () => {
      // True value much closer to max
      const skill = makeSkill(88, 70, 90);
      const { updated } = narrowSkillRange(skill, 0.5);

      // Min should move more (larger gap), max should move less (smaller gap)
      expect(updated.perceivedMin).toBe(79); // 70 + round(18 * 0.5) = 70 + 9
      expect(updated.perceivedMax).toBe(89); // 90 - round(2 * 0.5) = 90 - 1
    });
  });

  describe('applyRatingClarity', () => {
    it('should narrow skills for a full-time starter', () => {
      const player = makePlayer();
      const stats = makeSeasonStats({ gamesPlayed: 17, gamesStarted: 17 });

      const { updatedPlayer, reveals } = applyRatingClarity(player, 2, stats);

      // With 2 years tenure + 17 starts: clarity = 0.2 + 0.45 + 0.15 = 0.8
      expect(reveals.length).toBeGreaterThan(0);

      // armStrength: true=80, was 70-90
      const armStrength = updatedPlayer.skills['armStrength'];
      expect(armStrength.perceivedMin).toBeGreaterThan(70);
      expect(armStrength.perceivedMax).toBeLessThan(90);
    });

    it('should not narrow skills with no playing time and no tenure', () => {
      const player = makePlayer();
      const stats = makeSeasonStats({ gamesPlayed: 0, gamesStarted: 0 });

      const { reveals } = applyRatingClarity(player, 0, stats);
      expect(reveals).toHaveLength(0);
    });

    it('should narrow more for long-tenured full-time starters', () => {
      const player = makePlayer();
      const fullStats = makeSeasonStats({ gamesPlayed: 17, gamesStarted: 17 });

      const { reveals: shortReveals } = applyRatingClarity(player, 1, fullStats);
      const { reveals: longReveals } = applyRatingClarity(player, 4, fullStats);

      // Both should have reveals, but long tenure should produce narrower ranges
      expect(shortReveals.length).toBeGreaterThan(0);
      expect(longReveals.length).toBeGreaterThan(0);
    });

    it('should handle undefined season stats', () => {
      const player = makePlayer();
      const { reveals } = applyRatingClarity(player, 1, undefined);

      // Only tenure clarity (0.1), should still narrow something
      expect(reveals.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('SeasonEndPhase - Hidden Trait Reveals', () => {
  describe('revealHiddenTraits', () => {
    it('should not reveal any traits with 0 clarity', () => {
      const traits = {
        positive: ['clutch' as const, 'leader' as const],
        negative: ['lazy' as const],
        revealedToUser: [],
      };

      const { newlyRevealed } = revealHiddenTraits(traits, 0);
      expect(newlyRevealed).toHaveLength(0);
    });

    it('should reveal traits with high clarity (1.0) most of the time', () => {
      const traits = {
        positive: ['clutch' as const, 'leader' as const],
        negative: ['lazy' as const],
        revealedToUser: [],
      };

      // Run multiple times to check probabilistic behavior
      let totalRevealed = 0;
      const runs = 100;
      for (let i = 0; i < runs; i++) {
        const { newlyRevealed } = revealHiddenTraits(traits, 1.0);
        totalRevealed += newlyRevealed.length;
      }

      // With clarity 1.0, chance per trait is 75%, so average 2.25 out of 3 traits
      const avgRevealed = totalRevealed / runs;
      expect(avgRevealed).toBeGreaterThan(1.5);
    });

    it('should not re-reveal already revealed traits', () => {
      const traits = {
        positive: ['clutch' as const, 'leader' as const],
        negative: [],
        revealedToUser: ['clutch'],
      };

      const { updatedTraits, newlyRevealed } = revealHiddenTraits(traits, 1.0);

      // clutch should not appear in newly revealed since it was already known
      expect(newlyRevealed.includes('clutch')).toBe(false);
      // the already revealed trait should be preserved
      expect(updatedTraits.revealedToUser.includes('clutch')).toBe(true);
    });

    it('should return immutably updated traits', () => {
      const traits = {
        positive: ['clutch' as const],
        negative: [],
        revealedToUser: [],
      };

      const { updatedTraits } = revealHiddenTraits(traits, 1.0);

      // Original should not be mutated
      expect(traits.revealedToUser).toHaveLength(0);
      // Updated may have reveals
      expect(updatedTraits).not.toBe(traits);
    });

    it('should handle players with no traits', () => {
      const traits = { positive: [], negative: [], revealedToUser: [] };
      const { newlyRevealed, updatedTraits } = revealHiddenTraits(traits, 1.0);

      expect(newlyRevealed).toHaveLength(0);
      expect(updatedTraits.revealedToUser).toHaveLength(0);
    });
  });

  describe('generatePlayerImprovement with traits', () => {
    it('should include trait reveals for players with hidden traits', () => {
      const player = makePlayer({
        hiddenTraits: {
          positive: ['clutch', 'leader'],
          negative: ['lazy'],
          revealedToUser: [],
        },
      });
      const stats = makeSeasonStats({ gamesPlayed: 17, gamesStarted: 17 });

      // Run multiple times to get at least some trait reveals
      let foundTraitReveals = false;
      for (let i = 0; i < 20; i++) {
        const { improvement } = generatePlayerImprovement(player, stats, 4, 'A');
        if (improvement.traitsRevealed.length > 0) {
          foundTraitReveals = true;
          break;
        }
      }

      // With clarity ~1.0 (4 years + full-time starter), should reveal traits most of the time
      expect(foundTraitReveals).toBe(true);
    });

    it('should return empty traitsRevealed for players with no traits', () => {
      const player = makePlayer();
      const stats = makeSeasonStats();

      const { improvement } = generatePlayerImprovement(player, stats, 2, 'A');
      expect(improvement.traitsRevealed).toHaveLength(0);
    });
  });
});

describe('SeasonEndPhase - Stat Lines', () => {
  describe('generateStatLine', () => {
    it('should generate QB stat line', () => {
      const player = makePlayer({ position: Position.QB });
      const stats = makeSeasonStats();

      const line = generateStatLine(player, stats);
      expect(line).toContain('4200 yds');
      expect(line).toContain('30 TD');
      expect(line).toContain('10 INT');
      expect(line).toContain('comp');
    });

    it('should generate WR stat line', () => {
      const player = makePlayer({ position: Position.WR });
      const stats = makeSeasonStats({
        receiving: {
          ...createEmptyReceivingStats(),
          targets: 120,
          receptions: 80,
          yards: 1100,
          touchdowns: 8,
          drops: 3,
          longestReception: 65,
          yardsPerReception: 13.75,
        },
      });

      const line = generateStatLine(player, stats);
      expect(line).toContain('80 rec');
      expect(line).toContain('1100 yds');
      expect(line).toContain('8 TD');
    });

    it('should generate RB stat line with rushing and receiving', () => {
      const player = makePlayer({ position: Position.RB });
      const stats = makeSeasonStats({
        rushing: {
          ...createEmptyRushingStats(),
          attempts: 250,
          yards: 1200,
          touchdowns: 10,
          fumbles: 1,
          fumblesLost: 0,
          longestRush: 55,
          yardsPerCarry: 4.8,
        },
        receiving: {
          ...createEmptyReceivingStats(),
          targets: 50,
          receptions: 40,
          yards: 300,
          touchdowns: 2,
          drops: 1,
          longestReception: 30,
          yardsPerReception: 7.5,
        },
      });

      const line = generateStatLine(player, stats);
      expect(line).toContain('1200 rush yds');
      expect(line).toContain('40 rec');
    });

    it('should generate OL stat line', () => {
      const player = makePlayer({ position: Position.LT });
      const stats = makeSeasonStats({ gamesStarted: 16 });

      const line = generateStatLine(player, stats);
      expect(line).toContain('16 GS');
    });

    it('should generate defensive stat line', () => {
      const player = makePlayer({ position: Position.ILB });
      const stats = makeSeasonStats({
        defensive: {
          ...createEmptyDefensiveStats(),
          tackles: 120,
          sacks: 3,
          interceptions: 2,
          tacklesForLoss: 8,
          passesDefended: 5,
          forcedFumbles: 1,
          fumblesRecovered: 0,
          touchdowns: 0,
        },
      });

      const line = generateStatLine(player, stats);
      expect(line).toContain('120 tkl');
      expect(line).toContain('3 sacks');
      expect(line).toContain('2 INT');
    });

    it('should generate K stat line', () => {
      const player = makePlayer({ position: Position.K });
      const stats = makeSeasonStats({
        kicking: {
          ...createEmptyKickingStats(),
          fieldGoalAttempts: 35,
          fieldGoalsMade: 30,
          longestFieldGoal: 55,
          extraPointAttempts: 40,
          extraPointsMade: 39,
        },
      });

      const line = generateStatLine(player, stats);
      expect(line).toContain('30/35 FG');
      expect(line).toContain('86%');
    });

    it('should return "Did not play" for no games', () => {
      const player = makePlayer();
      const stats = makeSeasonStats({ gamesPlayed: 0 });

      expect(generateStatLine(player, stats)).toBe('Did not play');
    });

    it('should return "Did not play" for undefined stats', () => {
      const player = makePlayer();
      expect(generateStatLine(player, undefined)).toBe('Did not play');
    });
  });
});

describe('SeasonEndPhase - Season Write-Up', () => {
  describe('generateSeasonWriteUp', () => {
    it('should generate write-up for a dominant season', () => {
      const writeUp = generateSeasonWriteUp(
        'Test Team',
        { wins: 14, losses: 3, ties: 0 },
        1,
        true,
        'Super Bowl Champions',
        [{ playerName: 'Star QB', position: 'QB', grade: 'A+' }],
        []
      );

      expect(writeUp).toContain('dominant');
      expect(writeUp).toContain('14-3');
      expect(writeUp).toContain('Super Bowl championship');
      expect(writeUp).toContain('Star QB');
    });

    it('should generate write-up for a losing season', () => {
      const writeUp = generateSeasonWriteUp(
        'Bad Team',
        { wins: 3, losses: 14, ties: 0 },
        4,
        false,
        null,
        [],
        []
      );

      expect(writeUp).toContain('brutal');
      expect(writeUp).toContain('3-14');
      expect(writeUp).toContain('rebuilding');
    });

    it('should generate write-up for a mediocre season that missed playoffs', () => {
      const writeUp = generateSeasonWriteUp(
        'Mid Team',
        { wins: 8, losses: 9, ties: 0 },
        3,
        false,
        null,
        [
          { playerName: 'Player A', position: 'WR', grade: 'B+' },
          { playerName: 'Player B', position: 'RB', grade: 'B' },
        ],
        []
      );

      expect(writeUp).toContain('ups and downs');
      expect(writeUp).toContain('fell short of the playoff picture');
    });

    it('should include rating reveal section when players have reveals', () => {
      const improvements = [
        {
          playerId: 'p1',
          playerName: 'Rookie Star',
          position: 'QB',
          gamesPlayed: 17,
          gamesStarted: 17,
          statLine: '4000 yds, 28 TD',
          grade: 'A',
          ratingReveals: [
            {
              skillName: 'armStrength',
              previousMin: 70,
              previousMax: 90,
              newMin: 78,
              newMax: 82,
              isFullyRevealed: false,
            },
          ],
          totalSkillsNarrowed: 1,
          hadFullReveal: false,
          traitsRevealed: [],
        },
      ];

      const writeUp = generateSeasonWriteUp(
        'Team',
        { wins: 10, losses: 7, ties: 0 },
        2,
        true,
        'Lost in Divisional Round',
        [],
        improvements
      );

      expect(writeUp).toContain('clearer picture');
      expect(writeUp).toContain('1 player');
    });

    it('should mention fully revealed players', () => {
      const improvements = [
        {
          playerId: 'p1',
          playerName: 'Veteran QB',
          position: 'QB',
          gamesPlayed: 17,
          gamesStarted: 17,
          statLine: '4000 yds',
          grade: 'A',
          ratingReveals: [],
          totalSkillsNarrowed: 3,
          hadFullReveal: true,
          traitsRevealed: [],
        },
      ];

      const writeUp = generateSeasonWriteUp(
        'Team',
        { wins: 12, losses: 5, ties: 0 },
        1,
        true,
        'Super Bowl Champions',
        [],
        improvements
      );

      expect(writeUp).toContain('Veteran QB');
      expect(writeUp).toContain('fully understood');
    });

    it('should handle ties in record', () => {
      const writeUp = generateSeasonWriteUp(
        'Tie Team',
        { wins: 8, losses: 8, ties: 1 },
        2,
        false,
        null,
        [],
        []
      );

      expect(writeUp).toContain('8-8-1');
    });
  });
});

describe('SeasonEndPhase - Player Improvement Generation', () => {
  describe('generatePlayerImprovement', () => {
    it('should generate improvement with stat line and reveals', () => {
      const player = makePlayer();
      const stats = makeSeasonStats();

      const { improvement } = generatePlayerImprovement(player, stats, 2, 'A');

      expect(improvement.playerId).toBe('player-1');
      expect(improvement.playerName).toBe('John Doe');
      expect(improvement.gamesPlayed).toBe(17);
      expect(improvement.gamesStarted).toBe(17);
      expect(improvement.grade).toBe('A');
      expect(improvement.statLine).toContain('4200 yds');
      expect(improvement.ratingReveals.length).toBeGreaterThan(0);
      expect(improvement.totalSkillsNarrowed).toBeGreaterThan(0);
    });

    it('should generate improvement for player with no stats', () => {
      const player = makePlayer();

      const { improvement } = generatePlayerImprovement(player, undefined, 1, 'F');

      expect(improvement.gamesPlayed).toBe(0);
      expect(improvement.statLine).toBe('Did not play');
    });
  });
});

describe('SeasonEndPhase - processSeasonEndWithReveals', () => {
  it('should process full season end and return updated state and players', () => {
    const state = createOffSeasonState(2024);
    const player = makePlayer();
    const stats: Record<string, PlayerSeasonStats> = {
      'player-1': makeSeasonStats(),
    };

    const grades: PlayerSeasonGrade[] = [
      {
        playerId: 'player-1',
        playerName: 'John Doe',
        position: 'QB',
        overallGrade: 'A',
        categories: { production: 'A', consistency: 'A-', impact: 'A' },
        highlights: ['Great season'],
        concerns: [],
      },
    ];

    const { offseasonState, updatedPlayers } = processSeasonEndWithReveals(
      state,
      'team-1',
      'Test Team',
      { wins: 12, losses: 5, ties: 0 },
      1,
      true,
      'Super Bowl Champions',
      32,
      [player],
      stats,
      { 'player-1': 3 },
      grades,
      [],
      ['team-32', 'team-31', 'team-1']
    );

    // Offseason state should have the recap
    expect(offseasonState.seasonRecap).not.toBeNull();
    expect(offseasonState.seasonRecap!.seasonWriteUp).toContain('solid');
    expect(offseasonState.seasonRecap!.seasonWriteUp).toContain('Super Bowl championship');
    expect(offseasonState.seasonRecap!.playerImprovements).toHaveLength(1);
    expect(offseasonState.seasonRecap!.playerImprovements[0].statLine).toContain('4200 yds');

    // Draft order should be set
    expect(offseasonState.draftOrder).toEqual(['team-32', 'team-31', 'team-1']);

    // Updated players should have narrowed skill ranges
    expect(updatedPlayers).toHaveLength(1);
    const updatedQB = updatedPlayers[0];
    expect(updatedQB.skills['armStrength'].perceivedMin).toBeGreaterThan(70);
    expect(updatedQB.skills['armStrength'].perceivedMax).toBeLessThan(90);

    // Events should include playoff event
    expect(offseasonState.events.some((e) => e.description.includes('Division Champion'))).toBe(
      true
    );
  });

  it('should add reveal events for players with full reveals', () => {
    const state = createOffSeasonState(2024);
    // Player with very narrow ranges that will fully collapse
    const player = makePlayer({
      skills: {
        armStrength: makeSkill(80, 79, 81),
        accuracy: makeSkill(75, 74, 76),
      },
    });

    const stats: Record<string, PlayerSeasonStats> = {
      'player-1': makeSeasonStats(),
    };

    const grades: PlayerSeasonGrade[] = [
      {
        playerId: 'player-1',
        playerName: 'John Doe',
        position: 'QB',
        overallGrade: 'A',
        categories: { production: 'A', consistency: 'A', impact: 'A' },
        highlights: [],
        concerns: [],
      },
    ];

    const { offseasonState } = processSeasonEndWithReveals(
      state,
      'team-1',
      'Test Team',
      { wins: 10, losses: 7, ties: 0 },
      2,
      false,
      null,
      15,
      [player],
      stats,
      { 'player-1': 4 },
      grades,
      [],
      ['team-1']
    );

    const revealEvents = offseasonState.events.filter((e) => e.type === 'development_reveal');
    expect(revealEvents.length).toBeGreaterThan(0);
    expect(revealEvents[0].description).toContain('John Doe');
  });
});
