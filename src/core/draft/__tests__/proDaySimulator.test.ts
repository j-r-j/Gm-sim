import {
  simulateProDayForProspect,
  simulateProDays,
  getProDayResultsForProspect,
  validateProDayResults,
  ProDayType,
} from '../ProDaySimulator';
import { simulateCombine, CombineResults } from '../CombineSimulator';
import { generateDraftClass, DraftClass } from '../DraftClassGenerator';
import { WorkoutStatus } from '../Prospect';

describe('ProDaySimulator', () => {
  let draftClass: DraftClass;
  let combineResults: Map<string, CombineResults>;

  beforeAll(() => {
    draftClass = generateDraftClass({
      year: 2025,
      minProspects: 280,
      maxProspects: 300,
    });

    const combineSimulation = simulateCombine(draftClass);
    combineResults = combineSimulation.results;
  });

  describe('simulateProDayForProspect', () => {
    it('should return valid results', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(validateProDayResults(results)).toBe(true);
    });

    it('should generate measurements', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(results.measurements).toBeDefined();
      expect(results.measurements?.height).toBeGreaterThan(60);
      expect(results.measurements?.weight).toBeGreaterThan(150);
    });

    it('should have valid workout type', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(Object.values(ProDayType)).toContain(results.workoutType);
    });

    it('should generate workout results for full workouts', () => {
      let foundFullWorkout = false;

      for (let i = 0; i < 50; i++) {
        const prospect = draftClass.prospects[i];
        const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;
        const results = simulateProDayForProspect(prospect, college);

        if (results.workoutType === ProDayType.FULL_WORKOUT) {
          expect(results.workoutResults).toBeDefined();
          foundFullWorkout = true;
          break;
        }
      }

      expect(foundFullWorkout).toBe(true);
    });

    it('should generate position workouts', () => {
      let foundPositionWorkout = false;

      for (let i = 0; i < 50; i++) {
        const prospect = draftClass.prospects[i];
        const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;
        const results = simulateProDayForProspect(prospect, college);

        if (results.positionWorkouts && Object.keys(results.positionWorkouts).length > 0) {
          foundPositionWorkout = true;
          break;
        }
      }

      expect(foundPositionWorkout).toBe(true);
    });

    it('should include team attendance', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(results.attendance.length).toBeGreaterThan(0);
      expect(results.attendance.length).toBeLessThanOrEqual(32);
    });

    it('should generate observations for full workouts', () => {
      let foundObservations = false;

      for (let i = 0; i < 50; i++) {
        const prospect = draftClass.prospects[i];
        const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;
        const results = simulateProDayForProspect(prospect, college);

        if (results.observations.length > 0) {
          foundObservations = true;
          break;
        }
      }

      expect(foundObservations).toBe(true);
    });

    it('should calculate overall grade', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(results.overallGrade).toBeGreaterThanOrEqual(1);
      expect(results.overallGrade).toBeLessThanOrEqual(10);
    });

    it('should use combine results when provided', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;
      const combineResult = combineResults.get(prospect.id);

      const results = simulateProDayForProspect(prospect, college, combineResult);

      expect(validateProDayResults(results)).toBe(true);
    });
  });

  describe('simulateProDays', () => {
    it('should process all prospects', () => {
      const results = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      expect(results.results.size).toBe(draftClass.prospects.length);
      expect(results.updatedProspects.length).toBe(draftClass.prospects.length);
    });

    it('should update pro day status', () => {
      const results = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      for (const prospect of results.updatedProspects) {
        // All prospects should have updated pro day status
        expect(
          prospect.proDayStatus === WorkoutStatus.COMPLETED ||
            prospect.proDayStatus === WorkoutStatus.MEDICAL_ONLY
        ).toBe(true);
      }
    });

    it('should reveal physicals after pro day', () => {
      const results = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      let revealedCount = 0;
      for (const prospect of results.updatedProspects) {
        if (prospect.physicalsRevealed) {
          revealedCount++;
        }
      }

      // Most prospects should have revealed physicals after combine + pro day
      expect(revealedCount).toBeGreaterThan(results.updatedProspects.length * 0.5);
    });

    it('should provide summary statistics', () => {
      const results = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      expect(results.summary.totalProDays).toBe(draftClass.prospects.length);
      expect(results.summary.averageGrade).toBeGreaterThan(1);
      expect(results.summary.averageGrade).toBeLessThan(10);
    });

    it('should track workout types in summary', () => {
      const results = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      // Should have some of each type
      expect(results.summary.fullWorkouts).toBeGreaterThan(0);
      expect(results.summary.positionWorkouts).toBeGreaterThan(0);
    });
  });

  describe('getProDayResultsForProspect', () => {
    it('should retrieve results by ID', () => {
      const proDayResults = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      const prospectId = draftClass.prospects[0].id;
      const results = getProDayResultsForProspect(proDayResults.results, prospectId);

      expect(results).toBeDefined();
      expect(results?.prospectId).toBe(prospectId);
    });

    it('should return undefined for unknown ID', () => {
      const proDayResults = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      const results = getProDayResultsForProspect(proDayResults.results, 'unknown-id');

      expect(results).toBeUndefined();
    });
  });

  describe('validateProDayResults', () => {
    it('should validate correct results', () => {
      const prospect = draftClass.prospects[0];
      const college = draftClass.collegePrograms.find((c) => c.id === prospect.collegeProgramId)!;

      const results = simulateProDayForProspect(prospect, college);

      expect(validateProDayResults(results)).toBe(true);
    });

    it('should reject missing prospect ID', () => {
      const invalid = {
        prospectId: '',
        collegeProgramId: 'test',
        workoutType: ProDayType.FULL_WORKOUT,
        measurements: null,
        workoutResults: null,
        positionWorkouts: null,
        attendance: [],
        overallGrade: 5,
        observations: [],
        date: Date.now(),
      };

      expect(validateProDayResults(invalid)).toBe(false);
    });

    it('should reject invalid grade', () => {
      const invalid = {
        prospectId: 'test-id',
        collegeProgramId: 'test',
        workoutType: ProDayType.FULL_WORKOUT,
        measurements: null,
        workoutResults: null,
        positionWorkouts: null,
        attendance: [],
        overallGrade: 15,
        observations: [],
        date: Date.now(),
      };

      expect(validateProDayResults(invalid)).toBe(false);
    });

    it('should reject invalid workout type', () => {
      const invalid = {
        prospectId: 'test-id',
        collegeProgramId: 'test',
        workoutType: 'INVALID' as ProDayType,
        measurements: null,
        workoutResults: null,
        positionWorkouts: null,
        attendance: [],
        overallGrade: 5,
        observations: [],
        date: Date.now(),
      };

      expect(validateProDayResults(invalid)).toBe(false);
    });
  });

  describe('position-specific workouts', () => {
    it('should generate QB throwing accuracy', () => {
      // Find a QB prospect
      const qbProspect = draftClass.prospects.find((p) => p.player.position === 'QB');

      if (qbProspect) {
        const college = draftClass.collegePrograms.find(
          (c) => c.id === qbProspect.collegeProgramId
        )!;

        let foundThrowingDrills = false;
        for (let i = 0; i < 10; i++) {
          const results = simulateProDayForProspect(qbProspect, college);
          if (results.positionWorkouts?.throwingAccuracy) {
            expect(results.positionWorkouts.throwingAccuracy.shortPasses).toBeGreaterThan(0);
            expect(results.positionWorkouts.throwingAccuracy.mediumPasses).toBeGreaterThan(0);
            foundThrowingDrills = true;
            break;
          }
        }
        expect(foundThrowingDrills).toBe(true);
      }
    });

    it('should generate receiver catching drills', () => {
      const wrProspect = draftClass.prospects.find((p) => p.player.position === 'WR');

      if (wrProspect) {
        const college = draftClass.collegePrograms.find(
          (c) => c.id === wrProspect.collegeProgramId
        )!;

        let foundReceivingDrills = false;
        for (let i = 0; i < 10; i++) {
          const results = simulateProDayForProspect(wrProspect, college);
          if (results.positionWorkouts?.receivingDrills) {
            expect(results.positionWorkouts.receivingDrills.catchRate).toBeGreaterThan(0);
            foundReceivingDrills = true;
            break;
          }
        }
        expect(foundReceivingDrills).toBe(true);
      }
    });

    it('should generate OL blocking drills', () => {
      const olProspect = draftClass.prospects.find((p) =>
        ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.player.position)
      );

      if (olProspect) {
        const college = draftClass.collegePrograms.find(
          (c) => c.id === olProspect.collegeProgramId
        )!;

        let foundBlockingDrills = false;
        for (let i = 0; i < 10; i++) {
          const results = simulateProDayForProspect(olProspect, college);
          if (results.positionWorkouts?.blockingDrills) {
            expect(results.positionWorkouts.blockingDrills.passSet).toBeGreaterThan(0);
            foundBlockingDrills = true;
            break;
          }
        }
        expect(foundBlockingDrills).toBe(true);
      }
    });
  });

  describe('attendance levels', () => {
    it('should assign appropriate scout levels', () => {
      const proDayResults = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      const validLevels = ['director', 'area_scout', 'regional_scout'];

      for (const [, results] of proDayResults.results) {
        for (const attendance of results.attendance) {
          expect(validLevels).toContain(attendance.attendeeLevel);
        }
      }
    });

    it('should request some private workouts', () => {
      const proDayResults = simulateProDays(
        draftClass.prospects,
        draftClass.collegePrograms,
        combineResults
      );

      expect(proDayResults.summary.privateWorkoutsRequested).toBeGreaterThan(0);
    });
  });
});
