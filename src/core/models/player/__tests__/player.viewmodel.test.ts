import {
  Player,
  PlayerViewModel,
  createPlayerViewModel,
  getExperienceDisplay,
  getSkillRangeMidpoint,
  getSkillConfidence,
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

// Helper function to create a valid player for testing
function createTestPlayer(): Player {
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
    positive: ['clutch', 'leader', 'filmJunkie'],
    negative: ['hotHead'],
    revealedToUser: ['clutch'], // Only clutch is revealed
  };

  const itFactor: ItFactor = { value: 92 }; // Transcendent

  const consistency: ConsistencyProfile = {
    tier: 'metronome',
    currentStreak: 'hot',
    streakGamesRemaining: 2,
  };

  const schemeFits: SchemeFits = {
    offensive: {
      westCoast: 'good',
      airRaid: 'perfect',
      spreadOption: 'neutral',
      powerRun: 'poor',
      zoneRun: 'neutral',
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
    ceiling: 'franchiseCornerstone',
    currentRole: 'franchiseCornerstone',
    roleEffectiveness: 95,
  };

  const injuryStatus: InjuryStatus = {
    severity: 'none',
    type: 'none',
    weeksRemaining: 0,
    isPublic: true,
    lingeringEffect: 0,
  };

  return {
    id: 'player-001',
    firstName: 'Joe',
    lastName: 'Burrow',
    position: Position.QB,
    age: 27,
    experience: 4,
    physical,
    skills,
    hiddenTraits,
    itFactor,
    consistency,
    schemeFits,
    roleFit,
    contractId: 'contract-001',
    injuryStatus,
    fatigue: 10,
    morale: 85,
    collegeId: 'lsu',
    draftYear: 2020,
    draftRound: 1,
    draftPick: 1,
  };
}

describe('PlayerViewModel', () => {
  describe('createPlayerViewModel', () => {
    it('should create a view model with correct basic info', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player, 'westCoast');

      expect(viewModel.id).toBe('player-001');
      expect(viewModel.name).toBe('Joe Burrow');
      expect(viewModel.position).toBe(Position.QB);
      expect(viewModel.age).toBe(27);
      expect(viewModel.experience).toBe(4);
    });

    it('should include physical attributes', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      expect(viewModel.physical.height).toBe(74);
      expect(viewModel.physical.speed).toBe(4.5);
    });
  });

  describe('Privacy - trueValue exclusion', () => {
    it('should NOT include trueValue in skillRanges', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      // Check each skill in skillRanges
      for (const [_skillName, range] of Object.entries(viewModel.skillRanges)) {
        expect(range).toHaveProperty('min');
        expect(range).toHaveProperty('max');
        expect(range).not.toHaveProperty('trueValue');
      }
    });

    it('should only show min/max ranges for skills', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      expect(viewModel.skillRanges.armStrength).toEqual({
        min: 80,
        max: 90,
      });
      // Note: trueValue is 85, but it's NOT in the view model
    });
  });

  describe('Privacy - itFactor exclusion', () => {
    it('should NOT include itFactor in view model', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      expect(viewModel).not.toHaveProperty('itFactor');
      expect((viewModel as unknown as Record<string, unknown>).itFactor).toBeUndefined();
    });

    it('should not expose itFactor value through any property', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      // The player has itFactor value of 92, it should NOT appear
      expect(json).not.toContain('itFactor');
      expect(json).not.toContain('"value":92');
    });
  });

  describe('Privacy - traits handling', () => {
    it('should only include revealed traits', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      // Player has 4 traits total, but only 1 revealed
      expect(viewModel.knownTraits).toEqual(['clutch']);
      expect(viewModel.knownTraits).not.toContain('leader');
      expect(viewModel.knownTraits).not.toContain('filmJunkie');
      expect(viewModel.knownTraits).not.toContain('hotHead');
    });

    it('should NOT expose hidden traits arrays', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      expect(viewModel).not.toHaveProperty('hiddenTraits');
      expect((viewModel as unknown as Record<string, unknown>).positive).toBeUndefined();
      expect((viewModel as unknown as Record<string, unknown>).negative).toBeUndefined();
    });
  });

  describe('Privacy - no aggregate ratings', () => {
    it('should NOT have any overall rating property', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      expect(viewModel).not.toHaveProperty('overall');
      expect(viewModel).not.toHaveProperty('ovr');
      expect(viewModel).not.toHaveProperty('rating');
      expect(viewModel).not.toHaveProperty('aggregateRating');
    });

    it('should not be possible to calculate true skill from range', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      // User can only know the range, not the exact value
      const armStrength = viewModel.skillRanges.armStrength;
      expect(armStrength.max - armStrength.min).toBeGreaterThan(0);
    });
  });

  describe('Qualitative descriptions', () => {
    it('should provide qualitative scheme fit description', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player, 'westCoast');

      // 'good' fit should return 'Good fit'
      expect(viewModel.schemeFitDescription).toBe('Good fit');
    });

    it('should provide qualitative role fit description', () => {
      const player = createTestPlayer();
      const viewModel = createPlayerViewModel(player);

      // 95 effectiveness should be 'Excelling in role'
      expect(viewModel.roleFitDescription).toBe('Excelling in role');
    });
  });
});

describe('View Model utility functions', () => {
  describe('getExperienceDisplay', () => {
    it('should display "Rookie" for 0 experience', () => {
      const player = createTestPlayer();
      player.experience = 0;
      const viewModel = createPlayerViewModel(player);
      expect(getExperienceDisplay(viewModel)).toBe('Rookie');
    });

    it('should display "1 year" for 1 year experience', () => {
      const player = createTestPlayer();
      player.experience = 1;
      const viewModel = createPlayerViewModel(player);
      expect(getExperienceDisplay(viewModel)).toBe('1 year');
    });

    it('should display "Veteran" for 10+ years', () => {
      const player = createTestPlayer();
      player.experience = 12;
      const viewModel = createPlayerViewModel(player);
      expect(getExperienceDisplay(viewModel)).toBe('Veteran');
    });
  });

  describe('getSkillRangeMidpoint', () => {
    it('should calculate correct midpoint', () => {
      expect(getSkillRangeMidpoint({ min: 70, max: 90 })).toBe(80);
      expect(getSkillRangeMidpoint({ min: 50, max: 60 })).toBe(55);
    });
  });

  describe('getSkillConfidence', () => {
    it('should return high confidence for narrow ranges', () => {
      expect(getSkillConfidence({ min: 75, max: 80 })).toBe('high');
    });

    it('should return medium confidence for moderate ranges', () => {
      expect(getSkillConfidence({ min: 70, max: 85 })).toBe('medium');
    });

    it('should return low confidence for wide ranges', () => {
      expect(getSkillConfidence({ min: 50, max: 90 })).toBe('low');
    });
  });
});
