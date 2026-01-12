/**
 * Patience Meter Manager Tests
 * Tests for patience tracking, trend analysis, and view model generation
 */

import {
  createPatienceMeterState,
  updatePatienceValue,
  startNewSeason,
  getCurrentSecurityLevel,
  calculateTrend,
  getTrendDescription,
  getWeeklyChange,
  getSeasonChange,
  getUrgencyLevel,
  isAtRisk,
  createPatienceViewModel,
  getImpactDescription,
  getDistanceToNextThreshold,
  getPointsToImprove,
  validatePatienceMeterState,
  calculateRecoveryModifier,
  calculateDeclineModifier,
  applyPersonalityModifiers,
  getPatienceSummary,
  syncWithOwner,
  createFromOwner,
  PatienceMeterState,
} from '../PatienceMeterManager';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('PatienceMeterManager', () => {
  describe('createPatienceMeterState', () => {
    it('should create initial state with correct values', () => {
      const state = createPatienceMeterState('owner-1', 60, 1, 1);

      expect(state.ownerId).toBe('owner-1');
      expect(state.currentValue).toBe(60);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].value).toBe(60);
      expect(state.history[0].eventDescription).toBe('Initial hire');
      expect(state.seasonStartValue).toBe(60);
      expect(state.lastWeekValue).toBe(60);
      expect(state.consecutiveDeclines).toBe(0);
      expect(state.consecutiveImprovements).toBe(0);
    });

    it('should clamp initial value to valid range', () => {
      const stateTooHigh = createPatienceMeterState('owner-1', 150);
      expect(stateTooHigh.currentValue).toBe(100);

      const stateTooLow = createPatienceMeterState('owner-1', -20);
      expect(stateTooLow.currentValue).toBe(0);
    });

    it('should use default value of 50 if not specified', () => {
      const state = createPatienceMeterState('owner-1');
      expect(state.currentValue).toBe(50);
    });
  });

  describe('updatePatienceValue', () => {
    it('should update value and add to history', () => {
      const state = createPatienceMeterState('owner-1', 50);
      const updated = updatePatienceValue(state, 10, 2, 1, 'Won big game');

      expect(updated.currentValue).toBe(60);
      expect(updated.history).toHaveLength(2);
      expect(updated.history[1].value).toBe(60);
      expect(updated.history[1].eventDescription).toBe('Won big game');
      expect(updated.lastWeekValue).toBe(50);
    });

    it('should track consecutive declines', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, -5, 2, 1, 'Loss');
      expect(state.consecutiveDeclines).toBe(1);
      expect(state.consecutiveImprovements).toBe(0);

      state = updatePatienceValue(state, -5, 3, 1, 'Another loss');
      expect(state.consecutiveDeclines).toBe(2);
    });

    it('should track consecutive improvements', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, 5, 2, 1, 'Win');
      expect(state.consecutiveImprovements).toBe(1);
      expect(state.consecutiveDeclines).toBe(0);

      state = updatePatienceValue(state, 5, 3, 1, 'Another win');
      expect(state.consecutiveImprovements).toBe(2);
    });

    it('should reset opposite counter on change direction', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, -5, 2, 1, 'Loss');
      state = updatePatienceValue(state, -5, 3, 1, 'Loss');
      expect(state.consecutiveDeclines).toBe(2);

      state = updatePatienceValue(state, 10, 4, 1, 'Win');
      expect(state.consecutiveDeclines).toBe(0);
      expect(state.consecutiveImprovements).toBe(1);
    });

    it('should clamp value to valid range', () => {
      const highState = createPatienceMeterState('owner-1', 95);
      const updatedHigh = updatePatienceValue(highState, 20, 2, 1, 'Big win');
      expect(updatedHigh.currentValue).toBe(100);

      const lowState = createPatienceMeterState('owner-1', 10);
      const updatedLow = updatePatienceValue(lowState, -20, 2, 1, 'Big loss');
      expect(updatedLow.currentValue).toBe(0);
    });
  });

  describe('startNewSeason', () => {
    it('should update seasonStartValue', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, 20, 18, 1, 'Great season');
      state = startNewSeason(state);

      expect(state.seasonStartValue).toBe(70);
      expect(state.currentValue).toBe(70);
    });
  });

  describe('getCurrentSecurityLevel', () => {
    it('should return correct security levels', () => {
      expect(getCurrentSecurityLevel({ currentValue: 85 } as PatienceMeterState)).toBe('secure');
      expect(getCurrentSecurityLevel({ currentValue: 70 } as PatienceMeterState)).toBe('secure');
      expect(getCurrentSecurityLevel({ currentValue: 55 } as PatienceMeterState)).toBe('stable');
      expect(getCurrentSecurityLevel({ currentValue: 50 } as PatienceMeterState)).toBe('stable');
      expect(getCurrentSecurityLevel({ currentValue: 40 } as PatienceMeterState)).toBe('warmSeat');
      expect(getCurrentSecurityLevel({ currentValue: 35 } as PatienceMeterState)).toBe('warmSeat');
      expect(getCurrentSecurityLevel({ currentValue: 25 } as PatienceMeterState)).toBe('hotSeat');
      expect(getCurrentSecurityLevel({ currentValue: 20 } as PatienceMeterState)).toBe('hotSeat');
      expect(getCurrentSecurityLevel({ currentValue: 15 } as PatienceMeterState)).toBe('fired');
      expect(getCurrentSecurityLevel({ currentValue: 0 } as PatienceMeterState)).toBe('fired');
    });
  });

  describe('calculateTrend', () => {
    it('should return stable for insufficient history', () => {
      const state = createPatienceMeterState('owner-1', 50);
      expect(calculateTrend(state)).toBe('stable');
    });

    it('should detect improving trend', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, 3, 2, 1, 'Win');
      state = updatePatienceValue(state, 3, 3, 1, 'Win');
      state = updatePatienceValue(state, 3, 4, 1, 'Win');

      expect(calculateTrend(state)).toBe('improving');
    });

    it('should detect declining trend', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, -3, 2, 1, 'Loss');
      state = updatePatienceValue(state, -3, 3, 1, 'Loss');
      state = updatePatienceValue(state, -3, 4, 1, 'Loss');

      expect(calculateTrend(state)).toBe('declining');
    });

    it('should return stable for small changes', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, 1, 2, 1, 'Minor');
      state = updatePatienceValue(state, -1, 3, 1, 'Minor');
      state = updatePatienceValue(state, 1, 4, 1, 'Minor');

      expect(calculateTrend(state)).toBe('stable');
    });
  });

  describe('getTrendDescription', () => {
    it('should return appropriate description for improving hot seat', () => {
      const state = createPatienceMeterState('owner-1', 25);
      const description = getTrendDescription('improving', state);
      expect(description).toBe('Owner confidence is recovering');
    });

    it('should return appropriate description for declining secure', () => {
      const state = createPatienceMeterState('owner-1', 80);
      const description = getTrendDescription('declining', state);
      expect(description).toBe('Recent results have raised some concerns');
    });

    it('should return appropriate description for stable positions', () => {
      const secureState = createPatienceMeterState('owner-1', 85);
      expect(getTrendDescription('stable', secureState)).toBe('Your position remains strong');

      const hotSeatState = createPatienceMeterState('owner-1', 25);
      expect(getTrendDescription('stable', hotSeatState)).toBe(
        'Your job security is in serious jeopardy'
      );
    });
  });

  describe('getWeeklyChange', () => {
    it('should detect improved', () => {
      const state = {
        currentValue: 55,
        lastWeekValue: 50,
      } as PatienceMeterState;
      expect(getWeeklyChange(state)).toBe('improved');
    });

    it('should detect worsened', () => {
      const state = {
        currentValue: 45,
        lastWeekValue: 50,
      } as PatienceMeterState;
      expect(getWeeklyChange(state)).toBe('worsened');
    });

    it('should detect unchanged for small changes', () => {
      const state = {
        currentValue: 51,
        lastWeekValue: 50,
      } as PatienceMeterState;
      expect(getWeeklyChange(state)).toBe('unchanged');
    });
  });

  describe('getSeasonChange', () => {
    it('should detect much better', () => {
      const state = {
        currentValue: 75,
        seasonStartValue: 50,
      } as PatienceMeterState;
      expect(getSeasonChange(state)).toBe('much better');
    });

    it('should detect much worse', () => {
      const state = {
        currentValue: 30,
        seasonStartValue: 55,
      } as PatienceMeterState;
      expect(getSeasonChange(state)).toBe('much worse');
    });

    it('should detect same for small changes', () => {
      const state = {
        currentValue: 52,
        seasonStartValue: 50,
      } as PatienceMeterState;
      expect(getSeasonChange(state)).toBe('same');
    });
  });

  describe('getUrgencyLevel', () => {
    it('should return none for secure position', () => {
      const state = createPatienceMeterState('owner-1', 85);
      expect(getUrgencyLevel(state)).toBe('none');
    });

    it('should return critical for declining hot seat', () => {
      let state = createPatienceMeterState('owner-1', 25);
      // Create declining trend
      state = updatePatienceValue(state, -2, 2, 1, 'Loss');
      state = updatePatienceValue(state, -2, 3, 1, 'Loss');
      state = updatePatienceValue(state, -2, 4, 1, 'Loss');

      expect(getUrgencyLevel(state)).toBe('critical');
    });

    it('should return high for stable hot seat', () => {
      const state = createPatienceMeterState('owner-1', 25);
      expect(getUrgencyLevel(state)).toBe('high');
    });
  });

  describe('isAtRisk', () => {
    it('should return true for hot seat', () => {
      const state = createPatienceMeterState('owner-1', 25);
      expect(isAtRisk(state)).toBe(true);
    });

    it('should return true for fired level', () => {
      const state = createPatienceMeterState('owner-1', 10);
      expect(isAtRisk(state)).toBe(true);
    });

    it('should return false for warm seat and above', () => {
      expect(isAtRisk(createPatienceMeterState('owner-1', 40))).toBe(false);
      expect(isAtRisk(createPatienceMeterState('owner-1', 60))).toBe(false);
      expect(isAtRisk(createPatienceMeterState('owner-1', 80))).toBe(false);
    });
  });

  describe('createPatienceViewModel', () => {
    it('should create view model with correct values', () => {
      const state = createPatienceMeterState('owner-1', 55);
      const viewModel = createPatienceViewModel(state);

      expect(viewModel.status).toBe('stable');
      expect(viewModel.trend).toBe('stable');
      expect(viewModel.isAtRisk).toBe(false);
      expect(viewModel.urgencyLevel).toBe('none');
    });

    it('should not expose raw numbers', () => {
      const state = createPatienceMeterState('owner-1', 55);
      const viewModel = createPatienceViewModel(state);

      // Check that no raw numbers are exposed
      expect(typeof viewModel.status).toBe('string');
      expect(typeof viewModel.trend).toBe('string');
      expect(typeof viewModel.trendDescription).toBe('string');
      expect(typeof viewModel.weeklyChange).toBe('string');
      expect(typeof viewModel.seasonChange).toBe('string');
    });
  });

  describe('getImpactDescription', () => {
    it('should return correct descriptions for various impacts', () => {
      expect(getImpactDescription(30)).toBe('major boost');
      expect(getImpactDescription(20)).toBe('significant boost');
      expect(getImpactDescription(10)).toBe('moderate boost');
      expect(getImpactDescription(4)).toBe('slight boost');
      expect(getImpactDescription(0)).toBe('no change');
      expect(getImpactDescription(-4)).toBe('slight concern');
      expect(getImpactDescription(-10)).toBe('moderate concern');
      expect(getImpactDescription(-20)).toBe('significant concern');
      expect(getImpactDescription(-30)).toBe('major concern');
    });
  });

  describe('getDistanceToNextThreshold', () => {
    it('should return distance for secure level', () => {
      const state = createPatienceMeterState('owner-1', 75);
      expect(getDistanceToNextThreshold(state)).toBe(5); // 75 - 70
    });

    it('should return null for fired level', () => {
      const state = createPatienceMeterState('owner-1', 10);
      expect(getDistanceToNextThreshold(state)).toBeNull();
    });
  });

  describe('getPointsToImprove', () => {
    it('should return points needed to reach next level', () => {
      const state = createPatienceMeterState('owner-1', 45); // warmSeat
      expect(getPointsToImprove(state)).toBe(5); // Need 50 for stable
    });

    it('should return null for secure level', () => {
      const state = createPatienceMeterState('owner-1', 85);
      expect(getPointsToImprove(state)).toBeNull();
    });
  });

  describe('validatePatienceMeterState', () => {
    it('should return true for valid state', () => {
      const state = createPatienceMeterState('owner-1', 50);
      expect(validatePatienceMeterState(state)).toBe(true);
    });

    it('should return false for invalid state', () => {
      const invalidState = {
        ownerId: '',
        currentValue: 50,
        history: [],
        seasonStartValue: 50,
        lastWeekValue: 50,
        consecutiveDeclines: 0,
        consecutiveImprovements: 0,
      };
      expect(validatePatienceMeterState(invalidState)).toBe(false);
    });

    it('should return false for out of range values', () => {
      const state = createPatienceMeterState('owner-1', 50);
      const invalidState = { ...state, currentValue: 150 };
      expect(validatePatienceMeterState(invalidState)).toBe(false);
    });
  });

  describe('calculateRecoveryModifier and calculateDeclineModifier', () => {
    it('should give patient owners higher recovery', () => {
      expect(calculateRecoveryModifier(80)).toBeGreaterThan(calculateRecoveryModifier(20));
    });

    it('should give impatient owners higher decline', () => {
      expect(calculateDeclineModifier(20)).toBeGreaterThan(calculateDeclineModifier(80));
    });
  });

  describe('applyPersonalityModifiers', () => {
    it('should increase positive changes for patient owners', () => {
      const baseChange = 10;
      const patientResult = applyPersonalityModifiers(baseChange, 80);
      const impatientResult = applyPersonalityModifiers(baseChange, 20);

      expect(patientResult).toBeGreaterThan(impatientResult);
    });

    it('should decrease negative changes for patient owners', () => {
      const baseChange = -10;
      const patientResult = applyPersonalityModifiers(baseChange, 80);
      const impatientResult = applyPersonalityModifiers(baseChange, 20);

      // Patient owner loses less (less negative)
      expect(patientResult).toBeGreaterThan(impatientResult);
    });
  });

  describe('getPatienceSummary', () => {
    it('should return correct summary statistics', () => {
      let state = createPatienceMeterState('owner-1', 50);
      state = updatePatienceValue(state, 10, 2, 1, 'Win');
      state = updatePatienceValue(state, -5, 3, 1, 'Loss');
      state = updatePatienceValue(state, 15, 4, 1, 'Big win');

      const summary = getPatienceSummary(state);

      expect(summary.totalChanges).toBe(3);
      expect(summary.positiveChanges).toBe(2);
      expect(summary.negativeChanges).toBe(1);
      expect(summary.biggestGain).toBe(15);
      expect(summary.biggestLoss).toBe(-5);
    });

    it('should return zeros for no history', () => {
      const state = createPatienceMeterState('owner-1', 50);
      const summary = getPatienceSummary(state);

      expect(summary.totalChanges).toBe(0);
    });
  });

  describe('syncWithOwner', () => {
    it('should update owner patience meter', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const state = createPatienceMeterState('owner-1', 75);

      const updatedOwner = syncWithOwner(state, owner);

      expect(updatedOwner.patienceMeter).toBe(75);
    });
  });

  describe('createFromOwner', () => {
    it('should create state from owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.patienceMeter = 65;

      const state = createFromOwner(owner, 5, 2);

      expect(state.ownerId).toBe('owner-1');
      expect(state.currentValue).toBe(65);
      expect(state.history[0].week).toBe(5);
      expect(state.history[0].season).toBe(2);
    });
  });
});
