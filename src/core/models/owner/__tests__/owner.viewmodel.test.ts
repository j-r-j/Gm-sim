/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Owner View Model Tests
 * Tests that personality shows descriptions not numbers and job security maps correctly
 */

import {
  createDefaultOwner,
  createOwnerViewModel,
  getPatienceDescription,
  getSpendingDescription,
  getControlDescription,
  getLoyaltyDescription,
} from '../Owner';

import { getJobSecurityStatus } from '../PatienceMeter';

describe('Owner View Model', () => {
  describe('createOwnerViewModel', () => {
    it('should create a view model from owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.firstName = 'John';
      owner.lastName = 'Doe';

      const viewModel = createOwnerViewModel(owner);
      expect(viewModel.id).toBe('owner-1');
      expect(viewModel.fullName).toBe('John Doe');
    });

    it('should convert numeric traits to descriptions', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const viewModel = createOwnerViewModel(owner);

      // Should have string descriptions, not numbers
      expect(typeof viewModel.patienceDescription).toBe('string');
      expect(typeof viewModel.spendingDescription).toBe('string');
      expect(typeof viewModel.controlDescription).toBe('string');
      expect(typeof viewModel.loyaltyDescription).toBe('string');
    });

    it('should not expose raw numeric trait values', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const viewModel = createOwnerViewModel(owner);

      // View model should NOT have numeric traits
      expect((viewModel as any).traits).toBeUndefined();
      expect((viewModel as any).patience).toBeUndefined();
      expect((viewModel as any).spending).toBeUndefined();
    });

    it('should include secondary traits', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.secondaryTraits = ['winNow', 'prObsessed'];

      const viewModel = createOwnerViewModel(owner);
      expect(viewModel.secondaryTraits).toContain('winNow');
      expect(viewModel.secondaryTraits).toContain('prObsessed');
    });

    it('should include job security status', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.patienceMeter = 75;

      const viewModel = createOwnerViewModel(owner);
      expect(viewModel.jobSecurityStatus).toBe('secure');
    });

    it('should include active demands', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.activeDemands = [
        {
          id: 'demand-1',
          type: 'signPlayer',
          description: 'Sign the star',
          targetId: 'player-1',
          deadline: 10,
          consequence: 'Lose trust',
          issuedWeek: 5,
        },
      ];

      const viewModel = createOwnerViewModel(owner);
      expect(viewModel.activeDemands).toHaveLength(1);
    });

    it('should include history', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.yearsAsOwner = 15;
      owner.previousGMsFired = 3;
      owner.championshipsWon = 2;

      const viewModel = createOwnerViewModel(owner);
      expect(viewModel.yearsAsOwner).toBe(15);
      expect(viewModel.previousGMsFired).toBe(3);
      expect(viewModel.championshipsWon).toBe(2);
    });
  });

  describe('Personality Descriptions', () => {
    describe('getPatienceDescription', () => {
      it('should return very impatient for low values', () => {
        expect(getPatienceDescription(1)).toBe('very impatient');
        expect(getPatienceDescription(20)).toBe('very impatient');
      });

      it('should return impatient for low-moderate values', () => {
        expect(getPatienceDescription(21)).toBe('impatient');
        expect(getPatienceDescription(40)).toBe('impatient');
      });

      it('should return moderate for middle values', () => {
        expect(getPatienceDescription(41)).toBe('moderate');
        expect(getPatienceDescription(60)).toBe('moderate');
      });

      it('should return patient for high values', () => {
        expect(getPatienceDescription(61)).toBe('patient');
        expect(getPatienceDescription(80)).toBe('patient');
      });

      it('should return very patient for highest values', () => {
        expect(getPatienceDescription(81)).toBe('very patient');
        expect(getPatienceDescription(100)).toBe('very patient');
      });
    });

    describe('getSpendingDescription', () => {
      it('should return frugal for low values', () => {
        expect(getSpendingDescription(1)).toBe('frugal');
        expect(getSpendingDescription(20)).toBe('frugal');
      });

      it('should return budget-conscious for low-moderate values', () => {
        expect(getSpendingDescription(21)).toBe('budget-conscious');
        expect(getSpendingDescription(40)).toBe('budget-conscious');
      });

      it('should return moderate for middle values', () => {
        expect(getSpendingDescription(50)).toBe('moderate');
      });

      it('should return generous for high values', () => {
        expect(getSpendingDescription(70)).toBe('generous');
      });

      it('should return lavish for highest values', () => {
        expect(getSpendingDescription(90)).toBe('lavish');
      });
    });

    describe('getControlDescription', () => {
      it('should return hands-off for low values', () => {
        expect(getControlDescription(10)).toBe('hands-off');
      });

      it('should return micromanager for highest values', () => {
        expect(getControlDescription(95)).toBe('micromanager');
      });
    });

    describe('getLoyaltyDescription', () => {
      it('should return ruthless for low values', () => {
        expect(getLoyaltyDescription(10)).toBe('ruthless');
      });

      it('should return extremely loyal for highest values', () => {
        expect(getLoyaltyDescription(95)).toBe('extremely loyal');
      });
    });
  });

  describe('Job Security Status', () => {
    describe('getJobSecurityStatus', () => {
      it('should return secure for high patience', () => {
        expect(getJobSecurityStatus(85)).toBe('secure');
        expect(getJobSecurityStatus(70)).toBe('secure');
      });

      it('should return stable for moderate patience', () => {
        expect(getJobSecurityStatus(60)).toBe('stable');
        expect(getJobSecurityStatus(50)).toBe('stable');
      });

      it('should return warm seat for lower patience', () => {
        expect(getJobSecurityStatus(45)).toBe('warm seat');
        expect(getJobSecurityStatus(35)).toBe('warm seat');
      });

      it('should return hot seat for very low patience', () => {
        expect(getJobSecurityStatus(30)).toBe('hot seat');
        expect(getJobSecurityStatus(20)).toBe('hot seat');
      });

      it('should return danger for critical patience', () => {
        expect(getJobSecurityStatus(15)).toBe('danger');
        expect(getJobSecurityStatus(0)).toBe('danger');
      });
    });

    it('should map correctly in view model', () => {
      const testCases: { patience: number; expected: string }[] = [
        { patience: 85, expected: 'secure' },
        { patience: 55, expected: 'stable' },
        { patience: 40, expected: 'warm seat' },
        { patience: 25, expected: 'hot seat' },
        { patience: 10, expected: 'danger' },
      ];

      testCases.forEach(({ patience, expected }) => {
        const owner = createDefaultOwner('owner-1', 'team-1');
        owner.patienceMeter = patience;
        const viewModel = createOwnerViewModel(owner);
        expect(viewModel.jobSecurityStatus).toBe(expected);
      });
    });
  });

  describe('View Model immutability', () => {
    it('should not allow modification of original owner through view model', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.activeDemands = [
        {
          id: 'demand-1',
          type: 'signPlayer',
          description: 'Sign star',
          targetId: 'player-1',
          deadline: 10,
          consequence: 'Lose trust',
          issuedWeek: 5,
        },
      ];
      owner.personality.secondaryTraits = ['winNow'];

      const viewModel = createOwnerViewModel(owner);

      // Modifying view model arrays should not affect original
      viewModel.activeDemands.push({
        id: 'demand-2',
        type: 'other',
        description: 'Another',
        targetId: null,
        deadline: 15,
        consequence: 'Bad',
        issuedWeek: 10,
      });

      viewModel.secondaryTraits.push('prObsessed');

      expect(owner.activeDemands).toHaveLength(1);
      expect(owner.personality.secondaryTraits).toHaveLength(1);
    });
  });
});
