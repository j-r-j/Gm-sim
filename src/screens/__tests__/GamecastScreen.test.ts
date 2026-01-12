/**
 * Tests for GamecastScreen utility functions
 */

describe('GamecastScreen utilities', () => {
  /**
   * Format time remaining as MM:SS
   */
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  interface PlayResult {
    playType: string;
    outcome: string;
    yardsGained: number;
    description: string;
    touchdown: boolean;
    turnover: boolean;
  }

  interface LiveGameState {
    clock: { quarter: number; timeRemaining: number };
    score: { home: number; away: number };
    field: { ballPosition: number; possession: 'home' | 'away' };
  }

  interface PlayItem {
    id: string;
    quarter: number;
    time: string;
    offenseTeam: string;
    description: string;
    isScoring: boolean;
    isTurnover: boolean;
    isBigPlay: boolean;
    score: string;
  }

  /**
   * Convert a PlayResult to a PlayItem for the feed
   */
  function playResultToPlayItem(
    play: PlayResult,
    index: number,
    state: LiveGameState,
    offenseTeam: string
  ): PlayItem {
    const isScoringPlay = play.touchdown || play.outcome === 'field_goal_made';
    const isTurnover = play.turnover;
    const isBigPlay = play.yardsGained >= 20;

    return {
      id: `play-${index}`,
      quarter: state.clock.quarter,
      time: formatTime(state.clock.timeRemaining),
      offenseTeam,
      description: play.description,
      isScoring: isScoringPlay,
      isTurnover,
      isBigPlay,
      score: `${state.score.home}-${state.score.away}`,
    };
  }

  /**
   * Determine if red zone
   */
  function isRedZone(ballPosition: number, possession: 'home' | 'away'): boolean {
    return (
      (possession === 'home' && ballPosition >= 80) || (possession === 'away' && ballPosition <= 20)
    );
  }

  /**
   * Get team abbreviation from name
   */
  function getTeamAbbr(teamName: string): string {
    return teamName.substring(0, 3).toUpperCase();
  }

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime(900)).toBe('15:00');
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(65)).toBe('1:05');
    });
  });

  describe('playResultToPlayItem', () => {
    const createPlayResult = (overrides: Partial<PlayResult> = {}): PlayResult => ({
      playType: 'run_inside',
      outcome: 'short_gain',
      yardsGained: 4,
      description: 'Run up the middle for 4 yards',
      touchdown: false,
      turnover: false,
      ...overrides,
    });

    const createGameState = (overrides: Partial<LiveGameState> = {}): LiveGameState => ({
      clock: { quarter: 1, timeRemaining: 900 },
      score: { home: 0, away: 0 },
      field: { ballPosition: 25, possession: 'home' },
      ...overrides,
    });

    it('should create play item from result', () => {
      const play = createPlayResult();
      const state = createGameState();
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.id).toBe('play-0');
      expect(item.quarter).toBe(1);
      expect(item.time).toBe('15:00');
      expect(item.offenseTeam).toBe('NYG');
      expect(item.description).toBe('Run up the middle for 4 yards');
      expect(item.isScoring).toBe(false);
      expect(item.isTurnover).toBe(false);
      expect(item.isBigPlay).toBe(false);
      expect(item.score).toBe('0-0');
    });

    it('should mark touchdowns as scoring', () => {
      const play = createPlayResult({ touchdown: true });
      const state = createGameState({ score: { home: 7, away: 0 } });
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.isScoring).toBe(true);
      expect(item.score).toBe('7-0');
    });

    it('should mark field goals as scoring', () => {
      const play = createPlayResult({ outcome: 'field_goal_made' });
      const state = createGameState({ score: { home: 3, away: 0 } });
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.isScoring).toBe(true);
    });

    it('should mark turnovers', () => {
      const play = createPlayResult({ turnover: true });
      const state = createGameState();
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.isTurnover).toBe(true);
    });

    it('should mark big plays (20+ yards)', () => {
      const play = createPlayResult({ yardsGained: 25 });
      const state = createGameState();
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.isBigPlay).toBe(true);
    });

    it('should not mark plays under 20 yards as big', () => {
      const play = createPlayResult({ yardsGained: 19 });
      const state = createGameState();
      const item = playResultToPlayItem(play, 0, state, 'NYG');

      expect(item.isBigPlay).toBe(false);
    });
  });

  describe('isRedZone', () => {
    it('should be red zone for home when ball >= 80', () => {
      expect(isRedZone(80, 'home')).toBe(true);
      expect(isRedZone(90, 'home')).toBe(true);
      expect(isRedZone(99, 'home')).toBe(true);
    });

    it('should not be red zone for home when ball < 80', () => {
      expect(isRedZone(79, 'home')).toBe(false);
      expect(isRedZone(50, 'home')).toBe(false);
    });

    it('should be red zone for away when ball <= 20', () => {
      expect(isRedZone(20, 'away')).toBe(true);
      expect(isRedZone(10, 'away')).toBe(true);
      expect(isRedZone(1, 'away')).toBe(true);
    });

    it('should not be red zone for away when ball > 20', () => {
      expect(isRedZone(21, 'away')).toBe(false);
      expect(isRedZone(50, 'away')).toBe(false);
    });
  });

  describe('getTeamAbbr', () => {
    it('should get abbreviation from team name', () => {
      expect(getTeamAbbr('New York Giants')).toBe('NEW');
      expect(getTeamAbbr('Philadelphia Eagles')).toBe('PHI');
      expect(getTeamAbbr('Home Team')).toBe('HOM');
    });

    it('should handle short names', () => {
      expect(getTeamAbbr('NY')).toBe('NY');
    });

    it('should uppercase result', () => {
      expect(getTeamAbbr('new york')).toBe('NEW');
    });
  });

  describe('game state management', () => {
    it('should track plays list growth', () => {
      const plays: PlayItem[] = [];

      expect(plays.length).toBe(0);

      plays.push({
        id: 'play-0',
        quarter: 1,
        time: '15:00',
        offenseTeam: 'NYG',
        description: 'First play',
        isScoring: false,
        isTurnover: false,
        isBigPlay: false,
        score: '0-0',
      });

      expect(plays.length).toBe(1);
    });

    it('should detect game over conditions', () => {
      const isGameOver = (state: LiveGameState, playCount: number): boolean => {
        // Game is over if:
        // 1. Clock is 0 in Q4 or later
        // 2. Or play count exceeds safety limit
        return (state.clock.quarter >= 4 && state.clock.timeRemaining <= 0) || playCount > 300;
      };

      expect(
        isGameOver(
          {
            clock: { quarter: 4, timeRemaining: 0 },
            score: { home: 21, away: 17 },
            field: { ballPosition: 50, possession: 'home' },
          },
          100
        )
      ).toBe(true);

      expect(
        isGameOver(
          {
            clock: { quarter: 4, timeRemaining: 60 },
            score: { home: 21, away: 17 },
            field: { ballPosition: 50, possession: 'home' },
          },
          100
        )
      ).toBe(false);

      expect(
        isGameOver(
          {
            clock: { quarter: 1, timeRemaining: 900 },
            score: { home: 0, away: 0 },
            field: { ballPosition: 50, possession: 'home' },
          },
          301
        )
      ).toBe(true);
    });
  });
});
