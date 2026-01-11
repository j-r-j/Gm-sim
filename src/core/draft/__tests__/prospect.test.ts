import { generatePlayer } from '../../generators/player/PlayerGenerator';
import { Position } from '../../models/player/Position';
import {
  Prospect,
  WorkoutStatus,
  createEmptyCollegeStats,
  createProspect,
  updateCombineStatus,
  updateProDayStatus,
  addScoutReport,
  setProspectUserNotes,
  toggleProspectFlag,
  setProspectUserTier,
  updateConsensusProjection,
  updateUserProjection,
  addProspectRanking,
  getOverallRanking,
  getPositionRanking,
  validateProspect,
  getProspectDisplayName,
  getProspectPosition,
  hasRevealedPhysicals,
  getRevealedPhysicals,
  createProspectView,
  DraftProjection,
  ProspectRanking,
} from '../Prospect';
import { generateCollegeProgram, Conference, ProgramType } from '../CollegeProgramGenerator';

describe('Prospect', () => {
  // Helper to create a test prospect
  function createTestProspect(): Prospect {
    const player = generatePlayer({ forDraft: true, position: Position.QB });
    const college = generateCollegeProgram(
      'Texas',
      ProgramType.STATE_OF,
      Conference.SOUTHERN_CONFERENCE
    );
    const stats = createEmptyCollegeStats(Position.QB);
    return createProspect(player, college, stats, 2025);
  }

  describe('createEmptyCollegeStats', () => {
    it('should create empty QB stats', () => {
      const stats = createEmptyCollegeStats(Position.QB);

      expect(stats.seasonsPlayed).toBe(0);
      expect(stats.gamesPlayed).toBe(0);
      expect(stats.positionStats.type).toBe('QB');
    });

    it('should create empty RB stats', () => {
      const stats = createEmptyCollegeStats(Position.RB);
      expect(stats.positionStats.type).toBe('RB');
    });

    it('should create empty WR stats', () => {
      const stats = createEmptyCollegeStats(Position.WR);
      expect(stats.positionStats.type).toBe('WR');
    });

    it('should create empty OL stats for all OL positions', () => {
      const olPositions = [Position.LT, Position.LG, Position.C, Position.RG, Position.RT];
      for (const pos of olPositions) {
        const stats = createEmptyCollegeStats(pos);
        expect(stats.positionStats.type).toBe('OL');
      }
    });

    it('should create empty DL stats', () => {
      const stats = createEmptyCollegeStats(Position.DE);
      expect(stats.positionStats.type).toBe('DL');
    });

    it('should create empty LB stats', () => {
      const stats = createEmptyCollegeStats(Position.ILB);
      expect(stats.positionStats.type).toBe('LB');
    });

    it('should create empty DB stats', () => {
      const stats = createEmptyCollegeStats(Position.CB);
      expect(stats.positionStats.type).toBe('DB');
    });

    it('should create empty KP stats', () => {
      const stats = createEmptyCollegeStats(Position.K);
      expect(stats.positionStats.type).toBe('KP');
    });
  });

  describe('createProspect', () => {
    it('should create a valid prospect', () => {
      const prospect = createTestProspect();
      expect(validateProspect(prospect)).toBe(true);
    });

    it('should initialize with correct defaults', () => {
      const prospect = createTestProspect();

      expect(prospect.combineStatus).toBe(WorkoutStatus.NOT_INVITED);
      expect(prospect.proDayStatus).toBe(WorkoutStatus.NOT_INVITED);
      expect(prospect.physicalsRevealed).toBe(false);
      expect(prospect.consensusProjection).toBeNull();
      expect(prospect.userProjection).toBeNull();
      expect(prospect.rankings).toEqual([]);
      expect(prospect.scoutReportIds).toEqual([]);
      expect(prospect.userNotes).toBe('');
      expect(prospect.flagged).toBe(false);
      expect(prospect.userTier).toBeNull();
      expect(prospect.declared).toBe(true);
    });

    it('should link player ID to prospect ID', () => {
      const prospect = createTestProspect();
      expect(prospect.id).toBe(prospect.player.id);
    });
  });

  describe('updateCombineStatus', () => {
    it('should update combine status', () => {
      const prospect = createTestProspect();
      const updated = updateCombineStatus(prospect, WorkoutStatus.INVITED);

      expect(updated.combineStatus).toBe(WorkoutStatus.INVITED);
    });

    it('should reveal physicals when completed', () => {
      const prospect = createTestProspect();
      expect(prospect.physicalsRevealed).toBe(false);

      const updated = updateCombineStatus(prospect, WorkoutStatus.COMPLETED);
      expect(updated.physicalsRevealed).toBe(true);
    });

    it('should not reveal physicals for other statuses', () => {
      const prospect = createTestProspect();
      const updated = updateCombineStatus(prospect, WorkoutStatus.INVITED);

      expect(updated.physicalsRevealed).toBe(false);
    });

    it('should not mutate original prospect', () => {
      const prospect = createTestProspect();
      updateCombineStatus(prospect, WorkoutStatus.COMPLETED);

      expect(prospect.combineStatus).toBe(WorkoutStatus.NOT_INVITED);
      expect(prospect.physicalsRevealed).toBe(false);
    });
  });

  describe('updateProDayStatus', () => {
    it('should update pro day status', () => {
      const prospect = createTestProspect();
      const updated = updateProDayStatus(prospect, WorkoutStatus.COMPLETED);

      expect(updated.proDayStatus).toBe(WorkoutStatus.COMPLETED);
    });

    it('should reveal physicals when completed', () => {
      const prospect = createTestProspect();
      const updated = updateProDayStatus(prospect, WorkoutStatus.COMPLETED);

      expect(updated.physicalsRevealed).toBe(true);
    });
  });

  describe('addScoutReport', () => {
    it('should add scout report ID', () => {
      const prospect = createTestProspect();
      const updated = addScoutReport(prospect, 'report-1');

      expect(updated.scoutReportIds).toContain('report-1');
    });

    it('should not add duplicate report IDs', () => {
      const prospect = createTestProspect();
      const updated1 = addScoutReport(prospect, 'report-1');
      const updated2 = addScoutReport(updated1, 'report-1');

      expect(updated2.scoutReportIds.length).toBe(1);
    });

    it('should accumulate multiple reports', () => {
      let prospect = createTestProspect();
      prospect = addScoutReport(prospect, 'report-1');
      prospect = addScoutReport(prospect, 'report-2');
      prospect = addScoutReport(prospect, 'report-3');

      expect(prospect.scoutReportIds.length).toBe(3);
    });
  });

  describe('setProspectUserNotes', () => {
    it('should set user notes', () => {
      const prospect = createTestProspect();
      const updated = setProspectUserNotes(prospect, 'Great arm talent');

      expect(updated.userNotes).toBe('Great arm talent');
    });
  });

  describe('toggleProspectFlag', () => {
    it('should toggle flag on', () => {
      const prospect = createTestProspect();
      const updated = toggleProspectFlag(prospect);

      expect(updated.flagged).toBe(true);
    });

    it('should toggle flag off', () => {
      const prospect = createTestProspect();
      const flagged = toggleProspectFlag(prospect);
      const unflagged = toggleProspectFlag(flagged);

      expect(unflagged.flagged).toBe(false);
    });
  });

  describe('setProspectUserTier', () => {
    it('should set user tier', () => {
      const prospect = createTestProspect();
      const updated = setProspectUserTier(prospect, 'Tier 1');

      expect(updated.userTier).toBe('Tier 1');
    });

    it('should allow clearing tier', () => {
      const prospect = createTestProspect();
      const withTier = setProspectUserTier(prospect, 'Tier 1');
      const cleared = setProspectUserTier(withTier, null);

      expect(cleared.userTier).toBeNull();
    });
  });

  describe('updateConsensusProjection', () => {
    it('should update consensus projection', () => {
      const prospect = createTestProspect();
      const projection: DraftProjection = {
        projectedRound: 1,
        projectedPickRange: { min: 1, max: 10 },
        confidence: 80,
        source: 'consensus',
      };

      const updated = updateConsensusProjection(prospect, projection);
      expect(updated.consensusProjection).toEqual(projection);
    });
  });

  describe('updateUserProjection', () => {
    it('should update user projection', () => {
      const prospect = createTestProspect();
      const projection: DraftProjection = {
        projectedRound: 2,
        projectedPickRange: { min: 33, max: 48 },
        confidence: 70,
        source: 'user',
      };

      const updated = updateUserProjection(prospect, projection);
      expect(updated.userProjection).toEqual(projection);
    });

    it('should allow clearing user projection', () => {
      const prospect = createTestProspect();
      const projection: DraftProjection = {
        projectedRound: 2,
        projectedPickRange: { min: 33, max: 48 },
        confidence: 70,
        source: 'user',
      };

      const withProjection = updateUserProjection(prospect, projection);
      const cleared = updateUserProjection(withProjection, null);

      expect(cleared.userProjection).toBeNull();
    });
  });

  describe('addProspectRanking', () => {
    it('should add ranking', () => {
      const prospect = createTestProspect();
      const ranking: ProspectRanking = {
        type: 'overall',
        rank: 5,
        total: 300,
        source: 'consensus',
        timestamp: Date.now(),
      };

      const updated = addProspectRanking(prospect, ranking);
      expect(updated.rankings).toContainEqual(ranking);
    });
  });

  describe('getOverallRanking', () => {
    it('should find overall ranking by source', () => {
      let prospect = createTestProspect();

      const overallRanking: ProspectRanking = {
        type: 'overall',
        rank: 5,
        total: 300,
        source: 'consensus',
        timestamp: Date.now(),
      };

      const positionRanking: ProspectRanking = {
        type: 'position',
        rank: 1,
        total: 15,
        source: 'consensus',
        timestamp: Date.now(),
      };

      prospect = addProspectRanking(prospect, overallRanking);
      prospect = addProspectRanking(prospect, positionRanking);

      const found = getOverallRanking(prospect, 'consensus');
      expect(found).toEqual(overallRanking);
    });

    it('should return undefined if not found', () => {
      const prospect = createTestProspect();
      const found = getOverallRanking(prospect, 'user');

      expect(found).toBeUndefined();
    });
  });

  describe('getPositionRanking', () => {
    it('should find position ranking by source', () => {
      let prospect = createTestProspect();

      const positionRanking: ProspectRanking = {
        type: 'position',
        rank: 3,
        total: 12,
        source: 'scout',
        timestamp: Date.now(),
      };

      prospect = addProspectRanking(prospect, positionRanking);

      const found = getPositionRanking(prospect, 'scout');
      expect(found).toEqual(positionRanking);
    });
  });

  describe('validateProspect', () => {
    it('should validate correct prospects', () => {
      const prospect = createTestProspect();
      expect(validateProspect(prospect)).toBe(true);
    });

    it('should reject mismatched IDs', () => {
      const prospect = createTestProspect();
      const invalid = { ...prospect, id: 'different-id' };

      expect(validateProspect(invalid)).toBe(false);
    });

    it('should reject invalid draft year', () => {
      const prospect = createTestProspect();
      const invalid = { ...prospect, draftYear: 1900 };

      expect(validateProspect(invalid)).toBe(false);
    });

    it('should reject invalid workout status', () => {
      const prospect = createTestProspect();
      const invalid = { ...prospect, combineStatus: 'INVALID' as WorkoutStatus };

      expect(validateProspect(invalid)).toBe(false);
    });
  });

  describe('getProspectDisplayName', () => {
    it('should return full name', () => {
      const prospect = createTestProspect();
      const name = getProspectDisplayName(prospect);

      expect(name).toBe(`${prospect.player.firstName} ${prospect.player.lastName}`);
    });
  });

  describe('getProspectPosition', () => {
    it('should return player position', () => {
      const player = generatePlayer({ forDraft: true, position: Position.WR });
      const college = generateCollegeProgram(
        'Texas',
        ProgramType.STATE_OF,
        Conference.SOUTHERN_CONFERENCE
      );
      const stats = createEmptyCollegeStats(Position.WR);
      const prospect = createProspect(player, college, stats, 2025);

      expect(getProspectPosition(prospect)).toBe(Position.WR);
    });
  });

  describe('hasRevealedPhysicals', () => {
    it('should return false initially', () => {
      const prospect = createTestProspect();
      expect(hasRevealedPhysicals(prospect)).toBe(false);
    });

    it('should return true after combine', () => {
      const prospect = createTestProspect();
      const updated = updateCombineStatus(prospect, WorkoutStatus.COMPLETED);

      expect(hasRevealedPhysicals(updated)).toBe(true);
    });
  });

  describe('getRevealedPhysicals', () => {
    it('should return null if not revealed', () => {
      const prospect = createTestProspect();
      expect(getRevealedPhysicals(prospect)).toBeNull();
    });

    it('should return physicals if revealed', () => {
      const prospect = createTestProspect();
      const updated = updateCombineStatus(prospect, WorkoutStatus.COMPLETED);

      const physicals = getRevealedPhysicals(updated);
      expect(physicals).toBeDefined();
      expect(physicals).toEqual(updated.player.physical);
    });
  });

  describe('createProspectView', () => {
    it('should create view with hidden physicals', () => {
      const prospect = createTestProspect();
      const view = createProspectView(prospect);

      expect(view.physicals).toBeNull();
      expect(view.name).toBe(getProspectDisplayName(prospect));
      expect(view.position).toBe(prospect.player.position);
    });

    it('should include physicals after reveal', () => {
      const prospect = createTestProspect();
      const updated = updateCombineStatus(prospect, WorkoutStatus.COMPLETED);
      const view = createProspectView(updated);

      expect(view.physicals).toBeDefined();
      expect(view.physicals).toEqual(updated.player.physical);
    });

    it('should include scout report count', () => {
      let prospect = createTestProspect();
      prospect = addScoutReport(prospect, 'report-1');
      prospect = addScoutReport(prospect, 'report-2');

      const view = createProspectView(prospect);
      expect(view.scoutReportCount).toBe(2);
    });
  });
});
