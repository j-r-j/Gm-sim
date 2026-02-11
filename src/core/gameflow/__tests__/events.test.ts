/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Events Tests
 *
 * Tests for the event bus and event helpers.
 */

import {
  GameFlowEventBus,
  gameFlowEventBus,
  createPlayCompleteEvent,
  createScoreChangeEvent,
  checkLeadChange,
  PlayDisplay,
} from '../events';

describe('GameFlowEventBus', () => {
  let eventBus: GameFlowEventBus;

  beforeEach(() => {
    eventBus = new GameFlowEventBus();
  });

  afterEach(() => {
    eventBus.reset();
  });

  describe('subscribe', () => {
    it('should subscribe to specific event type', () => {
      const events: string[] = [];
      eventBus.subscribe('GAME_START', () => events.push('GAME_START'));

      eventBus.emit({
        type: 'GAME_START',
        payload: {
          gameId: 'game1',
          homeTeamId: 'home',
          awayTeamId: 'away',
          homeTeamName: 'Home Team',
          awayTeamName: 'Away Team',
          week: 1,
        },
      });

      expect(events).toContain('GAME_START');
    });

    it('should not receive events of different type', () => {
      const events: string[] = [];
      eventBus.subscribe('GAME_START', () => events.push('GAME_START'));

      eventBus.emit({
        type: 'GAME_END',
        payload: {} as any,
      });

      expect(events).not.toContain('GAME_START');
      expect(events.length).toBe(0);
    });

    it('should allow multiple subscribers to same event', () => {
      let count = 0;
      eventBus.subscribe('GAME_START', () => count++);
      eventBus.subscribe('GAME_START', () => count++);

      eventBus.emit({
        type: 'GAME_START',
        payload: {} as any,
      });

      expect(count).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from events', () => {
      const events: string[] = [];
      const subscription = eventBus.subscribe('GAME_START', () => events.push('GAME_START'));

      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      expect(events.length).toBe(1);

      subscription.unsubscribe();

      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      expect(events.length).toBe(1); // Still 1
    });
  });

  describe('subscribeAll', () => {
    it('should receive all events', () => {
      const events: string[] = [];
      eventBus.subscribeAll((event) => events.push(event.type));

      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      eventBus.emit({ type: 'GAME_END', payload: {} as any });
      eventBus.emit({ type: 'TOUCHDOWN', payload: {} as any });

      expect(events).toContain('GAME_START');
      expect(events).toContain('GAME_END');
      expect(events).toContain('TOUCHDOWN');
    });

    it('should unsubscribe from all events', () => {
      const events: string[] = [];
      const subscription = eventBus.subscribeAll((event) => events.push(event.type));

      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      subscription.unsubscribe();
      eventBus.emit({ type: 'GAME_END', payload: {} as any });

      expect(events.length).toBe(1);
    });
  });

  describe('event history', () => {
    it('should track event history', () => {
      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      eventBus.emit({ type: 'PLAY_COMPLETE', payload: {} as any });
      eventBus.emit({ type: 'GAME_END', payload: {} as any });

      const history = eventBus.getHistory();

      expect(history.length).toBe(3);
      expect(history[0].type).toBe('GAME_START');
      expect(history[2].type).toBe('GAME_END');
    });

    it('should limit history to recent events', () => {
      eventBus.getHistory(); // Clear any existing

      const history = eventBus.getHistory(2);

      expect(history.length).toBeLessThanOrEqual(2);
    });

    it('should filter history by type', () => {
      eventBus.emit({ type: 'GAME_START', payload: {} as any });
      eventBus.emit({ type: 'PLAY_COMPLETE', payload: {} as any });
      eventBus.emit({ type: 'PLAY_COMPLETE', payload: {} as any });
      eventBus.emit({ type: 'GAME_END', payload: {} as any });

      const playEvents = eventBus.getEventsByType('PLAY_COMPLETE');

      expect(playEvents.length).toBe(2);
      playEvents.forEach((e) => expect(e.type).toBe('PLAY_COMPLETE'));
    });
  });

  describe('reset', () => {
    it('should clear all subscriptions and history', () => {
      let received = false;
      eventBus.subscribe('GAME_START', () => {
        received = true;
      });
      eventBus.emit({ type: 'GAME_START', payload: {} as any });

      // Verify event was received and history was tracked
      expect(received).toBe(true);
      expect(eventBus.getHistory().length).toBe(1);

      eventBus.reset();

      // After reset, history should be cleared
      expect(eventBus.getHistory().length).toBe(0);

      // Verify subscriptions were cleared
      received = false;
      eventBus.emit({ type: 'GAME_START', payload: {} as any });

      expect(received).toBe(false); // Subscription was cleared
      expect(eventBus.getHistory().length).toBe(1); // But event still goes to history
    });
  });

  describe('getSubscriberCount', () => {
    it('should count subscribers', () => {
      eventBus.subscribe('GAME_START', () => {});
      eventBus.subscribe('GAME_START', () => {});
      eventBus.subscribe('GAME_END', () => {});
      eventBus.subscribeAll(() => {});

      expect(eventBus.getSubscriberCount('GAME_START')).toBe(2);
      expect(eventBus.getSubscriberCount('GAME_END')).toBe(1);
      expect(eventBus.getSubscriberCount()).toBe(4); // Total
    });
  });

  describe('error handling', () => {
    it('should not crash on listener errors', () => {
      eventBus.subscribe('GAME_START', () => {
        throw new Error('Test error');
      });
      eventBus.subscribe('GAME_START', () => {
        // This should still run
      });

      // Should not throw
      expect(() => {
        eventBus.emit({ type: 'GAME_START', payload: {} as any });
      }).not.toThrow();
    });
  });
});

describe('global event bus', () => {
  afterEach(() => {
    gameFlowEventBus.reset();
  });

  it('should be a singleton', () => {
    const bus1 = gameFlowEventBus;
    const bus2 = gameFlowEventBus;
    expect(bus1).toBe(bus2);
  });
});

describe('event helpers', () => {
  describe('createPlayCompleteEvent', () => {
    const mockPlay: PlayDisplay = {
      id: 'play1',
      quarter: 1,
      time: '10:30',
      offenseTeam: 'DAL',
      description: 'Pass complete for 15 yards',
      yardsGained: 15,
      isScoring: false,
      isTurnover: false,
      isBigPlay: false,
      score: '0-0',
    };

    it('should create PLAY_COMPLETE event for normal play', () => {
      const event = createPlayCompleteEvent(mockPlay, 0, 0, 1, 630);

      expect(event.type).toBe('PLAY_COMPLETE');
    });

    it('should create TOUCHDOWN event for scoring play', () => {
      const tdPlay = {
        ...mockPlay,
        isScoring: true,
        description: 'Touchdown pass',
      };

      const event = createPlayCompleteEvent(tdPlay, 7, 0, 1, 630);

      expect(event.type).toBe('TOUCHDOWN');
    });

    it('should create TURNOVER event for turnover', () => {
      const turnoverPlay = {
        ...mockPlay,
        isTurnover: true,
        description: 'Interception',
      };

      const event = createPlayCompleteEvent(turnoverPlay, 0, 0, 1, 630);

      expect(event.type).toBe('TURNOVER');
    });

    it('should create BIG_PLAY event for big gain', () => {
      const bigPlay = {
        ...mockPlay,
        isBigPlay: true,
        yardsGained: 45,
      };

      const event = createPlayCompleteEvent(bigPlay, 0, 0, 1, 630);

      expect(event.type).toBe('BIG_PLAY');
    });

    it('should include correct payload', () => {
      const event = createPlayCompleteEvent(mockPlay, 7, 3, 2, 500);

      expect(event.payload.play).toBe(mockPlay);
      expect(event.payload.homeScore).toBe(7);
      expect(event.payload.awayScore).toBe(3);
      expect(event.payload.quarter).toBe(2);
      expect(event.payload.timeRemaining).toBe(500);
    });
  });

  describe('createScoreChangeEvent', () => {
    it('should create score change event for home team scoring', () => {
      const event = createScoreChangeEvent(7, 0, 0, 0, 'Touchdown pass');

      expect(event.type).toBe('SCORE_CHANGE');
      if (event.type === 'SCORE_CHANGE') {
        expect(event.payload.scoringTeam).toBe('home');
        expect(event.payload.points).toBe(7);
        expect(event.payload.description).toBe('Touchdown pass');
      }
    });

    it('should create score change event for away team scoring', () => {
      const event = createScoreChangeEvent(7, 3, 7, 0, 'Field goal');

      expect(event.type).toBe('SCORE_CHANGE');
      if (event.type === 'SCORE_CHANGE') {
        expect(event.payload.scoringTeam).toBe('away');
        expect(event.payload.points).toBe(3);
      }
    });
  });

  describe('checkLeadChange', () => {
    it('should detect lead change from away to home', () => {
      const result = checkLeadChange(0, 7, 10, 7);

      expect(result).not.toBeNull();
      expect(result!.newLeader).toBe('home');
    });

    it('should detect lead change from home to away', () => {
      const result = checkLeadChange(7, 0, 7, 10);

      expect(result).not.toBeNull();
      expect(result!.newLeader).toBe('away');
    });

    it('should detect tie', () => {
      const result = checkLeadChange(7, 0, 7, 7);

      expect(result).not.toBeNull();
      expect(result!.newLeader).toBe('tied');
    });

    it('should return null when no lead change', () => {
      const result = checkLeadChange(7, 3, 14, 3);

      expect(result).toBeNull(); // Home still leading
    });
  });
});
