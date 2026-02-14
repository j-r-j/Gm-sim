/**
 * Game Lifecycle Integration Tests
 *
 * End-to-end tests verifying the complete game lifecycle:
 * - New game creation with valid state
 * - Advancing through regular season weeks
 * - GameState serialization/deserialization roundtrip
 * - Save/load roundtrip via GameStorage
 */

import { createNewGame } from '@services/NewGameService';
import { GameStorage } from '@services/storage/GameStorage';
import { FAKE_CITIES } from '@core/models/team/FakeCities';
import {
  GameState,
  validateGameState,
  serializeGameState,
  deserializeGameState,
} from '@core/models/game/GameState';
import { validatePlayer } from '@core/models/player/Player';
import { simulateWeek } from '@core/season/WeekSimulator';
import { getWeekGames } from '@core/season/ScheduleGenerator';

describe('Game Lifecycle Integration Tests', () => {
  let gameState: GameState;
  const selectedTeam = FAKE_CITIES[0];
  const gmName = 'Lifecycle Test GM';

  beforeAll(() => {
    gameState = createNewGame({
      saveSlot: 0,
      gmName,
      selectedTeam,
      startYear: 2025,
      historyYears: 5,
    });
  }, 60000);

  // =====================================================
  // 1. New game creation produces a fully valid state
  // =====================================================
  describe('new game produces valid initial state', () => {
    it('should have exactly 32 teams', () => {
      expect(Object.keys(gameState.teams)).toHaveLength(32);
    });

    it('every team should have 40-53 rostered players', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.rosterPlayerIds.length).toBeGreaterThanOrEqual(40);
        expect(team.rosterPlayerIds.length).toBeLessThanOrEqual(53);
      }
    });

    it('every rostered player should exist in gameState.players', () => {
      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.rosterPlayerIds) {
          expect(gameState.players[playerId]).toBeDefined();
        }
      }
    });

    it('should have 96 coaches (3 per team)', () => {
      expect(Object.keys(gameState.coaches)).toHaveLength(96);
    });

    it('should have 96 scouts (3 per team)', () => {
      expect(Object.keys(gameState.scouts)).toHaveLength(96);
    });

    it('should have 32 owners each linked to a valid team', () => {
      const owners = Object.values(gameState.owners);
      expect(owners).toHaveLength(32);
      for (const owner of owners) {
        expect(gameState.teams[owner.teamId]).toBeDefined();
      }
    });

    it('should have 224 draft picks (7 rounds x 32 teams)', () => {
      expect(Object.keys(gameState.draftPicks)).toHaveLength(224);
    });

    it('should have 250-300 prospects', () => {
      const count = Object.keys(gameState.prospects).length;
      expect(count).toBeGreaterThanOrEqual(250);
      expect(count).toBeLessThanOrEqual(300);
    });

    it('league calendar should be regularSeason, week 1, year 2025', () => {
      expect(gameState.league.calendar.currentYear).toBe(2025);
      expect(gameState.league.calendar.currentPhase).toBe('regularSeason');
      expect(gameState.league.calendar.currentWeek).toBe(1);
    });

    it('user team should have gmId set', () => {
      const userTeam = gameState.teams[gameState.userTeamId];
      expect(userTeam.gmId).toBe(gmName);
    });

    it('all sampled players should pass validation', () => {
      const allPlayers = Object.values(gameState.players);
      const sampled = allPlayers.slice(0, 200);
      for (const player of sampled) {
        expect(validatePlayer(player)).toBe(true);
      }
    });

    it('schedule should have regular season games', () => {
      expect(gameState.league.schedule).toBeDefined();
      expect(gameState.league.schedule!.regularSeason.length).toBeGreaterThan(0);
    });
  });

  // =====================================================
  // 2. Advance through multiple weeks of regular season
  // =====================================================
  describe('advancing through regular season weeks', () => {
    let updatedState: GameState;

    beforeAll(() => {
      updatedState = { ...gameState };
    });

    it('should simulate week 1 without error and produce game results', () => {
      const results = simulateWeek(
        1,
        updatedState.league.schedule!,
        updatedState,
        updatedState.userTeamId,
        true
      );

      expect(results.week).toBe(1);
      expect(results.games.length).toBeGreaterThan(0);

      // All games should have valid scores
      for (const { result } of results.games) {
        expect(result.homeScore).toBeGreaterThanOrEqual(0);
        expect(result.awayScore).toBeGreaterThanOrEqual(0);
      }
    }, 60000);

    it('should simulate weeks 2 through 4 without error', () => {
      for (let week = 2; week <= 4; week++) {
        const weekGames = getWeekGames(updatedState.league.schedule!, week);
        expect(weekGames.length).toBeGreaterThan(0);

        const results = simulateWeek(
          week,
          updatedState.league.schedule!,
          updatedState,
          updatedState.userTeamId,
          true
        );

        expect(results.games.length).toBeGreaterThan(0);
      }
    }, 120000);

    it('standings should have equal total wins and losses after simulation', () => {
      const results = simulateWeek(
        1,
        updatedState.league.schedule!,
        updatedState,
        updatedState.userTeamId,
        true
      );

      let totalWins = 0;
      let totalLosses = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of results.standings[conference][division]) {
            totalWins += standing.wins;
            totalLosses += standing.losses;
          }
        }
      }
      expect(totalWins).toBe(totalLosses);
    }, 60000);
  });

  // =====================================================
  // 3. Serialization / deserialization roundtrip
  // =====================================================
  describe('GameState serialization/deserialization', () => {
    it('should survive JSON roundtrip without data loss', () => {
      const json = serializeGameState(gameState);
      const restored = deserializeGameState(json);

      // Top-level fields
      expect(restored.saveSlot).toBe(gameState.saveSlot);
      expect(restored.userTeamId).toBe(gameState.userTeamId);
      expect(restored.userName).toBe(gameState.userName);

      // Entity counts
      expect(Object.keys(restored.teams)).toHaveLength(32);
      expect(Object.keys(restored.coaches)).toHaveLength(96);
      expect(Object.keys(restored.scouts)).toHaveLength(96);
      expect(Object.keys(restored.owners)).toHaveLength(32);
      expect(Object.keys(restored.draftPicks)).toHaveLength(224);
      expect(Object.keys(restored.players)).toHaveLength(
        Object.keys(gameState.players).length
      );
      expect(Object.keys(restored.contracts)).toHaveLength(
        Object.keys(gameState.contracts).length
      );
    });

    it('should preserve league calendar through serialization', () => {
      const json = serializeGameState(gameState);
      const restored = deserializeGameState(json);

      expect(restored.league.calendar.currentYear).toBe(2025);
      expect(restored.league.calendar.currentPhase).toBe('regularSeason');
      expect(restored.league.calendar.currentWeek).toBe(1);
    });

    it('should preserve player skill values exactly', () => {
      const json = serializeGameState(gameState);
      const restored = deserializeGameState(json);

      const playerIds = Object.keys(gameState.players).slice(0, 50);
      for (const playerId of playerIds) {
        const original = gameState.players[playerId];
        const deserialized = restored.players[playerId];

        expect(deserialized).toBeDefined();
        expect(deserialized.firstName).toBe(original.firstName);
        expect(deserialized.lastName).toBe(original.lastName);
        expect(deserialized.position).toBe(original.position);
        expect(deserialized.age).toBe(original.age);

        // Check skill values
        for (const [skillName, skill] of Object.entries(original.skills)) {
          const deserializedSkill = deserialized.skills[skillName];
          expect(deserializedSkill.trueValue).toBe(skill.trueValue);
          expect(deserializedSkill.perceivedMin).toBe(skill.perceivedMin);
          expect(deserializedSkill.perceivedMax).toBe(skill.perceivedMax);
        }
      }
    });

    it('should preserve team rosters through serialization', () => {
      const json = serializeGameState(gameState);
      const restored = deserializeGameState(json);

      for (const teamId of Object.keys(gameState.teams)) {
        const original = gameState.teams[teamId];
        const deserialized = restored.teams[teamId];

        expect(deserialized.rosterPlayerIds).toEqual(original.rosterPlayerIds);
        expect(deserialized.city).toBe(original.city);
        expect(deserialized.nickname).toBe(original.nickname);
      }
    });

    it('should preserve contract data through serialization', () => {
      const json = serializeGameState(gameState);
      const restored = deserializeGameState(json);

      const contractIds = Object.keys(gameState.contracts).slice(0, 20);
      for (const contractId of contractIds) {
        const original = gameState.contracts[contractId];
        const deserialized = restored.contracts[contractId];

        expect(deserialized).toBeDefined();
        expect(deserialized.playerId).toBe(original.playerId);
        expect(deserialized.teamId).toBe(original.teamId);
        expect(deserialized.status).toBe(original.status);
      }
    });
  });

  // =====================================================
  // 4. Save/load roundtrip via GameStorage
  // =====================================================
  describe('GameStorage save/load roundtrip', () => {
    const storage = new GameStorage();

    it('should save and load game state from slot 0', async () => {
      await storage.save(0, gameState);
      const loaded = await storage.load<GameState>(0);

      expect(loaded).not.toBeNull();
      expect(loaded!.userTeamId).toBe(gameState.userTeamId);
      expect(loaded!.userName).toBe(gameState.userName);
      expect(Object.keys(loaded!.teams)).toHaveLength(32);
    });

    it('should report slot as existing after save', async () => {
      await storage.save(1, gameState);
      const exists = await storage.slotExists(1);
      expect(exists).toBe(true);
    });

    it('should list occupied slots', async () => {
      await storage.save(0, gameState);
      await storage.save(1, gameState);
      const slots = await storage.listSlots();
      expect(slots).toContain(0);
      expect(slots).toContain(1);
    });

    it('should delete a save slot', async () => {
      await storage.save(2, gameState);
      await storage.delete(2);
      const exists = await storage.slotExists(2);
      expect(exists).toBe(false);
    });

    it('should return null for empty slot', async () => {
      await storage.delete(2);
      const loaded = await storage.load<GameState>(2);
      expect(loaded).toBeNull();
    });

    it('should preserve all entity counts through save/load', async () => {
      await storage.save(0, gameState);
      const loaded = await storage.load<GameState>(0);

      expect(Object.keys(loaded!.players)).toHaveLength(
        Object.keys(gameState.players).length
      );
      expect(Object.keys(loaded!.coaches)).toHaveLength(
        Object.keys(gameState.coaches).length
      );
      expect(Object.keys(loaded!.scouts)).toHaveLength(
        Object.keys(gameState.scouts).length
      );
      expect(Object.keys(loaded!.contracts)).toHaveLength(
        Object.keys(gameState.contracts).length
      );
      expect(Object.keys(loaded!.prospects)).toHaveLength(
        Object.keys(gameState.prospects).length
      );
    });
  });
});
