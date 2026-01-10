import {
  Player,
  PlayerViewModel,
  createPlayerViewModel,
  validateViewModelPrivacy,
  Position,
  PhysicalAttributes,
  TechnicalSkills,
  HiddenTraits,
  ItFactor,
  ConsistencyProfile,
  SchemeFits,
  RoleFit,
  InjuryStatus,
} from '../index';

// Helper function to create a player with sensitive data
function createPlayerWithSensitiveData(): Player {
  const physical: PhysicalAttributes = {
    height: 73,
    weight: 215,
    armLength: 31,
    handSize: 9.25,
    wingspan: 76,
    speed: 4.55,
    acceleration: 82,
    agility: 78,
    strength: 70,
    verticalJump: 34,
  };

  const skills: TechnicalSkills = {
    throwing: {
      trueValue: 92, // SECRET!
      perceivedMin: 85,
      perceivedMax: 95,
      maturityAge: 26,
    },
    footwork: {
      trueValue: 67, // SECRET!
      perceivedMin: 60,
      perceivedMax: 75,
      maturityAge: 28,
    },
  };

  const hiddenTraits: HiddenTraits = {
    positive: ['clutch', 'leader', 'coolUnderPressure'], // SECRET!
    negative: ['lazy'], // SECRET!
    revealedToUser: ['leader'], // Only this is known
  };

  const itFactor: ItFactor = { value: 88 }; // SECRET!

  const consistency: ConsistencyProfile = {
    tier: 'streaky', // SECRET!
    currentStreak: 'cold', // SECRET!
    streakGamesRemaining: 3, // SECRET!
  };

  const schemeFits: SchemeFits = {
    offensive: {
      westCoast: 'perfect', // SECRET level, only description shown
      airRaid: 'good',
      spreadOption: 'terrible',
      powerRun: 'neutral',
      zoneRun: 'poor',
      playAction: 'good',
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
    ceiling: 'highEndStarter',
    currentRole: 'solidStarter',
    roleEffectiveness: 72, // SECRET!
  };

  const injuryStatus: InjuryStatus = {
    severity: 'questionable',
    type: 'knee',
    weeksRemaining: 0,
    isPublic: true,
    lingeringEffect: 5, // SECRET!
  };

  return {
    id: 'player-sensitive-001',
    firstName: 'Test',
    lastName: 'Player',
    position: Position.QB,
    age: 26,
    experience: 3,
    physical,
    skills,
    hiddenTraits,
    itFactor,
    consistency,
    schemeFits,
    roleFit,
    contractId: null,
    injuryStatus,
    fatigue: 25,
    morale: 70,
    collegeId: 'test-university',
    draftYear: 2021,
    draftRound: 2,
    draftPick: 35,
  };
}

describe('Player Privacy Tests', () => {
  describe('Serialization safety', () => {
    it('should not leak trueValue when PlayerViewModel is serialized', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('trueValue');
      expect(json).not.toContain('"92"'); // The actual true value
      expect(json).not.toContain(':92'); // The actual true value
      expect(json).not.toContain('"67"'); // Another true value
      expect(json).not.toContain(':67'); // Another true value
    });

    it('should not leak itFactor when PlayerViewModel is serialized', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('itFactor');
      expect(json).not.toContain(':88'); // The it factor value
    });

    it('should not leak consistency tier when PlayerViewModel is serialized', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('consistency');
      expect(json).not.toContain('streaky');
      expect(json).not.toContain('metronome');
      expect(json).not.toContain('volatile');
      expect(json).not.toContain('chaotic');
    });

    it('should not leak unrevealed traits when serialized', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      // Only 'leader' is revealed
      expect(json).toContain('leader');

      // These should NOT appear
      expect(json).not.toContain('clutch');
      expect(json).not.toContain('coolUnderPressure');
      expect(json).not.toContain('lazy');
    });

    it('should not leak roleEffectiveness when serialized', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('roleEffectiveness');
      expect(json).not.toContain(':72');
    });
  });

  describe('validateViewModelPrivacy', () => {
    it('should pass validation for properly created PlayerViewModel', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);

      expect(validateViewModelPrivacy(viewModel)).toBe(true);
    });

    it('should fail if trueValue somehow gets in', () => {
      const maliciousViewModel = {
        id: 'test',
        name: 'Test',
        position: Position.QB,
        age: 25,
        experience: 2,
        physical: {} as PhysicalAttributes,
        skillRanges: {},
        knownTraits: [],
        schemeFitDescription: 'Good fit',
        roleFitDescription: 'Adequate',
        injuryDisplay: 'Healthy',
        draftInfo: { year: 2022, round: 1, pick: 1 },
        // Maliciously added
        trueValue: 85,
      } as unknown as PlayerViewModel;

      const json = JSON.stringify(maliciousViewModel);
      expect(json).toContain('trueValue');
      expect(validateViewModelPrivacy(maliciousViewModel)).toBe(false);
    });
  });

  describe('Snapshot test for hidden fields', () => {
    it('should match expected PlayerViewModel structure (snapshot)', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player, 'westCoast');

      // This snapshot should NOT contain any hidden data
      expect(viewModel).toMatchSnapshot();
    });

    it('should have consistent structure without hidden fields', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);

      // Define exactly what should be in the view model
      const expectedKeys = [
        'id',
        'name',
        'position',
        'age',
        'experience',
        'physical',
        'skillRanges',
        'knownTraits',
        'schemeFitDescription',
        'roleFitDescription',
        'injuryDisplay',
        'draftInfo',
      ];

      const actualKeys = Object.keys(viewModel);
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('Full Player entity storage safety', () => {
    it('should not accidentally expose Player as PlayerViewModel', () => {
      const player = createPlayerWithSensitiveData();

      // Type check: Player should not be assignable to PlayerViewModel
      // This is a compile-time check, but we verify runtime structure
      expect(player).toHaveProperty('itFactor');
      expect(player).toHaveProperty('hiddenTraits');
      expect(player).toHaveProperty('consistency');
      expect(player).toHaveProperty('skills');

      const viewModel = createPlayerViewModel(player);
      expect(viewModel).not.toHaveProperty('itFactor');
      expect(viewModel).not.toHaveProperty('hiddenTraits');
      expect(viewModel).not.toHaveProperty('consistency');
      expect(viewModel).not.toHaveProperty('skills'); // Has skillRanges instead
    });

    it('should create independent copies for physical attributes', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);

      // Mutating the view model should not affect the original
      viewModel.physical.height = 99;
      expect(player.physical.height).toBe(73);
    });
  });

  describe('No aggregate rating exposure', () => {
    it('should be impossible to derive overall rating from view model', () => {
      const player = createPlayerWithSensitiveData();
      const viewModel = createPlayerViewModel(player);

      // The view model should not have any property that reveals an aggregate
      const allValues = JSON.stringify(viewModel);

      // Common aggregate rating terms
      const aggregateTerms = [
        'overall',
        'ovr',
        'rating',
        'aggregate',
        'total',
        'composite',
        'rank',
        'grade',
      ];

      for (const term of aggregateTerms) {
        // Check as property name (case insensitive in the string)
        expect(allValues.toLowerCase()).not.toContain(`"${term}":`);
      }
    });
  });
});
