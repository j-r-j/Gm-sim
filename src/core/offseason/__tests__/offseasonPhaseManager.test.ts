/**
 * Off-Season Phase Manager Tests
 * Tests for the 12-phase off-season flow system
 */

import {
  // Types
  OffSeasonPhaseType,
  OffSeasonState,

  // Constants
  PHASE_ORDER,
  PHASE_NUMBERS,
  PHASE_NAMES,
  PHASE_DESCRIPTIONS,

  // State creation
  createOffSeasonState,

  // Phase info
  getCurrentPhaseNumber,
  getCurrentPhaseName,
  getCurrentPhaseDescription,

  // Task management
  getCurrentPhaseTasks,
  getRequiredTasks,
  getOptionalTasks,
  areRequiredTasksComplete,
  completeTask,

  // Phase transitions
  canAdvancePhase,
  getNextPhase,
  advancePhase,
  advanceDay,
  skipToNextPhase,
  autoCompletePhase,
  simulateRemainingOffSeason,
  resetPhase,

  // State updates
  setSeasonRecap,
  setDraftOrder,
  addRosterChange,
  addSigning,
  addRelease,
  addEvent,

  // Queries
  getRecentEvents,
  getPhaseEvents,
  getProgress,
  getSummary,

  // Validation
  validateOffSeasonState,
} from '../OffSeasonPhaseManager';

describe('OffSeasonPhaseManager', () => {
  let state: OffSeasonState;

  beforeEach(() => {
    state = createOffSeasonState(2024);
  });

  describe('Constants', () => {
    it('should have 12 phases in order', () => {
      expect(PHASE_ORDER).toHaveLength(12);
      expect(PHASE_ORDER[0]).toBe('season_end');
      expect(PHASE_ORDER[11]).toBe('season_start');
    });

    it('should have correct phase numbers', () => {
      expect(PHASE_NUMBERS.season_end).toBe(1);
      expect(PHASE_NUMBERS.draft).toBe(6);
      expect(PHASE_NUMBERS.season_start).toBe(12);
    });

    it('should have names for all phases', () => {
      for (const phase of PHASE_ORDER) {
        expect(PHASE_NAMES[phase]).toBeDefined();
        expect(PHASE_NAMES[phase].length).toBeGreaterThan(0);
      }
    });

    it('should have descriptions for all phases', () => {
      for (const phase of PHASE_ORDER) {
        expect(PHASE_DESCRIPTIONS[phase]).toBeDefined();
        expect(PHASE_DESCRIPTIONS[phase].length).toBeGreaterThan(0);
      }
    });
  });

  describe('createOffSeasonState', () => {
    it('should create initial state with correct year', () => {
      expect(state.year).toBe(2024);
    });

    it('should start at season_end phase', () => {
      expect(state.currentPhase).toBe('season_end');
    });

    it('should start on day 1', () => {
      expect(state.phaseDay).toBe(1);
    });

    it('should have empty events and changes', () => {
      expect(state.events).toHaveLength(0);
      expect(state.completedPhases).toHaveLength(0);
      expect(state.rosterChanges).toHaveLength(0);
      expect(state.signings).toHaveLength(0);
      expect(state.releases).toHaveLength(0);
    });

    it('should not be complete', () => {
      expect(state.isComplete).toBe(false);
    });

    it('should have tasks for all phases', () => {
      for (const phase of PHASE_ORDER) {
        expect(state.phaseTasks.get(phase)).toBeDefined();
      }
    });
  });

  describe('Phase Info Functions', () => {
    it('should return correct phase number', () => {
      expect(getCurrentPhaseNumber(state)).toBe(1);
    });

    it('should return correct phase name', () => {
      expect(getCurrentPhaseName(state)).toBe('Season End');
    });

    it('should return correct phase description', () => {
      expect(getCurrentPhaseDescription(state)).toContain('Review');
    });
  });

  describe('Task Management', () => {
    it('should get current phase tasks', () => {
      const tasks = getCurrentPhaseTasks(state);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should get required tasks', () => {
      const required = getRequiredTasks(state);
      expect(required.length).toBeGreaterThan(0);
      expect(required.every((t) => t.isRequired)).toBe(true);
    });

    it('should get optional tasks', () => {
      const optional = getOptionalTasks(state);
      expect(optional.every((t) => !t.isRequired)).toBe(true);
    });

    it('should initially have incomplete required tasks', () => {
      expect(areRequiredTasksComplete(state)).toBe(false);
    });

    it('should mark task as complete', () => {
      const tasks = getCurrentPhaseTasks(state);
      const taskId = tasks[0].id;

      const newState = completeTask(state, taskId);
      const updatedTasks = getCurrentPhaseTasks(newState);
      const completedTask = updatedTasks.find((t) => t.id === taskId);

      expect(completedTask?.isComplete).toBe(true);
    });

    it('should not complete non-existent task', () => {
      const newState = completeTask(state, 'fake-task-id');
      expect(newState).toEqual(state);
    });

    it('should add event when task is completed', () => {
      const tasks = getCurrentPhaseTasks(state);
      const taskId = tasks[0].id;

      const newState = completeTask(state, taskId);
      expect(newState.events.length).toBeGreaterThan(0);
      expect(newState.events[0].type).toBe('task_complete');
    });
  });

  describe('Phase Transitions', () => {
    it('should not advance phase with incomplete required tasks', () => {
      expect(canAdvancePhase(state)).toBe(false);
    });

    it('should allow advance after completing required tasks', () => {
      let newState = autoCompletePhase(state);
      expect(canAdvancePhase(newState)).toBe(true);
    });

    it('should get next phase correctly', () => {
      expect(getNextPhase(state)).toBe('coaching_decisions');
    });

    it('should return null for last phase next', () => {
      let newState = { ...state, currentPhase: 'season_start' as OffSeasonPhaseType };
      expect(getNextPhase(newState)).toBeNull();
    });

    it('should advance to next phase', () => {
      let newState = autoCompletePhase(state);
      newState = advancePhase(newState);

      expect(newState.currentPhase).toBe('coaching_decisions');
      expect(newState.completedPhases).toContain('season_end');
      expect(newState.phaseDay).toBe(1);
    });

    it('should add phase events when advancing', () => {
      let newState = autoCompletePhase(state);
      newState = advancePhase(newState);

      const phaseEvents = newState.events.filter(
        (e) => e.type === 'phase_complete' || e.type === 'phase_start'
      );
      expect(phaseEvents.length).toBeGreaterThan(0);
    });

    it('should mark complete when advancing from last phase', () => {
      let newState = state;
      // Go through all phases
      for (let i = 0; i < 12; i++) {
        newState = autoCompletePhase(newState);
        newState = advancePhase(newState);
      }

      expect(newState.isComplete).toBe(true);
      expect(newState.completedPhases).toHaveLength(12);
    });

    it('should advance day within phase', () => {
      const newState = advanceDay(state);
      expect(newState.phaseDay).toBe(2);
    });
  });

  describe('Skip and Auto Functions', () => {
    it('should skip to next phase after completing required tasks', () => {
      let newState = autoCompletePhase(state);
      newState = skipToNextPhase(newState);

      expect(newState.currentPhase).toBe('coaching_decisions');
    });

    it('should not skip without completing required tasks', () => {
      const newState = skipToNextPhase(state);
      expect(newState.currentPhase).toBe('season_end');
    });

    it('should auto-complete required tasks', () => {
      const newState = autoCompletePhase(state);
      expect(areRequiredTasksComplete(newState)).toBe(true);
    });

    it('should simulate remaining off-season', () => {
      const finalState = simulateRemainingOffSeason(state);

      expect(finalState.isComplete).toBe(true);
      expect(finalState.completedPhases).toHaveLength(12);
    });
  });

  describe('State Updates', () => {
    it('should set season recap', () => {
      const recap = {
        year: 2024,
        teamRecord: { wins: 10, losses: 7, ties: 0 },
        divisionFinish: 2,
        madePlayoffs: true,
        playoffResult: 'Lost in Divisional Round',
        draftPosition: 20,
        topPerformers: [],
        awards: [],
      };

      const newState = setSeasonRecap(state, recap);
      expect(newState.seasonRecap).toEqual(recap);
    });

    it('should set draft order', () => {
      const order = ['team1', 'team2', 'team3'];
      const newState = setDraftOrder(state, order);
      expect(newState.draftOrder).toEqual(order);
    });

    it('should add roster change', () => {
      const newState = addRosterChange(state, {
        type: 'signing',
        playerId: 'player1',
        playerName: 'Test Player',
        position: 'WR',
        teamId: 'team1',
        phase: 'free_agency',
        details: {},
      });

      expect(newState.rosterChanges).toHaveLength(1);
      expect(newState.events.length).toBeGreaterThan(0);
    });

    it('should add signing', () => {
      const newState = addSigning(state, {
        playerId: 'player1',
        playerName: 'Test Player',
        position: 'QB',
        teamId: 'team1',
        contractYears: 4,
        contractValue: 100000,
        signingType: 'free_agent',
        phase: 'free_agency',
      });

      expect(newState.signings).toHaveLength(1);
      expect(newState.signings[0].playerName).toBe('Test Player');
    });

    it('should add release', () => {
      const newState = addRelease(state, {
        playerId: 'player1',
        playerName: 'Released Player',
        position: 'RB',
        teamId: 'team1',
        releaseType: 'cut',
        capSavings: 5000,
        deadCap: 1000,
        phase: 'contract_management',
      });

      expect(newState.releases).toHaveLength(1);
      expect(newState.releases[0].capSavings).toBe(5000);
    });

    it('should add custom event', () => {
      const newState = addEvent(state, 'award', 'Player won MVP', { playerId: 'player1' });

      expect(newState.events).toHaveLength(1);
      expect(newState.events[0].type).toBe('award');
      expect(newState.events[0].description).toBe('Player won MVP');
    });
  });

  describe('Query Functions', () => {
    it('should get recent events', () => {
      let newState = addEvent(state, 'signing', 'Signed player 1', {});
      newState = addEvent(newState, 'signing', 'Signed player 2', {});
      newState = addEvent(newState, 'signing', 'Signed player 3', {});

      const recent = getRecentEvents(newState, 2);
      expect(recent).toHaveLength(2);
      // Most recent first
      expect(recent[0].description).toBe('Signed player 3');
    });

    it('should get events by phase', () => {
      let newState = addEvent(state, 'signing', 'Signing event', {});
      newState = autoCompletePhase(newState);
      newState = advancePhase(newState);
      newState = addEvent(newState, 'coaching_change', 'Coaching event', {});

      const seasonEndEvents = getPhaseEvents(newState, 'season_end');
      expect(seasonEndEvents.some((e) => e.description === 'Signing event')).toBe(true);

      const coachingEvents = getPhaseEvents(newState, 'coaching_decisions');
      expect(coachingEvents.some((e) => e.description === 'Coaching event')).toBe(true);
    });

    it('should get progress summary', () => {
      const progress = getProgress(state);

      expect(progress.currentPhase).toBe('season_end');
      expect(progress.currentPhaseNumber).toBe(1);
      expect(progress.completedPhases).toBe(0);
      expect(progress.totalPhases).toBe(12);
      expect(progress.percentComplete).toBe(0);
      expect(progress.isComplete).toBe(false);
    });

    it('should update progress as phases complete', () => {
      let newState = autoCompletePhase(state);
      newState = advancePhase(newState);

      const progress = getProgress(newState);
      expect(progress.completedPhases).toBe(1);
      expect(progress.percentComplete).toBeGreaterThan(0);
    });

    it('should get summary', () => {
      let newState = addSigning(state, {
        playerId: 'p1',
        playerName: 'Player',
        position: 'QB',
        teamId: 't1',
        contractYears: 1,
        contractValue: 1000,
        signingType: 'free_agent',
        phase: 'free_agency',
      });

      const summary = getSummary(newState);
      expect(summary.year).toBe(2024);
      expect(summary.totalSignings).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate correct state', () => {
      expect(validateOffSeasonState(state)).toBe(true);
    });

    it('should invalidate state with bad year', () => {
      const badState = { ...state, year: 1500 };
      expect(validateOffSeasonState(badState)).toBe(false);
    });

    it('should invalidate state with bad phase', () => {
      const badState = { ...state, currentPhase: 'invalid_phase' as OffSeasonPhaseType };
      expect(validateOffSeasonState(badState)).toBe(false);
    });

    it('should invalidate state with bad phaseDay', () => {
      const badState = { ...state, phaseDay: 0 };
      expect(validateOffSeasonState(badState)).toBe(false);
    });
  });

  describe('Reset Phase', () => {
    it('should reset a phase', () => {
      let newState = autoCompletePhase(state);
      newState = advancePhase(newState);

      // Reset season_end
      const resetState = resetPhase(newState, 'season_end');

      expect(resetState.completedPhases).not.toContain('season_end');
      expect(resetState.isComplete).toBe(false);

      const tasks = resetState.phaseTasks.get('season_end');
      expect(tasks?.tasks.every((t) => !t.isComplete)).toBe(true);
    });
  });

  describe('Full Off-Season Flow', () => {
    it('should complete all 12 phases in order', () => {
      let currentState = state;
      const completedPhases: OffSeasonPhaseType[] = [];

      for (let i = 0; i < 12; i++) {
        expect(currentState.currentPhase).toBe(PHASE_ORDER[i]);

        currentState = autoCompletePhase(currentState);
        expect(canAdvancePhase(currentState)).toBe(true);

        completedPhases.push(currentState.currentPhase);
        currentState = advancePhase(currentState);
      }

      expect(currentState.isComplete).toBe(true);
      expect(currentState.completedPhases).toHaveLength(12);

      // Verify all phases were completed
      for (const phase of PHASE_ORDER) {
        expect(currentState.completedPhases).toContain(phase);
      }
    });

    it('should track signings and releases through phases', () => {
      let currentState = state;

      // Simulate going through phases with some activity
      for (let i = 0; i < 12; i++) {
        currentState = autoCompletePhase(currentState);

        // Add a signing in free agency phase
        if (currentState.currentPhase === 'free_agency') {
          currentState = addSigning(currentState, {
            playerId: `fa-${i}`,
            playerName: `Free Agent ${i}`,
            position: 'WR',
            teamId: 'team1',
            contractYears: 2,
            contractValue: 5000,
            signingType: 'free_agent',
            phase: 'free_agency',
          });
        }

        // Add a release in contract management phase
        if (currentState.currentPhase === 'contract_management') {
          currentState = addRelease(currentState, {
            playerId: `cut-${i}`,
            playerName: `Cut Player ${i}`,
            position: 'RB',
            teamId: 'team1',
            releaseType: 'cut',
            capSavings: 3000,
            deadCap: 500,
            phase: 'contract_management',
          });
        }

        currentState = advancePhase(currentState);
      }

      expect(currentState.signings.length).toBeGreaterThan(0);
      expect(currentState.releases.length).toBeGreaterThan(0);
    });
  });
});
