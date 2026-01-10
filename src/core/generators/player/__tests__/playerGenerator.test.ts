import { Position } from '../../../models/player/Position';
import { validatePlayer } from '../../../models/player/Player';
import { validatePhysicalAttributes } from '../../../models/player/PhysicalAttributes';
import { validateTechnicalSkills } from '../../../models/player/TechnicalSkills';
import { validateItFactor } from '../../../models/player/ItFactor';
import { validateConsistencyProfile } from '../../../models/player/Consistency';
import { validateSchemeFits } from '../../../models/player/SchemeFit';
import { validateRoleFit } from '../../../models/player/RoleFit';
import { validateInjuryStatus } from '../../../models/player/InjuryStatus';
import {
  generatePlayer,
  generateRoster,
  generateLeaguePlayers,
  generateDraftClass,
} from '../PlayerGenerator';

describe('PlayerGenerator', () => {
  describe('generatePlayer', () => {
    it('should generate a valid player with default options', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        expect(validatePlayer(player)).toBe(true);
      }
    });

    it('should generate a player with specified position', () => {
      for (const position of Object.values(Position)) {
        const player = generatePlayer({ position });
        expect(player.position).toBe(position);
        expect(validatePlayer(player)).toBe(true);
      }
    });

    it('should respect age range', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ ageRange: { min: 25, max: 28 } });
        expect(player.age).toBeGreaterThanOrEqual(25);
        expect(player.age).toBeLessThanOrEqual(28);
      }
    });

    it('should generate draft prospects with forDraft option', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ forDraft: true });
        expect(player.experience).toBe(0);
        expect(player.age).toBeGreaterThanOrEqual(21);
        expect(player.age).toBeLessThanOrEqual(24);
      }
    });

    it('should respect skill tier option', () => {
      const eliteSkills: number[] = [];
      const fringeSkills: number[] = [];

      for (let i = 0; i < 30; i++) {
        const elite = generatePlayer({ skillTier: 'elite' });
        const fringe = generatePlayer({ skillTier: 'fringe' });

        const eliteAvg = getAverageSkill(elite);
        const fringeAvg = getAverageSkill(fringe);

        eliteSkills.push(eliteAvg);
        fringeSkills.push(fringeAvg);
      }

      const avgElite = eliteSkills.reduce((a, b) => a + b, 0) / eliteSkills.length;
      const avgFringe = fringeSkills.reduce((a, b) => a + b, 0) / fringeSkills.length;

      expect(avgElite).toBeGreaterThan(avgFringe);
    });

    it('should generate all required components', () => {
      const player = generatePlayer({ position: Position.QB });

      expect(player.id).toBeTruthy();
      expect(player.firstName).toBeTruthy();
      expect(player.lastName).toBeTruthy();
      expect(player.position).toBe(Position.QB);
      expect(player.physical).toBeTruthy();
      expect(player.skills).toBeTruthy();
      expect(player.hiddenTraits).toBeTruthy();
      expect(player.itFactor).toBeTruthy();
      expect(player.consistency).toBeTruthy();
      expect(player.schemeFits).toBeTruthy();
      expect(player.roleFit).toBeTruthy();
      expect(player.injuryStatus).toBeTruthy();
    });

    it('should validate all sub-components', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();

        expect(validatePhysicalAttributes(player.physical)).toBe(true);
        expect(validateTechnicalSkills(player.skills)).toBe(true);
        expect(validateItFactor(player.itFactor)).toBe(true);
        expect(validateConsistencyProfile(player.consistency)).toBe(true);
        expect(validateSchemeFits(player.schemeFits)).toBe(true);
        expect(validateRoleFit(player.roleFit)).toBe(true);
        expect(validateInjuryStatus(player.injuryStatus)).toBe(true);
      }
    });

    it('should generate unique player IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const player = generatePlayer();
        ids.add(player.id);
      }
      expect(ids.size).toBe(100);
    });

    it('should start players healthy', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer();
        expect(player.injuryStatus.severity).toBe('none');
        expect(player.fatigue).toBe(0);
      }
    });

    it('should have empty revealedToUser for traits', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer();
        expect(player.hiddenTraits.revealedToUser).toEqual([]);
      }
    });
  });

  describe('generateRoster', () => {
    it('should generate a valid 53-man roster', () => {
      const roster = generateRoster('team-1');
      expect(roster.length).toBeGreaterThanOrEqual(53);
    });

    it('should have all required positions', () => {
      const roster = generateRoster('team-1');

      const positionCounts: Partial<Record<Position, number>> = {};
      for (const player of roster) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }

      // Check for at least one of each position
      for (const position of Object.values(Position)) {
        expect(positionCounts[position]).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have appropriate depth at each position', () => {
      const roster = generateRoster('team-1');

      const positionCounts: Partial<Record<Position, number>> = {};
      for (const player of roster) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }

      // QBs should have 3
      expect(positionCounts[Position.QB]).toBe(3);

      // K and P should have 1
      expect(positionCounts[Position.K]).toBe(1);
      expect(positionCounts[Position.P]).toBe(1);

      // Skill positions should have more depth
      expect(positionCounts[Position.WR]).toBeGreaterThanOrEqual(5);
      expect(positionCounts[Position.CB]).toBeGreaterThanOrEqual(4);
    });

    it('should have valid players', () => {
      const roster = generateRoster('team-1');

      for (const player of roster) {
        expect(validatePlayer(player)).toBe(true);
      }
    });

    it('should have a mix of skill levels', () => {
      const roster = generateRoster('team-1');

      const skills = roster.map((p) => getAverageSkill(p));
      const avgSkill = skills.reduce((a, b) => a + b, 0) / skills.length;
      const maxSkill = Math.max(...skills);
      const minSkill = Math.min(...skills);

      // Should have variety
      expect(maxSkill - minSkill).toBeGreaterThan(20);

      // Average should be moderate
      expect(avgSkill).toBeGreaterThan(40);
      expect(avgSkill).toBeLessThan(80);
    });
  });

  describe('generateLeaguePlayers', () => {
    it('should generate players for all 32 teams', () => {
      const players = generateLeaguePlayers();

      // 32 teams * 53 players = 1696 minimum
      expect(players.length).toBeGreaterThanOrEqual(32 * 53);
    });

    it('should have valid players', () => {
      const players = generateLeaguePlayers();

      // Check a sample of players
      const sampleSize = Math.min(100, players.length);
      for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * players.length);
        expect(validatePlayer(players[randomIndex])).toBe(true);
      }
    });

    it('should have diverse player distribution', () => {
      const players = generateLeaguePlayers();

      // Check position distribution
      const positionCounts: Partial<Record<Position, number>> = {};
      for (const player of players) {
        positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
      }

      // Each position should have at least 32 players (one per team)
      for (const position of Object.values(Position)) {
        expect(positionCounts[position]).toBeGreaterThanOrEqual(32);
      }
    });
  });

  describe('generateDraftClass', () => {
    it('should generate default 300 prospects', () => {
      const prospects = generateDraftClass();
      expect(prospects.length).toBe(300);
    });

    it('should respect custom size', () => {
      const prospects = generateDraftClass(150);
      expect(prospects.length).toBe(150);
    });

    it('should generate valid draft-eligible players', () => {
      const prospects = generateDraftClass(50);

      for (const prospect of prospects) {
        expect(validatePlayer(prospect)).toBe(true);
        expect(prospect.experience).toBe(0); // All rookies
        expect(prospect.age).toBeGreaterThanOrEqual(21);
        expect(prospect.age).toBeLessThanOrEqual(24);
      }
    });

    it('should have a pyramid of skill levels', () => {
      const prospects = generateDraftClass(300);

      const eliteCount = prospects.filter((p) => getAverageSkill(p) >= 70).length;
      const starterCount = prospects.filter((p) => {
        const avg = getAverageSkill(p);
        return avg >= 55 && avg < 70;
      }).length;
      const fringeCount = prospects.filter((p) => getAverageSkill(p) < 45).length;

      // Elite should be rare
      expect(eliteCount).toBeLessThan(50);

      // Fringe should be common
      expect(fringeCount).toBeGreaterThan(starterCount * 0.5);
    });

    it('should have all positions represented', () => {
      const prospects = generateDraftClass(300);

      const positions = new Set(prospects.map((p) => p.position));

      // Should have most positions
      expect(positions.size).toBeGreaterThan(15);
    });
  });
});

// Helper function to get average true skill value
function getAverageSkill(player: { skills: Record<string, { trueValue: number }> }): number {
  const values = Object.values(player.skills).map((s) => s.trueValue);
  if (values.length === 0) return 50;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
