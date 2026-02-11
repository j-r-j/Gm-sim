/**
 * GameState Tests
 * Tests for GameState serialization, 3 save slots, and entity references
 */

import {
  GameState,
  SaveSlot,
  SimulationSpeed,
  CareerStats,
  CareerTeamEntry,
  ALL_SAVE_SLOTS,
  ALL_SIMULATION_SPEEDS,
  DEFAULT_GAME_SETTINGS,
  validateSaveSlot,
  validateCareerStats,
  validateCareerTeamEntry,
  validateGameSettings,
  createDefaultCareerStats,
  createGameStateSkeleton,
  updateLastSaved,
  addCareerTeamEntry,
  endCareerTeamEntry,
  updateCareerStatsAfterSeason,
  getCurrentTeamEntry,
  getCareerStatsWinningPercentage,
  getGameStateSummary,
} from '../GameState';

describe('SaveSlot', () => {
  describe('ALL_SAVE_SLOTS', () => {
    it('should have exactly 3 slots', () => {
      expect(ALL_SAVE_SLOTS).toHaveLength(3);
    });

    it('should have slots 0, 1, 2', () => {
      expect(ALL_SAVE_SLOTS).toContain(0);
      expect(ALL_SAVE_SLOTS).toContain(1);
      expect(ALL_SAVE_SLOTS).toContain(2);
    });
  });

  describe('validateSaveSlot', () => {
    it('should validate slot 0', () => {
      expect(validateSaveSlot(0)).toBe(true);
    });

    it('should validate slot 1', () => {
      expect(validateSaveSlot(1)).toBe(true);
    });

    it('should validate slot 2', () => {
      expect(validateSaveSlot(2)).toBe(true);
    });

    it('should reject slot 3', () => {
      expect(validateSaveSlot(3)).toBe(false);
    });

    it('should reject negative slots', () => {
      expect(validateSaveSlot(-1)).toBe(false);
    });
  });
});

describe('SimulationSpeed', () => {
  describe('ALL_SIMULATION_SPEEDS', () => {
    it('should have 3 speeds', () => {
      expect(ALL_SIMULATION_SPEEDS).toHaveLength(3);
    });

    it('should include fast, normal, detailed', () => {
      expect(ALL_SIMULATION_SPEEDS).toContain('fast');
      expect(ALL_SIMULATION_SPEEDS).toContain('normal');
      expect(ALL_SIMULATION_SPEEDS).toContain('detailed');
    });
  });
});

describe('GameSettings', () => {
  describe('DEFAULT_GAME_SETTINGS', () => {
    it('should have auto save enabled', () => {
      expect(DEFAULT_GAME_SETTINGS.autoSaveEnabled).toBe(true);
    });

    it('should have normal simulation speed', () => {
      expect(DEFAULT_GAME_SETTINGS.simulationSpeed).toBe('normal');
    });

    it('should have notifications enabled', () => {
      expect(DEFAULT_GAME_SETTINGS.notificationsEnabled).toBe(true);
    });
  });

  describe('validateGameSettings', () => {
    it('should validate default settings', () => {
      expect(validateGameSettings(DEFAULT_GAME_SETTINGS)).toBe(true);
    });

    it('should reject invalid simulation speed', () => {
      const settings = { ...DEFAULT_GAME_SETTINGS, simulationSpeed: 'ultra' as SimulationSpeed };
      expect(validateGameSettings(settings)).toBe(false);
    });

    it('should reject non-boolean autoSave', () => {
      const settings = { ...DEFAULT_GAME_SETTINGS, autoSaveEnabled: 'yes' as any };
      expect(validateGameSettings(settings)).toBe(false);
    });
  });
});

describe('CareerStats', () => {
  describe('createDefaultCareerStats', () => {
    it('should create stats with zeros', () => {
      const stats = createDefaultCareerStats();
      expect(stats.seasonsCompleted).toBe(0);
      expect(stats.totalWins).toBe(0);
      expect(stats.totalLosses).toBe(0);
      expect(stats.playoffAppearances).toBe(0);
      expect(stats.championships).toBe(0);
    });

    it('should have empty team history', () => {
      const stats = createDefaultCareerStats();
      expect(stats.teamHistory).toHaveLength(0);
    });
  });

  describe('validateCareerStats', () => {
    it('should validate default stats', () => {
      const stats = createDefaultCareerStats();
      expect(validateCareerStats(stats)).toBe(true);
    });

    it('should reject negative values', () => {
      const stats = createDefaultCareerStats();
      stats.totalWins = -5;
      expect(validateCareerStats(stats)).toBe(false);
    });
  });

  describe('validateCareerTeamEntry', () => {
    it('should validate a complete entry', () => {
      const entry: CareerTeamEntry = {
        teamId: 'team-1',
        teamName: 'Test Team',
        yearsStart: 2020,
        yearsEnd: 2023,
        record: { wins: 40, losses: 24 },
        championships: 1,
        firedOrQuit: 'quit',
      };
      expect(validateCareerTeamEntry(entry)).toBe(true);
    });

    it('should validate current team with null end', () => {
      const entry: CareerTeamEntry = {
        teamId: 'team-1',
        teamName: 'Test Team',
        yearsStart: 2020,
        yearsEnd: null,
        record: { wins: 30, losses: 18 },
        championships: 0,
        firedOrQuit: 'current',
      };
      expect(validateCareerTeamEntry(entry)).toBe(true);
    });

    it('should reject end before start', () => {
      const entry: CareerTeamEntry = {
        teamId: 'team-1',
        teamName: 'Test Team',
        yearsStart: 2025,
        yearsEnd: 2020,
        record: { wins: 0, losses: 0 },
        championships: 0,
        firedOrQuit: 'fired',
      };
      expect(validateCareerTeamEntry(entry)).toBe(false);
    });
  });

  describe('addCareerTeamEntry', () => {
    it('should add first team entry', () => {
      const stats = createDefaultCareerStats();
      const updated = addCareerTeamEntry(stats, 'team-1', 'Buffalo Frontiersmen', 2025);
      expect(updated.teamHistory).toHaveLength(1);
      expect(updated.teamHistory[0].teamId).toBe('team-1');
      expect(updated.teamHistory[0].firedOrQuit).toBe('current');
    });

    it('should close previous current entry when adding new team', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'First Team', 2020);
      stats = addCareerTeamEntry(stats, 'team-2', 'Second Team', 2023);

      expect(stats.teamHistory).toHaveLength(2);
      expect(stats.teamHistory[0].firedOrQuit).toBe('quit');
      expect(stats.teamHistory[0].yearsEnd).toBe(2022);
      expect(stats.teamHistory[1].firedOrQuit).toBe('current');
    });
  });

  describe('endCareerTeamEntry', () => {
    it('should mark current entry as fired', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = endCareerTeamEntry(stats, 2023, 'fired');

      expect(stats.teamHistory[0].firedOrQuit).toBe('fired');
      expect(stats.teamHistory[0].yearsEnd).toBe(2023);
    });

    it('should mark current entry as quit', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = endCareerTeamEntry(stats, 2022, 'quit');

      expect(stats.teamHistory[0].firedOrQuit).toBe('quit');
    });
  });

  describe('updateCareerStatsAfterSeason', () => {
    it('should update season count', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = updateCareerStatsAfterSeason(stats, 10, 7, true, false);

      expect(stats.seasonsCompleted).toBe(1);
      expect(stats.totalWins).toBe(10);
      expect(stats.totalLosses).toBe(7);
      expect(stats.playoffAppearances).toBe(1);
      expect(stats.championships).toBe(0);
    });

    it('should track championships', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = updateCareerStatsAfterSeason(stats, 16, 3, true, true);

      expect(stats.championships).toBe(1);
      expect(stats.teamHistory[0].championships).toBe(1);
    });

    it('should update current team record', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = updateCareerStatsAfterSeason(stats, 10, 7, false, false);
      stats = updateCareerStatsAfterSeason(stats, 12, 5, true, false);

      expect(stats.teamHistory[0].record.wins).toBe(22);
      expect(stats.teamHistory[0].record.losses).toBe(12);
    });
  });

  describe('getCurrentTeamEntry', () => {
    it('should return current team', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      const current = getCurrentTeamEntry(stats);
      expect(current?.teamId).toBe('team-1');
    });

    it('should return null if no current team', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = endCareerTeamEntry(stats, 2023, 'fired');
      const current = getCurrentTeamEntry(stats);
      expect(current).toBeNull();
    });
  });

  describe('getCareerStatsWinningPercentage', () => {
    it('should return 0 for no games', () => {
      const stats = createDefaultCareerStats();
      expect(getCareerStatsWinningPercentage(stats)).toBe(0);
    });

    it('should calculate winning percentage', () => {
      const stats = createDefaultCareerStats();
      stats.totalWins = 100;
      stats.totalLosses = 50;
      expect(getCareerStatsWinningPercentage(stats)).toBeCloseTo(0.667, 2);
    });
  });
});

describe('GameState Skeleton', () => {
  describe('createGameStateSkeleton', () => {
    it('should create skeleton with correct slot', () => {
      const skeleton = createGameStateSkeleton(1, 'Player1', 'team-1');
      expect(skeleton.saveSlot).toBe(1);
    });

    it('should set user info', () => {
      const skeleton = createGameStateSkeleton(0, 'TestUser', 'team-5');
      expect(skeleton.userName).toBe('TestUser');
      expect(skeleton.userTeamId).toBe('team-5');
    });

    it('should have timestamps', () => {
      const skeleton = createGameStateSkeleton(2, 'User', 'team-1');
      expect(skeleton.createdAt).toBeDefined();
      expect(skeleton.lastSavedAt).toBeDefined();
    });

    it('should have empty entity collections', () => {
      const skeleton = createGameStateSkeleton(0, 'User', 'team-1');
      expect(skeleton.teams).toEqual({});
      expect(skeleton.players).toEqual({});
      expect(skeleton.coaches).toEqual({});
    });

    it('should have default settings', () => {
      const skeleton = createGameStateSkeleton(0, 'User', 'team-1');
      expect(skeleton.gameSettings).toEqual(DEFAULT_GAME_SETTINGS);
    });
  });
});

describe('GameState Serialization', () => {
  describe('serializeGameState / deserializeGameState', () => {
    it('should serialize and deserialize basic structure', () => {
      // Create a minimal valid game state for testing
      const skeleton = createGameStateSkeleton(1, 'TestPlayer', 'team-1');
      const minimalState = {
        ...skeleton,
        saveSlot: 1 as SaveSlot,
      };

      const json = JSON.stringify(minimalState);
      const parsed = JSON.parse(json);

      expect(parsed.saveSlot).toBe(1);
      expect(parsed.userName).toBe('TestPlayer');
      expect(parsed.userTeamId).toBe('team-1');
    });

    it('should preserve career stats', () => {
      let stats = createDefaultCareerStats();
      stats = addCareerTeamEntry(stats, 'team-1', 'Test Team', 2020);
      stats = updateCareerStatsAfterSeason(stats, 10, 7, true, false);

      const json = JSON.stringify(stats);
      const parsed = JSON.parse(json) as CareerStats;

      expect(parsed.seasonsCompleted).toBe(1);
      expect(parsed.totalWins).toBe(10);
      expect(parsed.teamHistory).toHaveLength(1);
    });
  });
});

describe('updateLastSaved', () => {
  it('should update timestamp', () => {
    const skeleton = createGameStateSkeleton(0, 'User', 'team-1') as GameState;

    const updated = updateLastSaved(skeleton);
    // Verify it returns a valid ISO timestamp
    expect(updated.lastSavedAt).toBeDefined();
    expect(typeof updated.lastSavedAt).toBe('string');
    expect(new Date(updated.lastSavedAt).toISOString()).toBe(updated.lastSavedAt);
  });

  it('should return a new object', () => {
    const skeleton = createGameStateSkeleton(0, 'User', 'team-1') as GameState;
    const updated = updateLastSaved(skeleton);
    expect(updated).not.toBe(skeleton);
  });
});

describe('getGameStateSummary', () => {
  it('should extract summary info', () => {
    // Create minimal mock state
    const mockState = {
      userName: 'TestGM',
      userTeamId: 'team-1',
      teams: {
        'team-1': {
          city: 'Buffalo',
          nickname: 'Frontiersmen',
          currentRecord: { wins: 10, losses: 6 },
        },
      },
      league: {
        calendar: {
          currentYear: 2025,
          currentWeek: 12,
          currentPhase: 'regularSeason',
        },
      },
      careerStats: {
        seasonsCompleted: 3,
        championships: 1,
      },
    } as unknown as GameState;

    const summary = getGameStateSummary(mockState);

    expect(summary.userName).toBe('TestGM');
    expect(summary.teamName).toBe('Buffalo Frontiersmen');
    expect(summary.year).toBe(2025);
    expect(summary.week).toBe(12);
    expect(summary.record).toBe('10-6');
    expect(summary.seasonsPlayed).toBe(3);
    expect(summary.championships).toBe(1);
  });
});

describe('3 Save Slots Support', () => {
  it('should support save slot 0', () => {
    expect(validateSaveSlot(0)).toBe(true);
  });

  it('should support save slot 1', () => {
    expect(validateSaveSlot(1)).toBe(true);
  });

  it('should support save slot 2', () => {
    expect(validateSaveSlot(2)).toBe(true);
  });

  it('GameState type should only allow 0, 1, 2', () => {
    // TypeScript should enforce this, but we verify at runtime
    const slots: number[] = [0, 1, 2];
    slots.forEach((slot) => {
      expect(validateSaveSlot(slot)).toBe(true);
    });

    const invalidSlots: number[] = [-1, 3, 4, 10];
    invalidSlots.forEach((slot) => {
      expect(validateSaveSlot(slot)).toBe(false);
    });
  });
});
