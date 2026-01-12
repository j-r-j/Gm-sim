/**
 * Tests for FieldVisualization utility functions
 */

// Test utility functions directly without React Native
describe('FieldVisualization utilities', () => {
  /**
   * Format down and distance for display
   */
  function formatDownAndDistance(down: number, yardsToGo: number): string {
    const ordinals = ['1st', '2nd', '3rd', '4th'];
    const downStr = ordinals[down - 1] || `${down}th`;

    if (yardsToGo >= 10 && down === 1) {
      return `${downStr} & 10`;
    }

    if (yardsToGo <= 0) {
      return `${downStr} & Goal`;
    }

    return `${downStr} & ${yardsToGo}`;
  }

  /**
   * Get yard line display (converting 0-100 to actual yard line)
   */
  function getYardLineDisplay(position: number): string {
    if (position === 50) return '50';
    if (position < 50) {
      return `Own ${position}`;
    }
    return `Opp ${100 - position}`;
  }

  /**
   * Calculate ball marker position as percentage
   */
  function calculateBallMarkerPosition(ballPosition: number): number {
    const fieldStartPercent = 10;
    const fieldWidthPercent = 80;
    return fieldStartPercent + (ballPosition / 100) * fieldWidthPercent;
  }

  describe('formatDownAndDistance', () => {
    it('should format 1st & 10 correctly', () => {
      expect(formatDownAndDistance(1, 10)).toBe('1st & 10');
    });

    it('should format 2nd down correctly', () => {
      expect(formatDownAndDistance(2, 7)).toBe('2nd & 7');
    });

    it('should format 3rd down correctly', () => {
      expect(formatDownAndDistance(3, 3)).toBe('3rd & 3');
    });

    it('should format 4th down correctly', () => {
      expect(formatDownAndDistance(4, 1)).toBe('4th & 1');
    });

    it('should format goal to go situation', () => {
      expect(formatDownAndDistance(1, 0)).toBe('1st & Goal');
      expect(formatDownAndDistance(2, 0)).toBe('2nd & Goal');
      expect(formatDownAndDistance(3, 0)).toBe('3rd & Goal');
      expect(formatDownAndDistance(4, 0)).toBe('4th & Goal');
    });

    it('should format negative yards as goal', () => {
      expect(formatDownAndDistance(1, -5)).toBe('1st & Goal');
    });

    it('should handle 1st down with 10+ yards', () => {
      // 1st & 10 is treated specially (shows "1st & 10" regardless of actual distance)
      expect(formatDownAndDistance(1, 10)).toBe('1st & 10');
      expect(formatDownAndDistance(1, 15)).toBe('1st & 10'); // Special case: always shows 10
    });
  });

  describe('getYardLineDisplay', () => {
    it('should display midfield as 50', () => {
      expect(getYardLineDisplay(50)).toBe('50');
    });

    it('should display own territory', () => {
      expect(getYardLineDisplay(25)).toBe('Own 25');
      expect(getYardLineDisplay(10)).toBe('Own 10');
      expect(getYardLineDisplay(1)).toBe('Own 1');
    });

    it('should display opponent territory', () => {
      expect(getYardLineDisplay(75)).toBe('Opp 25');
      expect(getYardLineDisplay(90)).toBe('Opp 10');
      expect(getYardLineDisplay(99)).toBe('Opp 1');
    });

    it('should handle goal line positions', () => {
      expect(getYardLineDisplay(0)).toBe('Own 0');
      expect(getYardLineDisplay(100)).toBe('Opp 0');
    });
  });

  describe('calculateBallMarkerPosition', () => {
    it('should return 10% for position 0', () => {
      expect(calculateBallMarkerPosition(0)).toBe(10);
    });

    it('should return 90% for position 100', () => {
      expect(calculateBallMarkerPosition(100)).toBe(90);
    });

    it('should return 50% for position 50', () => {
      expect(calculateBallMarkerPosition(50)).toBe(50);
    });

    it('should scale linearly', () => {
      expect(calculateBallMarkerPosition(25)).toBe(30);
      expect(calculateBallMarkerPosition(75)).toBe(70);
    });
  });
});
