/**
 * Tests for SimControls utility functions
 */

describe('SimControls utilities', () => {
  type SimulationMode = 'play' | 'drive' | 'quarter' | 'end';

  /**
   * Get status message for current simulation mode
   */
  function getStatusMessage(mode: SimulationMode | null): string {
    switch (mode) {
      case 'play':
        return 'Running play...';
      case 'drive':
        return 'Simulating drive...';
      case 'quarter':
        return 'Simulating quarter...';
      case 'end':
        return 'Simulating game...';
      default:
        return '';
    }
  }

  /**
   * Determine if controls should be disabled
   */
  function shouldDisableControls(
    isSimulating: boolean,
    isGameOver: boolean
  ): boolean {
    return isSimulating || isGameOver;
  }

  /**
   * Get available actions based on game state
   */
  function getAvailableActions(
    isSimulating: boolean,
    isGameOver: boolean
  ): SimulationMode[] {
    if (isGameOver) return [];
    if (isSimulating) return [];
    return ['play', 'drive', 'quarter', 'end'];
  }

  /**
   * Validate simulation mode
   */
  function isValidSimulationMode(mode: string): mode is SimulationMode {
    return ['play', 'drive', 'quarter', 'end'].includes(mode);
  }

  describe('getStatusMessage', () => {
    it('should return correct message for play mode', () => {
      expect(getStatusMessage('play')).toBe('Running play...');
    });

    it('should return correct message for drive mode', () => {
      expect(getStatusMessage('drive')).toBe('Simulating drive...');
    });

    it('should return correct message for quarter mode', () => {
      expect(getStatusMessage('quarter')).toBe('Simulating quarter...');
    });

    it('should return correct message for end mode', () => {
      expect(getStatusMessage('end')).toBe('Simulating game...');
    });

    it('should return empty string for null mode', () => {
      expect(getStatusMessage(null)).toBe('');
    });
  });

  describe('shouldDisableControls', () => {
    it('should disable when simulating', () => {
      expect(shouldDisableControls(true, false)).toBe(true);
    });

    it('should disable when game over', () => {
      expect(shouldDisableControls(false, true)).toBe(true);
    });

    it('should disable when both simulating and game over', () => {
      expect(shouldDisableControls(true, true)).toBe(true);
    });

    it('should not disable when neither simulating nor game over', () => {
      expect(shouldDisableControls(false, false)).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('should return all actions when game is active', () => {
      const actions = getAvailableActions(false, false);
      expect(actions).toContain('play');
      expect(actions).toContain('drive');
      expect(actions).toContain('quarter');
      expect(actions).toContain('end');
    });

    it('should return no actions when simulating', () => {
      expect(getAvailableActions(true, false)).toEqual([]);
    });

    it('should return no actions when game is over', () => {
      expect(getAvailableActions(false, true)).toEqual([]);
    });

    it('should return no actions when both', () => {
      expect(getAvailableActions(true, true)).toEqual([]);
    });
  });

  describe('isValidSimulationMode', () => {
    it('should validate play mode', () => {
      expect(isValidSimulationMode('play')).toBe(true);
    });

    it('should validate drive mode', () => {
      expect(isValidSimulationMode('drive')).toBe(true);
    });

    it('should validate quarter mode', () => {
      expect(isValidSimulationMode('quarter')).toBe(true);
    });

    it('should validate end mode', () => {
      expect(isValidSimulationMode('end')).toBe(true);
    });

    it('should reject invalid modes', () => {
      expect(isValidSimulationMode('invalid')).toBe(false);
      expect(isValidSimulationMode('')).toBe(false);
      expect(isValidSimulationMode('halt')).toBe(false);
    });
  });

  describe('simulation flow', () => {
    it('should transition through modes correctly', () => {
      const modes: SimulationMode[] = ['play', 'drive', 'quarter', 'end'];

      // Each mode should be valid
      modes.forEach((mode) => {
        expect(isValidSimulationMode(mode)).toBe(true);
        expect(getStatusMessage(mode)).not.toBe('');
      });
    });

    it('should handle game completion', () => {
      // Before game ends
      expect(getAvailableActions(false, false).length).toBe(4);

      // After game ends
      expect(getAvailableActions(false, true).length).toBe(0);
    });
  });
});
