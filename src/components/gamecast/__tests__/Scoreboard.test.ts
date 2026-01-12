/**
 * Tests for Scoreboard utility functions
 */

describe('Scoreboard utilities', () => {
  /**
   * Format time remaining as MM:SS
   */
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format quarter display
   */
  function formatQuarter(quarter: number | 'OT'): string {
    if (quarter === 'OT') return 'OT';
    if (quarter > 4) return `OT${quarter - 4}`;
    return `Q${quarter}`;
  }

  describe('formatTime', () => {
    it('should format full quarter time', () => {
      expect(formatTime(900)).toBe('15:00');
    });

    it('should format zero time', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(61)).toBe('1:01');
      expect(formatTime(60)).toBe('1:00');
    });

    it('should format arbitrary times correctly', () => {
      expect(formatTime(425)).toBe('7:05');
      expect(formatTime(120)).toBe('2:00');
      expect(formatTime(59)).toBe('0:59');
      expect(formatTime(5)).toBe('0:05');
    });

    it('should handle times over 15 minutes', () => {
      expect(formatTime(1000)).toBe('16:40');
    });
  });

  describe('formatQuarter', () => {
    it('should format regular quarters', () => {
      expect(formatQuarter(1)).toBe('Q1');
      expect(formatQuarter(2)).toBe('Q2');
      expect(formatQuarter(3)).toBe('Q3');
      expect(formatQuarter(4)).toBe('Q4');
    });

    it('should format OT string', () => {
      expect(formatQuarter('OT')).toBe('OT');
    });

    it('should format overtime periods', () => {
      expect(formatQuarter(5)).toBe('OT1');
      expect(formatQuarter(6)).toBe('OT2');
      expect(formatQuarter(7)).toBe('OT3');
    });
  });

  describe('score comparison', () => {
    function determineWinningTeam(
      homeScore: number,
      awayScore: number
    ): 'home' | 'away' | 'tie' {
      if (homeScore > awayScore) return 'home';
      if (awayScore > homeScore) return 'away';
      return 'tie';
    }

    it('should identify home team winning', () => {
      expect(determineWinningTeam(21, 14)).toBe('home');
      expect(determineWinningTeam(1, 0)).toBe('home');
    });

    it('should identify away team winning', () => {
      expect(determineWinningTeam(14, 21)).toBe('away');
      expect(determineWinningTeam(0, 1)).toBe('away');
    });

    it('should identify tie', () => {
      expect(determineWinningTeam(17, 17)).toBe('tie');
      expect(determineWinningTeam(0, 0)).toBe('tie');
    });
  });

  describe('timeout tracking', () => {
    function validateTimeouts(remaining: number): boolean {
      return remaining >= 0 && remaining <= 3;
    }

    it('should validate valid timeout counts', () => {
      expect(validateTimeouts(0)).toBe(true);
      expect(validateTimeouts(1)).toBe(true);
      expect(validateTimeouts(2)).toBe(true);
      expect(validateTimeouts(3)).toBe(true);
    });

    it('should reject invalid timeout counts', () => {
      expect(validateTimeouts(-1)).toBe(false);
      expect(validateTimeouts(4)).toBe(false);
    });
  });
});
