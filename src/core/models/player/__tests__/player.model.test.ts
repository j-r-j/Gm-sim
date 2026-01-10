import {
  Player,
  validatePlayer,
  getPlayerFullName,
  isRookie,
  isVeteran,
  Position,
  PhysicalAttributes,
  TechnicalSkills,
  SkillValue,
  validateSkillValue,
  HiddenTraits,
  ItFactor,
  ConsistencyProfile,
  SchemeFits,
  RoleFit,
  InjuryStatus,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../index';

// Helper function to create a valid player for testing
function createValidPlayer(): Player {
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
    negative: [],
    revealedToUser: ['clutch'],
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
    id: 'player-001',
    firstName: 'Patrick',
    lastName: 'Mahomes',
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
    collegeId: 'texas-tech',
    draftYear: 2017,
    draftRound: 1,
    draftPick: 10,
  };
}

describe('Player Entity', () => {
  describe('validatePlayer', () => {
    it('should validate a complete valid player', () => {
      const player = createValidPlayer();
      expect(validatePlayer(player)).toBe(true);
    });

    it('should reject player with invalid age', () => {
      const player = createValidPlayer();
      player.age = 15; // Too young
      expect(validatePlayer(player)).toBe(false);
    });

    it('should reject player with invalid experience', () => {
      const player = createValidPlayer();
      player.experience = -1;
      expect(validatePlayer(player)).toBe(false);
    });

    it('should reject player with invalid fatigue', () => {
      const player = createValidPlayer();
      player.fatigue = 150; // Over 100
      expect(validatePlayer(player)).toBe(false);
    });

    it('should reject player with invalid morale', () => {
      const player = createValidPlayer();
      player.morale = -10;
      expect(validatePlayer(player)).toBe(false);
    });

    it('should reject player with invalid draft round', () => {
      const player = createValidPlayer();
      player.draftRound = 10; // Only 7 rounds
      expect(validatePlayer(player)).toBe(false);
    });
  });

  describe('Player utility functions', () => {
    it('should get full player name', () => {
      const player = createValidPlayer();
      expect(getPlayerFullName(player)).toBe('Patrick Mahomes');
    });

    it('should correctly identify rookies', () => {
      const player = createValidPlayer();
      expect(isRookie(player)).toBe(false);

      player.experience = 0;
      expect(isRookie(player)).toBe(true);
    });

    it('should correctly identify veterans', () => {
      const player = createValidPlayer();
      expect(isVeteran(player)).toBe(true); // 7 years experience

      player.experience = 4;
      expect(isVeteran(player)).toBe(false);
    });
  });
});

describe('SkillValue validation', () => {
  it('should validate proper skill ranges (min <= true <= max)', () => {
    const validSkill: SkillValue = {
      trueValue: 75,
      perceivedMin: 70,
      perceivedMax: 80,
      maturityAge: 26,
    };
    expect(validateSkillValue(validSkill)).toBe(true);
  });

  it('should reject when trueValue is below perceivedMin', () => {
    const invalidSkill: SkillValue = {
      trueValue: 65,
      perceivedMin: 70,
      perceivedMax: 80,
      maturityAge: 26,
    };
    expect(validateSkillValue(invalidSkill)).toBe(false);
  });

  it('should reject when trueValue is above perceivedMax', () => {
    const invalidSkill: SkillValue = {
      trueValue: 85,
      perceivedMin: 70,
      perceivedMax: 80,
      maturityAge: 26,
    };
    expect(validateSkillValue(invalidSkill)).toBe(false);
  });

  it('should reject values outside 1-100 range', () => {
    const invalidSkill: SkillValue = {
      trueValue: 105,
      perceivedMin: 100,
      perceivedMax: 110,
      maturityAge: 26,
    };
    expect(validateSkillValue(invalidSkill)).toBe(false);
  });
});

describe('Position enum', () => {
  it('should cover all NFL offensive positions', () => {
    expect(OFFENSIVE_POSITIONS).toContain(Position.QB);
    expect(OFFENSIVE_POSITIONS).toContain(Position.RB);
    expect(OFFENSIVE_POSITIONS).toContain(Position.WR);
    expect(OFFENSIVE_POSITIONS).toContain(Position.TE);
    expect(OFFENSIVE_POSITIONS).toContain(Position.LT);
    expect(OFFENSIVE_POSITIONS).toContain(Position.LG);
    expect(OFFENSIVE_POSITIONS).toContain(Position.C);
    expect(OFFENSIVE_POSITIONS).toContain(Position.RG);
    expect(OFFENSIVE_POSITIONS).toContain(Position.RT);
  });

  it('should cover all NFL defensive positions', () => {
    expect(DEFENSIVE_POSITIONS).toContain(Position.DE);
    expect(DEFENSIVE_POSITIONS).toContain(Position.DT);
    expect(DEFENSIVE_POSITIONS).toContain(Position.OLB);
    expect(DEFENSIVE_POSITIONS).toContain(Position.ILB);
    expect(DEFENSIVE_POSITIONS).toContain(Position.CB);
    expect(DEFENSIVE_POSITIONS).toContain(Position.FS);
    expect(DEFENSIVE_POSITIONS).toContain(Position.SS);
  });

  it('should cover special teams positions', () => {
    expect(SPECIAL_TEAMS_POSITIONS).toContain(Position.K);
    expect(SPECIAL_TEAMS_POSITIONS).toContain(Position.P);
  });

  it('should have 18 total positions', () => {
    const allPositions = Object.values(Position);
    expect(allPositions).toHaveLength(18);
  });
});
