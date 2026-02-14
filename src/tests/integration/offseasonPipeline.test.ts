/**
 * Offseason Pipeline Integration Tests
 *
 * Tests the 12-phase offseason progression ensuring:
 * - All phases can be created and completed
 * - Phase transitions work correctly
 * - Tasks can be completed within each phase
 * - State remains consistent across phase transitions
 * - Events are tracked throughout the offseason
 * - Season recap, signings, releases, and roster changes are recorded
 */

import {
  createOffSeasonState,
  simulateRemainingOffSeason,
  validateOffSeasonState,
  PHASE_ORDER,
  PHASE_NAMES,
  PHASE_NUMBERS,
  OffSeasonState,
  OffSeasonPhaseType,
  advancePhase,
  autoCompletePhase,
  canAdvancePhase,
  getNextPhase,
  getCurrentPhaseNumber,
  getCurrentPhaseName,
  getCurrentPhaseDescription,
  getCurrentPhaseTasks,
  getRequiredTasks,
  getOptionalTasks,
  areRequiredTasksComplete,
  areAllTasksComplete,
  completeTask,
  advanceDay,
  setSeasonRecap,
  setDraftOrder,
  addRosterChange,
  addSigning,
  addRelease,
  addEvent,
  getRecentEvents,
  getPhaseEvents,
  getProgress,
  getSummary,
  skipToNextPhase,
  resetPhase,
} from '@core/offseason/OffSeasonPhaseManager';

describe('Offseason Pipeline Integration Tests', () => {
  // =====================================================
  // 1. Phase structure and ordering
  // =====================================================
  describe('offseason phase structure', () => {
    it('should have exactly 12 phases', () => {
      expect(PHASE_ORDER).toHaveLength(12);
    });

    it('phases should be numbered 1 through 12', () => {
      for (let i = 0; i < PHASE_ORDER.length; i++) {
        expect(PHASE_NUMBERS[PHASE_ORDER[i]]).toBe(i + 1);
      }
    });

    it('every phase should have a display name', () => {
      for (const phase of PHASE_ORDER) {
        expect(PHASE_NAMES[phase]).toBeDefined();
        expect(PHASE_NAMES[phase].length).toBeGreaterThan(0);
      }
    });

    it('phase order should start with season_end and end with season_start', () => {
      expect(PHASE_ORDER[0]).toBe('season_end');
      expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('season_start');
    });
  });

  // =====================================================
  // 2. Initial offseason state creation
  // =====================================================
  describe('offseason state initialization', () => {
    it('should create valid initial state', () => {
      const state = createOffSeasonState(2025);

      expect(state.year).toBe(2025);
      expect(state.currentPhase).toBe('season_end');
      expect(state.phaseDay).toBe(1);
      expect(state.isComplete).toBe(false);
      expect(state.completedPhases).toHaveLength(0);
      expect(state.events).toHaveLength(0);
      expect(state.rosterChanges).toHaveLength(0);
      expect(state.signings).toHaveLength(0);
      expect(state.releases).toHaveLength(0);
      expect(validateOffSeasonState(state)).toBe(true);
    });

    it('should initialize tasks for all 12 phases', () => {
      const state = createOffSeasonState(2025);

      for (const phase of PHASE_ORDER) {
        expect(state.phaseTasks[phase]).toBeDefined();
        expect(state.phaseTasks[phase].tasks.length).toBeGreaterThan(0);
      }
    });

    it('should have at least one required task per phase', () => {
      const state = createOffSeasonState(2025);

      for (const phase of PHASE_ORDER) {
        const requiredTasks = state.phaseTasks[phase].tasks.filter(
          (t) => t.isRequired
        );
        expect(requiredTasks.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('no tasks should be pre-completed', () => {
      const state = createOffSeasonState(2025);

      for (const phase of PHASE_ORDER) {
        for (const task of state.phaseTasks[phase].tasks) {
          expect(task.isComplete).toBe(false);
        }
        expect(state.phaseTasks[phase].requiredComplete).toBe(false);
      }
    });
  });

  // =====================================================
  // 3. Phase-by-phase progression
  // =====================================================
  describe('phase-by-phase progression through all 12 phases', () => {
    it('should advance through all 12 phases when auto-completing', () => {
      let state = createOffSeasonState(2025);

      for (let i = 0; i < PHASE_ORDER.length; i++) {
        const expectedPhase = PHASE_ORDER[i];
        expect(state.currentPhase).toBe(expectedPhase);

        // Auto-complete required tasks
        state = autoCompletePhase(state);
        expect(areRequiredTasksComplete(state)).toBe(true);

        // Should be able to advance
        if (i < PHASE_ORDER.length - 1) {
          expect(canAdvancePhase(state)).toBe(true);
          state = advancePhase(state);
          expect(state.completedPhases).toContain(expectedPhase);
        }
      }

      // Final phase - advance to complete the offseason
      state = advancePhase(state);
      expect(state.isComplete).toBe(true);
      expect(state.completedPhases).toHaveLength(12);
    });

    it('each completed phase should generate events', () => {
      let state = createOffSeasonState(2025);

      state = autoCompletePhase(state);
      state = advancePhase(state);

      // Should have task_complete and phase_complete events
      const taskCompleteEvents = state.events.filter(
        (e) => e.type === 'task_complete'
      );
      const phaseCompleteEvents = state.events.filter(
        (e) => e.type === 'phase_complete'
      );
      expect(taskCompleteEvents.length).toBeGreaterThan(0);
      expect(phaseCompleteEvents.length).toBeGreaterThan(0);
    });

    it('phase day should reset to 1 on phase transition', () => {
      let state = createOffSeasonState(2025);

      // Advance days within phase
      state = advanceDay(state);
      state = advanceDay(state);
      expect(state.phaseDay).toBe(3);

      // Auto-complete and advance
      state = autoCompletePhase(state);
      state = advancePhase(state);
      expect(state.phaseDay).toBe(1);
    });
  });

  // =====================================================
  // 4. Task completion mechanics
  // =====================================================
  describe('task completion mechanics', () => {
    it('completing a required task should update phase task status', () => {
      let state = createOffSeasonState(2025);
      const requiredTask = getRequiredTasks(state)[0];
      expect(requiredTask).toBeDefined();

      state = completeTask(state, requiredTask.id);

      const updatedTaskStatus = state.phaseTasks[state.currentPhase];
      const updatedTask = updatedTaskStatus.tasks.find(
        (t) => t.id === requiredTask.id
      );
      expect(updatedTask!.isComplete).toBe(true);
      expect(updatedTaskStatus.tasksCompleted).toContain(requiredTask.id);
    });

    it('completing all required tasks should set requiredComplete to true', () => {
      let state = createOffSeasonState(2025);
      const requiredTasks = getRequiredTasks(state);

      for (const task of requiredTasks) {
        state = completeTask(state, task.id);
      }

      expect(state.phaseTasks[state.currentPhase].requiredComplete).toBe(true);
    });

    it('should not be able to advance without completing required tasks', () => {
      const state = createOffSeasonState(2025);
      expect(areRequiredTasksComplete(state)).toBe(false);
      expect(canAdvancePhase(state)).toBe(false);
    });

    it('completing a task twice should be idempotent', () => {
      let state = createOffSeasonState(2025);
      const task = getRequiredTasks(state)[0];

      state = completeTask(state, task.id);
      const eventsAfterFirst = state.events.length;

      state = completeTask(state, task.id);
      // Should not add duplicate event
      expect(state.events.length).toBe(eventsAfterFirst);
    });

    it('completing a non-existent task should be a no-op', () => {
      const state = createOffSeasonState(2025);
      const updated = completeTask(state, 'non_existent_task_id');
      expect(updated).toBe(state);
    });
  });

  // =====================================================
  // 5. Phase-specific data operations
  // =====================================================
  describe('phase-specific data operations', () => {
    it('should set and retrieve season recap data', () => {
      let state = createOffSeasonState(2025);

      const recap = {
        year: 2025,
        teamRecord: { wins: 10, losses: 7, ties: 0 },
        divisionFinish: 2,
        madePlayoffs: true,
        playoffResult: 'Wild Card Round Loss',
        draftPosition: 18,
        topPerformers: [
          {
            playerId: 'player-1',
            playerName: 'John Doe',
            position: 'QB',
            grade: 'A',
          },
        ],
        awards: [],
        seasonWriteUp: 'A competitive season.',
        playerImprovements: [],
      };

      state = setSeasonRecap(state, recap);
      expect(state.seasonRecap).not.toBeNull();
      expect(state.seasonRecap!.teamRecord.wins).toBe(10);
      expect(state.seasonRecap!.madePlayoffs).toBe(true);
    });

    it('should set draft order', () => {
      let state = createOffSeasonState(2025);
      const draftOrder = ['team-1', 'team-2', 'team-3'];

      state = setDraftOrder(state, draftOrder);
      expect(state.draftOrder).toEqual(draftOrder);
    });

    it('should track roster changes', () => {
      let state = createOffSeasonState(2025);

      state = addRosterChange(state, {
        type: 'signing',
        playerId: 'player-1',
        playerName: 'John Doe',
        position: 'QB',
        teamId: 'team-1',
        phase: 'free_agency',
        details: { contractYears: 3 },
      });

      expect(state.rosterChanges).toHaveLength(1);
      expect(state.rosterChanges[0].type).toBe('signing');
      expect(state.rosterChanges[0].id).toBeDefined();
    });

    it('should track signings', () => {
      let state = createOffSeasonState(2025);

      state = addSigning(state, {
        playerId: 'player-2',
        playerName: 'Jane Smith',
        position: 'WR',
        teamId: 'team-1',
        contractYears: 4,
        contractValue: 80000000,
        signingType: 'free_agent',
        phase: 'free_agency',
      });

      expect(state.signings).toHaveLength(1);
      expect(state.signings[0].contractValue).toBe(80000000);
    });

    it('should track releases', () => {
      let state = createOffSeasonState(2025);

      state = addRelease(state, {
        playerId: 'player-3',
        playerName: 'Mike Jones',
        position: 'RB',
        teamId: 'team-1',
        releaseType: 'cut',
        capSavings: 5000000,
        deadCap: 2000000,
        phase: 'contract_management',
      });

      expect(state.releases).toHaveLength(1);
      expect(state.releases[0].capSavings).toBe(5000000);
    });

    it('should track custom events', () => {
      let state = createOffSeasonState(2025);

      state = addEvent(state, 'coaching_change', 'Fired defensive coordinator', {
        coachId: 'coach-1',
      });

      const events = state.events.filter((e) => e.type === 'coaching_change');
      expect(events).toHaveLength(1);
      expect(events[0].description).toBe('Fired defensive coordinator');
    });
  });

  // =====================================================
  // 6. Event and progress tracking
  // =====================================================
  describe('event and progress tracking', () => {
    it('should track progress correctly through phases', () => {
      let state = createOffSeasonState(2025);
      let progress = getProgress(state);

      expect(progress.currentPhaseNumber).toBe(1);
      expect(progress.completedPhases).toBe(0);
      expect(progress.totalPhases).toBe(12);
      expect(progress.percentComplete).toBe(0);
      expect(progress.isComplete).toBe(false);

      // Complete first phase
      state = autoCompletePhase(state);
      state = advancePhase(state);

      progress = getProgress(state);
      expect(progress.currentPhaseNumber).toBe(2);
      expect(progress.completedPhases).toBe(1);
      expect(progress.percentComplete).toBeGreaterThan(0);
    });

    it('should get recent events', () => {
      let state = createOffSeasonState(2025);

      // Complete a few phases to generate events
      state = autoCompletePhase(state);
      state = advancePhase(state);
      state = autoCompletePhase(state);

      const recentEvents = getRecentEvents(state, 5);
      expect(recentEvents.length).toBeGreaterThan(0);
      expect(recentEvents.length).toBeLessThanOrEqual(5);
    });

    it('should filter events by phase', () => {
      let state = createOffSeasonState(2025);

      // Add events in season_end phase
      state = autoCompletePhase(state);
      state = advancePhase(state);

      const seasonEndEvents = getPhaseEvents(state, 'season_end');
      expect(seasonEndEvents.length).toBeGreaterThan(0);

      // No events for free_agency yet
      const faEvents = getPhaseEvents(state, 'free_agency');
      expect(faEvents).toHaveLength(0);
    });

    it('should generate summary with correct counts', () => {
      let state = createOffSeasonState(2025);

      // Add some signings and releases
      state = addSigning(state, {
        playerId: 'p1',
        playerName: 'Player One',
        position: 'QB',
        teamId: 't1',
        contractYears: 2,
        contractValue: 10000000,
        signingType: 'free_agent',
        phase: 'free_agency',
      });
      state = addRelease(state, {
        playerId: 'p2',
        playerName: 'Player Two',
        position: 'RB',
        teamId: 't1',
        releaseType: 'cut',
        capSavings: 3000000,
        deadCap: 1000000,
        phase: 'contract_management',
      });

      const summary = getSummary(state);
      expect(summary.totalSignings).toBe(1);
      expect(summary.totalReleases).toBe(1);
    });
  });

  // =====================================================
  // 7. Full offseason simulation (simulateRemainingOffSeason)
  // =====================================================
  describe('full offseason auto-simulation', () => {
    it('should complete all 12 phases when simulating remaining', () => {
      const state = createOffSeasonState(2025);
      const completed = simulateRemainingOffSeason(state);

      expect(completed.isComplete).toBe(true);
      expect(completed.completedPhases).toHaveLength(12);
      expect(validateOffSeasonState(completed)).toBe(true);

      for (const phase of PHASE_ORDER) {
        expect(completed.completedPhases).toContain(phase);
      }
    });

    it('should generate events throughout full simulation', () => {
      const state = createOffSeasonState(2025);
      const completed = simulateRemainingOffSeason(state);

      // Should have events from task completions and phase transitions
      expect(completed.events.length).toBeGreaterThan(20);

      // Should have phase_complete events for each completed phase
      const phaseCompleteEvents = completed.events.filter(
        (e) => e.type === 'phase_complete'
      );
      expect(phaseCompleteEvents.length).toBeGreaterThanOrEqual(11);
    });

    it('should simulate from a mid-offseason state', () => {
      let state = createOffSeasonState(2025);

      // Manually progress through 3 phases
      for (let i = 0; i < 3; i++) {
        state = autoCompletePhase(state);
        state = advancePhase(state);
      }

      expect(state.completedPhases).toHaveLength(3);

      // Now simulate the remaining
      const completed = simulateRemainingOffSeason(state);
      expect(completed.isComplete).toBe(true);
      expect(completed.completedPhases).toHaveLength(12);
    });
  });

  // =====================================================
  // 8. Phase reset and skip mechanics
  // =====================================================
  describe('phase reset and skip mechanics', () => {
    it('skipToNextPhase should work when required tasks are complete', () => {
      let state = createOffSeasonState(2025);
      state = autoCompletePhase(state);

      const skipped = skipToNextPhase(state);
      expect(skipped.currentPhase).toBe('coaching_decisions');
    });

    it('skipToNextPhase should not skip when required tasks are incomplete', () => {
      const state = createOffSeasonState(2025);
      const skipped = skipToNextPhase(state);
      expect(skipped.currentPhase).toBe('season_end'); // unchanged
    });

    it('resetPhase should reset a completed phase', () => {
      let state = createOffSeasonState(2025);
      state = autoCompletePhase(state);
      state = advancePhase(state);

      // season_end should be completed
      expect(state.completedPhases).toContain('season_end');

      state = resetPhase(state, 'season_end');
      expect(state.completedPhases).not.toContain('season_end');
      expect(state.isComplete).toBe(false);
    });
  });

  // =====================================================
  // 9. State consistency across phase transitions
  // =====================================================
  describe('state consistency across phase transitions', () => {
    it('data accumulated across phases should persist', () => {
      let state = createOffSeasonState(2025);

      // Phase 1: Set recap
      state = setSeasonRecap(state, {
        year: 2025,
        teamRecord: { wins: 12, losses: 5, ties: 0 },
        divisionFinish: 1,
        madePlayoffs: true,
        playoffResult: 'Conference Championship Loss',
        draftPosition: 20,
        topPerformers: [],
        awards: [],
        seasonWriteUp: 'Great season.',
        playerImprovements: [],
      });
      state = autoCompletePhase(state);
      state = advancePhase(state);

      // Phase 2 (coaching decisions): season recap still there
      expect(state.seasonRecap).not.toBeNull();
      expect(state.seasonRecap!.teamRecord.wins).toBe(12);

      // Add a signing in phase 5 area
      state = addSigning(state, {
        playerId: 'p1',
        playerName: 'FA Player',
        position: 'DE',
        teamId: 't1',
        contractYears: 3,
        contractValue: 30000000,
        signingType: 'free_agent',
        phase: 'free_agency',
      });

      // Complete remaining phases
      const completed = simulateRemainingOffSeason(state);

      // All data should persist
      expect(completed.seasonRecap).not.toBeNull();
      expect(completed.signings).toHaveLength(1);
      expect(completed.isComplete).toBe(true);
    });

    it('events from all phases should be preserved in final state', () => {
      const state = createOffSeasonState(2025);
      const completed = simulateRemainingOffSeason(state);

      // Events should span multiple phases
      const phasesWithEvents = new Set(completed.events.map((e) => e.phase));
      expect(phasesWithEvents.size).toBeGreaterThanOrEqual(10);
    });
  });

  // =====================================================
  // 10. Validation
  // =====================================================
  describe('offseason state validation', () => {
    it('should validate a fresh state', () => {
      expect(validateOffSeasonState(createOffSeasonState(2025))).toBe(true);
    });

    it('should validate a completed state', () => {
      const completed = simulateRemainingOffSeason(createOffSeasonState(2025));
      expect(validateOffSeasonState(completed)).toBe(true);
    });

    it('should reject invalid year', () => {
      const state = createOffSeasonState(2025);
      const invalid = { ...state, year: 1999 };
      expect(validateOffSeasonState(invalid)).toBe(false);
    });

    it('should reject invalid phase', () => {
      const state = createOffSeasonState(2025);
      const invalid = { ...state, currentPhase: 'invalid_phase' as OffSeasonPhaseType };
      expect(validateOffSeasonState(invalid)).toBe(false);
    });

    it('should reject invalid phaseDay', () => {
      const state = createOffSeasonState(2025);
      const invalid = { ...state, phaseDay: 0 };
      expect(validateOffSeasonState(invalid)).toBe(false);
    });
  });

  // =====================================================
  // 11. Utility functions
  // =====================================================
  describe('utility functions', () => {
    it('getCurrentPhaseNumber should return correct number', () => {
      const state = createOffSeasonState(2025);
      expect(getCurrentPhaseNumber(state)).toBe(1);
    });

    it('getCurrentPhaseName should return correct name', () => {
      const state = createOffSeasonState(2025);
      expect(getCurrentPhaseName(state)).toBe('Season End');
    });

    it('getCurrentPhaseDescription should return non-empty string', () => {
      const state = createOffSeasonState(2025);
      const desc = getCurrentPhaseDescription(state);
      expect(desc.length).toBeGreaterThan(0);
    });

    it('getNextPhase should return coaching_decisions from season_end', () => {
      const state = createOffSeasonState(2025);
      expect(getNextPhase(state)).toBe('coaching_decisions');
    });

    it('getNextPhase should return null from season_start', () => {
      let state = createOffSeasonState(2025);
      // Move to last phase
      for (let i = 0; i < 11; i++) {
        state = autoCompletePhase(state);
        state = advancePhase(state);
      }
      expect(state.currentPhase).toBe('season_start');
      expect(getNextPhase(state)).toBeNull();
    });

    it('getCurrentPhaseTasks should return tasks for current phase', () => {
      const state = createOffSeasonState(2025);
      const tasks = getCurrentPhaseTasks(state);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('getOptionalTasks should return non-required tasks', () => {
      const state = createOffSeasonState(2025);
      const optional = getOptionalTasks(state);
      for (const task of optional) {
        expect(task.isRequired).toBe(false);
      }
    });
  });
});
