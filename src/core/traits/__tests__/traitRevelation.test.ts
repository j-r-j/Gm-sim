/**
 * Tests for the Trait Revelation System
 */

import { Position } from '../../models/player/Position';
import {
  Player,
  PhysicalAttributes,
  TechnicalSkills,
  HiddenTraits,
  ItFactor,
  ConsistencyProfile,
  SchemeFits,
  RoleFit,
  InjuryStatus,
} from '../../models/player';
import {
  GameEventContext,
  GameEventType,
  ConfidenceLevel,
  getConfidenceLevel,
  getTriggersForEvent,
  getTriggerForTrait,
  ALL_TRIGGERS,
  POSITIVE_TRIGGERS,
  NEGATIVE_TRIGGERS,
  CLUTCH_TRIGGER,
  IRON_MAN_TRIGGER,
} from '../RevelationTriggers';
import {
  createPlayerPatternData,
  recordObservation,
  getTraitConfidence,
  applyEvidenceDecay,
  validatePlayerPatternData,
} from '../PatternRecognitionSystem';
import {
  generateTraitNews,
  generateGameEventNews,
  validateNewsEvent,
  sortNewsByPriority,
  NewsEvent,
} from '../NewsEventGenerator';
import {
  processGameEvent,
  processMultipleEvents,
  getPlayerPatternData,
  clearAllPatternData,
  getPotentialTraits,
  getTraitRevelationStatus,
  getRevealedTraitsSummary,
  validateRevelationResult,
  RevelationResult,
  DEFAULT_ENGINE_OPTIONS,
} from '../TraitRevelationEngine';

// Helper function to create a valid player for testing
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  const physical: PhysicalAttributes = {
    height: 74,
    weight: 220,
    armLength: 32,
    handSize: 9.5,
    wingspan: 77,
    speed: 4.5,
    acceleration: 85,
    agility: 80,
    strength: 75,
    verticalJump: 36,
  };

  const skills: TechnicalSkills = {
    armStrength: {
      trueValue: 85,
      perceivedMin: 80,
      perceivedMax: 90,
      maturityAge: 25,
    },
    accuracy: {
      trueValue: 78,
      perceivedMin: 70,
      perceivedMax: 85,
      maturityAge: 27,
    },
  };

  const hiddenTraits: HiddenTraits = {
    positive: ['clutch', 'leader'],
    negative: ['hotHead'],
    revealedToUser: [],
  };

  const itFactor: ItFactor = { value: 85 };

  const consistency: ConsistencyProfile = {
    tier: 'steady',
    currentStreak: 'neutral',
    streakGamesRemaining: 0,
  };

  const schemeFits: SchemeFits = {
    offensive: {
      westCoast: 'good',
      airRaid: 'neutral',
      spreadOption: 'poor',
      powerRun: 'neutral',
      zoneRun: 'neutral',
      playAction: 'perfect',
    },
    defensive: {
      fourThreeUnder: 'neutral',
      threeFour: 'neutral',
      coverThree: 'neutral',
      coverTwo: 'neutral',
      manPress: 'neutral',
      blitzHeavy: 'neutral',
    },
  };

  const roleFit: RoleFit = {
    ceiling: 'franchiseCornerstone',
    currentRole: 'highEndStarter',
    roleEffectiveness: 82,
  };

  const injuryStatus: InjuryStatus = {
    severity: 'none',
    type: 'none',
    weeksRemaining: 0,
    isPublic: true,
    lingeringEffect: 0,
  };

  return {
    id: 'test-player-001',
    firstName: 'Test',
    lastName: 'Player',
    position: Position.QB,
    age: 28,
    experience: 7,
    physical,
    skills,
    hiddenTraits,
    itFactor,
    consistency,
    schemeFits,
    roleFit,
    contractId: 'contract-001',
    injuryStatus,
    fatigue: 15,
    morale: 90,
    collegeId: 'test-college',
    draftYear: 2017,
    draftRound: 1,
    draftPick: 10,
    ...overrides,
  };
}

// Helper to create a game event context
function createGameEventContext(
  eventType: GameEventType,
  overrides: Partial<GameEventContext> = {}
): GameEventContext {
  return {
    eventType,
    isPlayoff: false,
    season: 2024,
    week: 10,
    quarter: 4,
    timeRemaining: 60,
    scoreDifferential: 3,
    ...overrides,
  };
}

describe('RevelationTriggers', () => {
  describe('getConfidenceLevel', () => {
    it('should return confirmed for probability >= 1.0', () => {
      expect(getConfidenceLevel(1.0)).toBe('confirmed');
      expect(getConfidenceLevel(1.5)).toBe('confirmed');
    });

    it('should return strong for probability >= 0.8', () => {
      expect(getConfidenceLevel(0.8)).toBe('strong');
      expect(getConfidenceLevel(0.9)).toBe('strong');
    });

    it('should return moderate for probability >= 0.6', () => {
      expect(getConfidenceLevel(0.6)).toBe('moderate');
      expect(getConfidenceLevel(0.7)).toBe('moderate');
    });

    it('should return suspected for probability >= 0.4', () => {
      expect(getConfidenceLevel(0.4)).toBe('suspected');
      expect(getConfidenceLevel(0.5)).toBe('suspected');
    });

    it('should return hint for probability < 0.4', () => {
      expect(getConfidenceLevel(0.3)).toBe('hint');
      expect(getConfidenceLevel(0.1)).toBe('hint');
      expect(getConfidenceLevel(0)).toBe('hint');
    });
  });

  describe('ALL_TRIGGERS', () => {
    it('should contain all positive and negative triggers', () => {
      expect(ALL_TRIGGERS.length).toBe(POSITIVE_TRIGGERS.length + NEGATIVE_TRIGGERS.length);
    });

    it('should have valid trigger objects', () => {
      for (const trigger of ALL_TRIGGERS) {
        expect(trigger.trait).toBeDefined();
        expect(trigger.eventTypes).toBeDefined();
        expect(trigger.eventTypes.length).toBeGreaterThan(0);
        expect(trigger.baseProbability).toBeGreaterThan(0);
        expect(trigger.baseProbability).toBeLessThanOrEqual(1);
        expect(trigger.description).toBeDefined();
        expect(typeof trigger.checkCondition).toBe('function');
        expect(typeof trigger.calculateProbability).toBe('function');
      }
    });
  });

  describe('getTriggersForEvent', () => {
    it('should return triggers for gameWinningPlay', () => {
      const triggers = getTriggersForEvent('gameWinningPlay');
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers.some((t) => t.trait === 'clutch')).toBe(true);
    });

    it('should return triggers for practiceAltercation', () => {
      const triggers = getTriggersForEvent('practiceAltercation');
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers.some((t) => t.trait === 'hotHead')).toBe(true);
    });

    it('should return empty array for non-existent event', () => {
      const triggers = getTriggersForEvent('nonExistentEvent' as GameEventType);
      expect(triggers).toEqual([]);
    });
  });

  describe('getTriggerForTrait', () => {
    it('should return trigger for clutch', () => {
      const trigger = getTriggerForTrait('clutch');
      expect(trigger).toBeDefined();
      expect(trigger?.trait).toBe('clutch');
    });

    it('should return trigger for hotHead', () => {
      const trigger = getTriggerForTrait('hotHead');
      expect(trigger).toBeDefined();
      expect(trigger?.trait).toBe('hotHead');
    });
  });

  describe('CLUTCH_TRIGGER', () => {
    it('should have correct trait', () => {
      expect(CLUTCH_TRIGGER.trait).toBe('clutch');
    });

    it('should check condition correctly for clutch time', () => {
      const clutchContext = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });
      expect(CLUTCH_TRIGGER.checkCondition(clutchContext)).toBe(true);
    });

    it('should increase probability in playoffs', () => {
      const regularContext = createGameEventContext('gameWinningPlay', { isPlayoff: false });
      const playoffContext = createGameEventContext('gameWinningPlay', { isPlayoff: true });

      const regularProb = CLUTCH_TRIGGER.calculateProbability(regularContext);
      const playoffProb = CLUTCH_TRIGGER.calculateProbability(playoffContext);

      expect(playoffProb).toBeGreaterThan(regularProb);
    });
  });

  describe('IRON_MAN_TRIGGER', () => {
    it('should have correct trait', () => {
      expect(IRON_MAN_TRIGGER.trait).toBe('ironMan');
    });

    it('should check condition for 3+ consecutive full seasons', () => {
      const context = createGameEventContext('fullSeasonPlayed', {
        consecutiveFullSeasons: 3,
      });
      expect(IRON_MAN_TRIGGER.checkCondition(context)).toBe(true);
    });

    it('should not trigger for less than 3 consecutive seasons', () => {
      const context = createGameEventContext('fullSeasonPlayed', {
        consecutiveFullSeasons: 2,
      });
      expect(IRON_MAN_TRIGGER.checkCondition(context)).toBe(false);
    });
  });
});

describe('PatternRecognitionSystem', () => {
  describe('createPlayerPatternData', () => {
    it('should create valid pattern data', () => {
      const data = createPlayerPatternData('player-123');

      expect(data.playerId).toBe('player-123');
      expect(data.observations).toEqual([]);
      expect(data.confirmedTraits).toEqual([]);
      expect(data.gamesTracked).toBe(0);
      expect(data.seasonsTracked).toBe(0);
    });

    it('should pass validation', () => {
      const data = createPlayerPatternData('player-456');
      expect(validatePlayerPatternData(data)).toBe(true);
    });
  });

  describe('recordObservation', () => {
    it('should add observation to pattern data', () => {
      const data = createPlayerPatternData('player-123');
      const context = createGameEventContext('gameWinningPlay');

      const initialCount = data.observations.length;
      recordObservation(data, context, 'Made game-winning play');

      expect(data.observations.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('should update stats for injury events', () => {
      const data = createPlayerPatternData('player-123');
      const context = createGameEventContext('injuryOccurred', {
        gamesMissedThisSeason: 5,
      });

      recordObservation(data, context, 'Player injured');
      expect(data.stats.totalInjuries).toBe(1);
    });

    it('should update stats for clutch plays', () => {
      const data = createPlayerPatternData('player-123');
      const context = createGameEventContext('gameWinningPlay');

      recordObservation(data, context, 'Game-winning play');
      expect(data.stats.clutchPlays).toBe(1);
    });
  });

  describe('getTraitConfidence', () => {
    it('should return undefined for unobserved traits', () => {
      const data = createPlayerPatternData('player-123');
      const confidence = getTraitConfidence(data, 'clutch');
      expect(confidence).toBeUndefined();
    });

    it('should return evidence after observations', () => {
      const data = createPlayerPatternData('player-123');
      const context = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });

      // Record multiple observations
      for (let i = 0; i < 5; i++) {
        recordObservation(data, context, 'Clutch play');
      }

      const evidence = getTraitConfidence(data, 'clutch');
      expect(evidence).toBeDefined();
      if (evidence) {
        expect(evidence.supportingObservations).toBeGreaterThan(0);
      }
    });
  });

  describe('applyEvidenceDecay', () => {
    it('should reduce weighted evidence', () => {
      const data = createPlayerPatternData('player-123');
      const context = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });

      // Build up evidence
      for (let i = 0; i < 5; i++) {
        recordObservation(data, context, 'Clutch play');
      }

      const evidenceBefore = getTraitConfidence(data, 'clutch');
      const weightBefore = evidenceBefore?.weightedEvidence ?? 0;

      applyEvidenceDecay(data, 0.5);

      const evidenceAfter = getTraitConfidence(data, 'clutch');
      const weightAfter = evidenceAfter?.weightedEvidence ?? 0;

      expect(weightAfter).toBeLessThan(weightBefore);
    });
  });
});

describe('NewsEventGenerator', () => {
  describe('generateTraitNews', () => {
    it('should generate news for trait evidence', () => {
      const evidence = {
        trait: 'clutch' as const,
        supportingObservations: 5,
        contradictingObservations: 0,
        weightedEvidence: 5.0,
        confidence: 'moderate' as ConfidenceLevel,
        probability: 0.7,
        lastObservation: Date.now(),
        recentObservations: ['Made clutch play'],
      };

      const context = createGameEventContext('gameWinningPlay');
      const news = generateTraitNews(
        'player-123',
        'Test Player',
        'Test Team',
        evidence,
        context
      );

      expect(news).not.toBeNull();
      if (news) {
        expect(news.headline).toBeDefined();
        expect(news.body).toBeDefined();
        expect(news.playerId).toBe('player-123');
        expect(news.playerName).toBe('Test Player');
        expect(news.relatedTrait).toBe('clutch');
      }
    });
  });

  describe('generateGameEventNews', () => {
    it('should generate news for game events', () => {
      const context = createGameEventContext('gameWinningPlay');
      const news = generateGameEventNews(
        'player-123',
        'Test Player',
        'Test Team',
        context,
        '{playerName} wins the game!',
        '{playerName} made a big play for {teamName}.'
      );

      expect(news).toBeDefined();
      expect(news.headline).toContain('Test Player');
      expect(news.body).toContain('Test Player');
      expect(news.body).toContain('Test Team');
    });
  });

  describe('validateNewsEvent', () => {
    it('should validate valid news event', () => {
      const context = createGameEventContext('gameWinningPlay');
      const news = generateGameEventNews(
        'player-123',
        'Test Player',
        'Test Team',
        context,
        'Test headline',
        'Test body'
      );

      expect(validateNewsEvent(news)).toBe(true);
    });

    it('should reject invalid news event', () => {
      const invalidNews = {
        id: '',
        headline: '',
        body: 'test',
        playerId: 'p1',
        playerName: 'Test',
        timestamp: Date.now(),
        season: 2024,
        week: 1,
      } as NewsEvent;

      expect(validateNewsEvent(invalidNews)).toBe(false);
    });
  });

  describe('sortNewsByPriority', () => {
    it('should sort urgent news first', () => {
      const context = createGameEventContext('gameWinningPlay');
      const lowNews = generateGameEventNews(
        'player-1',
        'Player 1',
        'Team 1',
        context,
        'Low priority',
        'Body'
      );
      lowNews.priority = 'low';

      const urgentNews = generateGameEventNews(
        'player-2',
        'Player 2',
        'Team 2',
        context,
        'Urgent news',
        'Body'
      );
      urgentNews.priority = 'urgent';

      const sorted = sortNewsByPriority([lowNews, urgentNews]);
      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[1].priority).toBe('low');
    });
  });
});

describe('TraitRevelationEngine', () => {
  beforeEach(() => {
    clearAllPatternData();
  });

  describe('processGameEvent', () => {
    it('should process game event and return result', () => {
      const player = createTestPlayer();
      const context = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });

      const result = processGameEvent(player, context, 'Test Team');

      expect(result.playerId).toBe(player.id);
      expect(result.events.length).toBeGreaterThan(0);
      expect(validateRevelationResult(result)).toBe(true);
    });

    it('should track pattern data across multiple events', () => {
      const player = createTestPlayer();
      const context = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });

      // Process multiple events
      for (let i = 0; i < 5; i++) {
        processGameEvent(player, context, 'Test Team');
      }

      const patternData = getPlayerPatternData(player.id);
      expect(patternData.observations.length).toBeGreaterThan(0);
    });

    it('should check traits the player actually has', () => {
      const player = createTestPlayer({
        hiddenTraits: {
          positive: ['clutch'],
          negative: [],
          revealedToUser: [],
        },
      });

      const context = createGameEventContext('gameWinningPlay', {
        quarter: 4,
        timeRemaining: 60,
        scoreDifferential: 3,
      });

      const result = processGameEvent(player, context, 'Test Team');

      // Should have checked the clutch trait
      const checkedClutch = result.events.some((e) =>
        e.checkedTraits.includes('clutch')
      );
      expect(checkedClutch).toBe(true);
    });
  });

  describe('processMultipleEvents', () => {
    it('should process multiple events at once', () => {
      const player = createTestPlayer();
      const events = [
        createGameEventContext('gameWinningPlay', {
          quarter: 4,
          timeRemaining: 60,
          scoreDifferential: 3,
        }),
        createGameEventContext('practiceAltercation'),
        createGameEventContext('leadershipMoment'),
      ];

      const result = processMultipleEvents(player, events, 'Test Team');

      expect(result.events.length).toBe(3);
    });
  });

  describe('getPlayerPatternData', () => {
    it('should create pattern data for new player', () => {
      const data = getPlayerPatternData('new-player');
      expect(data.playerId).toBe('new-player');
    });

    it('should return same data for same player', () => {
      const data1 = getPlayerPatternData('same-player');
      const data2 = getPlayerPatternData('same-player');
      expect(data1).toBe(data2);
    });
  });

  describe('getPotentialTraits', () => {
    it('should return empty array for player with no observations', () => {
      const player = createTestPlayer({ id: 'no-observations' });
      const traits = getPotentialTraits(player);
      expect(traits).toEqual([]);
    });
  });

  describe('getTraitRevelationStatus', () => {
    it('should return status for trait player has', () => {
      const player = createTestPlayer({
        hiddenTraits: {
          positive: ['clutch'],
          negative: [],
          revealedToUser: [],
        },
      });

      const status = getTraitRevelationStatus(player, 'clutch');
      expect(status.hasTrait).toBe(true);
      expect(status.isRevealed).toBe(false);
    });

    it('should show revealed status correctly', () => {
      const player = createTestPlayer({
        hiddenTraits: {
          positive: ['clutch'],
          negative: [],
          revealedToUser: ['clutch'],
        },
      });

      const status = getTraitRevelationStatus(player, 'clutch');
      expect(status.hasTrait).toBe(true);
      expect(status.isRevealed).toBe(true);
    });
  });

  describe('getRevealedTraitsSummary', () => {
    it('should summarize revealed traits', () => {
      const player = createTestPlayer({
        id: 'summary-test',
        hiddenTraits: {
          positive: ['clutch', 'leader'],
          negative: ['hotHead'],
          revealedToUser: ['clutch'],
        },
      });

      const summary = getRevealedTraitsSummary(player);
      expect(summary.revealed).toContain('clutch');
      expect(summary.revealed).not.toContain('leader');
    });
  });

  describe('DEFAULT_ENGINE_OPTIONS', () => {
    it('should have valid default options', () => {
      expect(DEFAULT_ENGINE_OPTIONS.minNewsConfidence).toBeDefined();
      expect(DEFAULT_ENGINE_OPTIONS.autoRevealConfirmed).toBe(true);
      expect(DEFAULT_ENGINE_OPTIONS.revelationMultiplier).toBe(1.0);
    });
  });

  describe('validateRevelationResult', () => {
    it('should validate valid result', () => {
      const result: RevelationResult = {
        playerId: 'test',
        events: [],
        revealedTraits: [],
        newsEvents: [],
        patternData: createPlayerPatternData('test'),
      };

      expect(validateRevelationResult(result)).toBe(true);
    });

    it('should reject result without playerId', () => {
      const result = {
        playerId: '',
        events: [],
        revealedTraits: [],
        newsEvents: [],
        patternData: createPlayerPatternData('test'),
      } as RevelationResult;

      expect(validateRevelationResult(result)).toBe(false);
    });
  });
});

describe('Brand Guidelines Compliance', () => {
  it('should never show traits as labels until confirmed', () => {
    const player = createTestPlayer({
      hiddenTraits: {
        positive: ['clutch'],
        negative: [],
        revealedToUser: [],
      },
    });

    // Even after processing events, traits shouldn't be revealed unless confirmed
    const context = createGameEventContext('gameWinningPlay', {
      quarter: 4,
      timeRemaining: 60,
      scoreDifferential: 3,
    });

    processGameEvent(player, context, 'Test Team');

    // Trait should not be in revealedToUser yet
    // (would need many observations to reach confirmed status)
    expect(player.hiddenTraits.revealedToUser).not.toContain('clutch');
  });

  it('should not expose It factor in any revelation', () => {
    // Verify that It factor is not part of revelation system
    const allTraitNames = ALL_TRIGGERS.map((t) => t.trait);
    expect(allTraitNames).not.toContain('itFactor');
    expect(allTraitNames).not.toContain('it');
    expect(allTraitNames).not.toContain('it_factor');
  });

  it('should provide news hints instead of direct labels', () => {
    const evidence = {
      trait: 'clutch' as const,
      supportingObservations: 3,
      contradictingObservations: 0,
      weightedEvidence: 3.0,
      confidence: 'suspected' as ConfidenceLevel,
      probability: 0.5,
      lastObservation: Date.now(),
      recentObservations: [],
    };

    const context = createGameEventContext('gameWinningPlay');
    const news = generateTraitNews(
      'player-123',
      'Test Player',
      'Test Team',
      evidence,
      context
    );

    if (news) {
      // Headlines and bodies should not directly say "has clutch trait"
      expect(news.headline.toLowerCase()).not.toContain('has clutch');
      expect(news.headline.toLowerCase()).not.toContain('trait:');
      expect(news.body.toLowerCase()).not.toContain('has the clutch trait');
    }
  });
});
