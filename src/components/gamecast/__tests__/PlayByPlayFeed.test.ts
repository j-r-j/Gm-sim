/**
 * Tests for PlayByPlayFeed utility functions
 */

describe('PlayByPlayFeed utilities', () => {
  interface PlayItem {
    id: string;
    quarter: number;
    time: string;
    offenseTeam: string;
    description: string;
    isScoring?: boolean;
    isTurnover?: boolean;
    isBigPlay?: boolean;
    score?: string;
  }

  /**
   * Format quarter for display
   */
  function formatQuarter(quarter: number): string {
    if (quarter > 4) return `OT${quarter - 4}`;
    return `Q${quarter}`;
  }

  /**
   * Get play type classification
   */
  function getPlayType(
    play: PlayItem
  ): 'scoring' | 'turnover' | 'bigPlay' | 'regular' {
    if (play.isScoring) return 'scoring';
    if (play.isTurnover) return 'turnover';
    if (play.isBigPlay) return 'bigPlay';
    return 'regular';
  }

  /**
   * Group plays by quarter
   */
  function groupPlaysByQuarter(
    plays: PlayItem[]
  ): Map<number, PlayItem[]> {
    const groups = new Map<number, PlayItem[]>();
    for (const play of plays) {
      const existing = groups.get(play.quarter) || [];
      existing.push(play);
      groups.set(play.quarter, existing);
    }
    return groups;
  }

  /**
   * Get quarters that need dividers
   */
  function getQuarterDividers(plays: PlayItem[]): number[] {
    const quarters = new Set<number>();
    plays.forEach((play) => quarters.add(play.quarter));
    return Array.from(quarters).sort((a, b) => a - b);
  }

  const createPlay = (overrides: Partial<PlayItem> = {}): PlayItem => ({
    id: `play-${Math.random()}`,
    quarter: 1,
    time: '12:00',
    offenseTeam: 'NYG',
    description: 'Run up the middle for 4 yards',
    ...overrides,
  });

  describe('formatQuarter', () => {
    it('should format regular quarters', () => {
      expect(formatQuarter(1)).toBe('Q1');
      expect(formatQuarter(2)).toBe('Q2');
      expect(formatQuarter(3)).toBe('Q3');
      expect(formatQuarter(4)).toBe('Q4');
    });

    it('should format overtime', () => {
      expect(formatQuarter(5)).toBe('OT1');
      expect(formatQuarter(6)).toBe('OT2');
    });
  });

  describe('getPlayType', () => {
    it('should identify scoring plays', () => {
      expect(getPlayType(createPlay({ isScoring: true }))).toBe('scoring');
    });

    it('should identify turnovers', () => {
      expect(getPlayType(createPlay({ isTurnover: true }))).toBe('turnover');
    });

    it('should identify big plays', () => {
      expect(getPlayType(createPlay({ isBigPlay: true }))).toBe('bigPlay');
    });

    it('should identify regular plays', () => {
      expect(getPlayType(createPlay())).toBe('regular');
    });

    it('should prioritize scoring over other types', () => {
      expect(
        getPlayType(createPlay({ isScoring: true, isTurnover: true }))
      ).toBe('scoring');
    });
  });

  describe('groupPlaysByQuarter', () => {
    it('should group plays correctly', () => {
      const plays = [
        createPlay({ quarter: 1, id: '1' }),
        createPlay({ quarter: 1, id: '2' }),
        createPlay({ quarter: 2, id: '3' }),
      ];
      const groups = groupPlaysByQuarter(plays);

      expect(groups.get(1)?.length).toBe(2);
      expect(groups.get(2)?.length).toBe(1);
    });

    it('should handle empty plays', () => {
      const groups = groupPlaysByQuarter([]);
      expect(groups.size).toBe(0);
    });

    it('should handle single quarter', () => {
      const plays = [
        createPlay({ quarter: 3, id: '1' }),
        createPlay({ quarter: 3, id: '2' }),
      ];
      const groups = groupPlaysByQuarter(plays);
      expect(groups.size).toBe(1);
      expect(groups.get(3)?.length).toBe(2);
    });
  });

  describe('getQuarterDividers', () => {
    it('should return unique quarters in order', () => {
      const plays = [
        createPlay({ quarter: 2, id: '1' }),
        createPlay({ quarter: 1, id: '2' }),
        createPlay({ quarter: 2, id: '3' }),
        createPlay({ quarter: 3, id: '4' }),
      ];
      expect(getQuarterDividers(plays)).toEqual([1, 2, 3]);
    });

    it('should handle empty plays', () => {
      expect(getQuarterDividers([])).toEqual([]);
    });

    it('should handle overtime', () => {
      const plays = [
        createPlay({ quarter: 4, id: '1' }),
        createPlay({ quarter: 5, id: '2' }),
      ];
      expect(getQuarterDividers(plays)).toEqual([4, 5]);
    });
  });

  describe('play counting', () => {
    it('should count plays correctly', () => {
      const plays = [createPlay(), createPlay(), createPlay()];
      expect(plays.length).toBe(3);
    });

    it('should count scoring plays', () => {
      const plays = [
        createPlay({ isScoring: true }),
        createPlay({ isScoring: false }),
        createPlay({ isScoring: true }),
      ];
      const scoringCount = plays.filter((p) => p.isScoring).length;
      expect(scoringCount).toBe(2);
    });

    it('should count turnovers', () => {
      const plays = [
        createPlay({ isTurnover: true }),
        createPlay({ isTurnover: false }),
      ];
      const turnoverCount = plays.filter((p) => p.isTurnover).length;
      expect(turnoverCount).toBe(1);
    });
  });
});
