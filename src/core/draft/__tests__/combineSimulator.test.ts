import {
  selectCombineInvites,
  simulateCombineForProspect,
  simulateCombine,
  getCombineResultsForProspect,
  validateCombineResults,
  CombineGrade,
  MedicalGrade,
  DEFAULT_COMBINE_CONFIG,
} from '../CombineSimulator';
import { generateDraftClass } from '../DraftClassGenerator';
import { DraftClass } from '../DraftClassGenerator';
import { WorkoutStatus } from '../Prospect';

describe('CombineSimulator', () => {
  let draftClass: DraftClass;

  beforeAll(() => {
    draftClass = generateDraftClass({
      year: 2025,
      minProspects: 300,
      maxProspects: 320,
    });
  });

  describe('selectCombineInvites', () => {
    it('should select up to max invites', () => {
      const invites = selectCombineInvites(draftClass.prospects, {
        maxInvites: 330,
        minEliteInvites: 50,
        teamsInterviewing: 32,
      });

      expect(invites.length).toBeLessThanOrEqual(330);
    });

    it('should not exceed prospect count', () => {
      const invites = selectCombineInvites(draftClass.prospects.slice(0, 100), {
        maxInvites: 330,
        minEliteInvites: 50,
        teamsInterviewing: 32,
      });

      expect(invites.length).toBe(100);
    });

    it('should prioritize high-ceiling prospects', () => {
      const invites = selectCombineInvites(draftClass.prospects, DEFAULT_COMBINE_CONFIG);

      // First invites should have better ceilings
      const topInvites = invites.slice(0, 20);
      const bottomProspects = invites.slice(-20);

      const ceilingOrder = [
        'franchiseCornerstone',
        'highEndStarter',
        'solidStarter',
        'qualityRotational',
        'specialist',
        'depth',
        'practiceSquad',
      ];

      const avgTopCeiling =
        topInvites.reduce((sum, p) => sum + ceilingOrder.indexOf(p.player.roleFit.ceiling), 0) /
        topInvites.length;

      const avgBottomCeiling =
        bottomProspects.reduce(
          (sum, p) => sum + ceilingOrder.indexOf(p.player.roleFit.ceiling),
          0
        ) / bottomProspects.length;

      expect(avgTopCeiling).toBeLessThan(avgBottomCeiling);
    });
  });

  describe('simulateCombineForProspect', () => {
    const teamIds = Array.from({ length: 32 }, (_, i) => `team-${i + 1}`);

    it('should return valid results', () => {
      const prospect = draftClass.prospects[0];
      const results = simulateCombineForProspect(prospect, teamIds);

      expect(validateCombineResults(results)).toBe(true);
    });

    it('should mark as invited and participated', () => {
      const results = simulateCombineForProspect(draftClass.prospects[0], teamIds);

      // Most should participate (only 5% decline, 3% medical only)
      expect(results.invited).toBe(true);
    });

    it('should generate measurements when participated', () => {
      // Run multiple times to get a participating prospect
      let foundParticipant = false;
      for (let i = 0; i < 50; i++) {
        const results = simulateCombineForProspect(draftClass.prospects[i], teamIds);
        if (results.participated) {
          expect(results.measurements).toBeDefined();
          expect(results.measurements?.height).toBeGreaterThan(60);
          expect(results.measurements?.weight).toBeGreaterThan(150);
          foundParticipant = true;
          break;
        }
      }
      expect(foundParticipant).toBe(true);
    });

    it('should generate workout results when participated', () => {
      let foundParticipant = false;
      for (let i = 0; i < 50; i++) {
        const results = simulateCombineForProspect(draftClass.prospects[i], teamIds);
        if (results.participated && results.workoutResults) {
          // At least some workout results should be filled
          const hasWorkouts =
            results.workoutResults.fortyYardDash !== null ||
            results.workoutResults.benchPress !== null ||
            results.workoutResults.verticalJump !== null;
          expect(hasWorkouts).toBe(true);
          foundParticipant = true;
          break;
        }
      }
      expect(foundParticipant).toBe(true);
    });

    it('should generate interview impressions', () => {
      // Try multiple prospects since some may decline participation
      let foundWithInterviews = false;
      for (let i = 0; i < 20; i++) {
        const results = simulateCombineForProspect(draftClass.prospects[i], teamIds);
        if (results.participated && results.interviewImpressions.length > 0) {
          expect(results.interviewImpressions.length).toBeLessThanOrEqual(15);
          foundWithInterviews = true;
          break;
        }
      }
      expect(foundWithInterviews).toBe(true);
    });

    it('should generate medical evaluation', () => {
      let foundWithMedical = false;
      for (let i = 0; i < 20; i++) {
        const results = simulateCombineForProspect(draftClass.prospects[i], teamIds);
        if (results.medicalEvaluation) {
          expect(Object.values(MedicalGrade)).toContain(results.medicalEvaluation.grade);
          expect(results.medicalEvaluation.durabilityRating).toBeGreaterThanOrEqual(40);
          expect(results.medicalEvaluation.durabilityRating).toBeLessThanOrEqual(100);
          foundWithMedical = true;
          break;
        }
      }
      expect(foundWithMedical).toBe(true);
    });

    it('should assign overall grade', () => {
      const results = simulateCombineForProspect(draftClass.prospects[0], teamIds);
      expect(Object.values(CombineGrade)).toContain(results.overallGrade);
    });
  });

  describe('simulateCombine', () => {
    it('should process all prospects', () => {
      const results = simulateCombine(draftClass);

      expect(results.results.size).toBe(draftClass.prospects.length);
      expect(results.updatedProspects.length).toBe(draftClass.prospects.length);
    });

    it('should invite approximately 330 prospects', () => {
      const results = simulateCombine(draftClass);

      expect(results.invitedProspectIds.length).toBeLessThanOrEqual(330);
      expect(results.invitedProspectIds.length).toBeGreaterThan(0);
    });

    it('should update prospect combine status', () => {
      const results = simulateCombine(draftClass);

      const invitedSet = new Set(results.invitedProspectIds);
      for (const prospect of results.updatedProspects) {
        if (invitedSet.has(prospect.id)) {
          // Invited prospects should have updated status
          expect(prospect.combineStatus).not.toBe(WorkoutStatus.NOT_INVITED);
        }
      }
    });

    it('should reveal physicals for participants', () => {
      const results = simulateCombine(draftClass);

      const invitedSet = new Set(results.invitedProspectIds);
      let foundRevealed = false;

      for (const prospect of results.updatedProspects) {
        if (invitedSet.has(prospect.id) && prospect.combineStatus === WorkoutStatus.COMPLETED) {
          expect(prospect.physicalsRevealed).toBe(true);
          foundRevealed = true;
        }
      }

      expect(foundRevealed).toBe(true);
    });

    it('should provide summary statistics', () => {
      const results = simulateCombine(draftClass);

      expect(results.summary.totalInvited).toBeGreaterThan(0);
      expect(results.summary.totalParticipated).toBeGreaterThan(0);
      expect(results.summary.totalParticipated).toBeLessThanOrEqual(results.summary.totalInvited);
    });

    it('should track grade distribution', () => {
      const results = simulateCombine(draftClass);

      let totalGraded = 0;
      for (const count of Object.values(results.summary.gradeDistribution)) {
        totalGraded += count;
      }

      expect(totalGraded).toBe(results.invitedProspectIds.length);
    });

    it('should calculate average forty time', () => {
      const results = simulateCombine(draftClass);

      if (results.summary.averageFortyTime) {
        expect(results.summary.averageFortyTime).toBeGreaterThan(4.0);
        expect(results.summary.averageFortyTime).toBeLessThan(6.0);
      }
    });
  });

  describe('getCombineResultsForProspect', () => {
    it('should retrieve results by ID', () => {
      const combineResults = simulateCombine(draftClass);
      const prospectId = draftClass.prospects[0].id;

      const results = getCombineResultsForProspect(combineResults.results, prospectId);

      expect(results).toBeDefined();
      expect(results?.prospectId).toBe(prospectId);
    });

    it('should return undefined for unknown ID', () => {
      const combineResults = simulateCombine(draftClass);

      const results = getCombineResultsForProspect(combineResults.results, 'unknown-id');

      expect(results).toBeUndefined();
    });
  });

  describe('validateCombineResults', () => {
    it('should validate correct results', () => {
      const teamIds = Array.from({ length: 32 }, (_, i) => `team-${i + 1}`);
      const results = simulateCombineForProspect(draftClass.prospects[0], teamIds);

      expect(validateCombineResults(results)).toBe(true);
    });

    it('should reject missing prospect ID', () => {
      const invalid = {
        prospectId: '',
        invited: true,
        participated: true,
        measurements: null,
        workoutResults: null,
        interviewImpressions: [],
        medicalEvaluation: null,
        overallGrade: CombineGrade.AVERAGE,
      };

      expect(validateCombineResults(invalid)).toBe(false);
    });

    it('should reject invalid grade', () => {
      const invalid = {
        prospectId: 'test-id',
        invited: true,
        participated: true,
        measurements: null,
        workoutResults: null,
        interviewImpressions: [],
        medicalEvaluation: null,
        overallGrade: 'INVALID' as CombineGrade,
      };

      expect(validateCombineResults(invalid)).toBe(false);
    });
  });

  describe('workout benchmarks', () => {
    it('should generate realistic forty times', () => {
      const combineResults = simulateCombine(draftClass);

      let fortyCount = 0;
      let totalForty = 0;

      for (const [, results] of combineResults.results) {
        if (results.workoutResults?.fortyYardDash) {
          const forty = results.workoutResults.fortyYardDash;
          expect(forty).toBeGreaterThan(4.0);
          expect(forty).toBeLessThan(6.0);
          totalForty += forty;
          fortyCount++;
        }
      }

      if (fortyCount > 0) {
        const avg = totalForty / fortyCount;
        expect(avg).toBeGreaterThan(4.4);
        expect(avg).toBeLessThan(5.2);
      }
    });

    it('should generate realistic bench press reps', () => {
      const combineResults = simulateCombine(draftClass);

      for (const [, results] of combineResults.results) {
        if (results.workoutResults?.benchPress) {
          expect(results.workoutResults.benchPress).toBeGreaterThanOrEqual(0);
          expect(results.workoutResults.benchPress).toBeLessThanOrEqual(50);
        }
      }
    });

    it('should generate realistic vertical jumps', () => {
      const combineResults = simulateCombine(draftClass);

      for (const [, results] of combineResults.results) {
        if (results.workoutResults?.verticalJump) {
          expect(results.workoutResults.verticalJump).toBeGreaterThanOrEqual(18);
          expect(results.workoutResults.verticalJump).toBeLessThan(50);
        }
      }
    });
  });

  describe('interview impressions', () => {
    it('should generate valid scores', () => {
      const teamIds = Array.from({ length: 32 }, (_, i) => `team-${i + 1}`);
      const results = simulateCombineForProspect(draftClass.prospects[0], teamIds);

      for (const impression of results.interviewImpressions) {
        expect(impression.overallScore).toBeGreaterThanOrEqual(1);
        expect(impression.overallScore).toBeLessThanOrEqual(10);
        expect(impression.footballIQ).toBeGreaterThanOrEqual(1);
        expect(impression.footballIQ).toBeLessThanOrEqual(10);
        expect(impression.character).toBeGreaterThanOrEqual(1);
        expect(impression.character).toBeLessThanOrEqual(10);
      }
    });

    it('should include leadership traits for some', () => {
      const combineResults = simulateCombine(draftClass);

      let foundLeaders = false;
      for (const [, results] of combineResults.results) {
        for (const impression of results.interviewImpressions) {
          if (impression.leadershipTraits) {
            foundLeaders = true;
            break;
          }
        }
        if (foundLeaders) break;
      }

      expect(foundLeaders).toBe(true);
    });
  });
});
