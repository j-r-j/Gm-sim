/**
 * Contract Lifecycle Integration Tests
 *
 * Tests the complete contract system: creation, cap accounting, extensions,
 * restructures, franchise tags, cuts, and dead money.
 */

import {
  createPlayerContract,
  validatePlayerContract,
  getCapHitForYear,
  getCurrentCapHit,
  calculateDeadMoney,
  calculateCapSavings,
  advanceContractYear,
  isExpiringContract,
  getContractEndYear,
  getContractSummary,
  createMinimumContract,
  getMinimumSalary,
  createContractOffer,
  canTradePlayer,
  PlayerContract,
  ContractOffer,
  VETERAN_MINIMUM_SALARY,
} from '@core/contracts/Contract';
import {
  createSalaryCapState,
  addContract,
  removeContract,
  addCapPenalty,
  calculateCapUsage,
  getCapStatus,
  projectCap,
  calculateRollover,
  advanceCapYear,
  getContractsByCapHit,
  getExpiringContracts,
  canAffordContract,
  getEffectiveCapSpace,
  validateSalaryCapState,
  syncTeamFinances,
  SalaryCapState,
} from '@core/contracts/SalaryCapManager';
import {
  previewRestructure,
  restructureContract,
  getMaxRestructureAmount,
  getRestructureOptions,
  executePayCut,
} from '@core/contracts/RestructureSystem';
import {
  applyFranchiseTag,
  createTeamTagStatus,
  canUseFranchiseTag,
  canUseTransitionTag,
  getFranchiseTagValue,
  getTransitionTagValue,
  removeFranchiseTag,
  advanceTagYear,
  validateFranchiseTag,
  FRANCHISE_TAG_VALUES,
} from '@core/contracts/FranchiseTagSystem';
import {
  analyzeStandardCut,
  analyzePostJune1Cut,
  getCutBreakdown,
  executeCut,
  rankCutCandidates,
  createCutPenalties,
} from '@core/contracts/CutCalculator';
import {
  extendContract,
  calculateMarketValue,
  generatePlayerDemands,
  evaluateOffer,
  getExtensionEligible,
  calculateRecommendedOffer,
} from '@core/contracts/ExtensionSystem';
import {
  createDefaultTeamFinances,
} from '@core/models/team/TeamFinances';
import { Position } from '@core/models/player/Position';

const YEAR = 2025;
const TEAM_ID = 'team-0';
const SALARY_CAP = 255000; // $255M in thousands

// Helper to create a standard contract
function createTestContract(
  playerId: string,
  years: number,
  bonusPerYear: number,
  salaryPerYear: number,
  options?: { noTradeClause?: boolean; type?: 'rookie' | 'veteran' }
): PlayerContract {
  const offer: ContractOffer = {
    years,
    bonusPerYear,
    salaryPerYear,
    noTradeClause: options?.noTradeClause ?? false,
  };
  return createPlayerContract(
    playerId,
    `Player ${playerId}`,
    TEAM_ID,
    Position.QB,
    offer,
    YEAR,
    options?.type ?? 'veteran'
  );
}

describe('Contract Lifecycle Integration Tests', () => {
  // ======================================================
  // 1. Contract Creation & Validation
  // ======================================================
  describe('contract creation and validation', () => {
    it('should create a valid veteran contract', () => {
      const contract = createTestContract('player-1', 4, 5000, 10000);

      expect(validatePlayerContract(contract)).toBe(true);
      expect(contract.totalYears).toBe(4);
      expect(contract.yearsRemaining).toBe(4);
      expect(contract.status).toBe('active');
      expect(contract.type).toBe('veteran');
      expect(contract.averageAnnualValue).toBe(15000);
      expect(contract.totalValue).toBe(60000); // 15000 * 4
      expect(contract.guaranteedMoney).toBe(20000); // 5000 * 4
    });

    it('should create yearly breakdown with correct cap hits', () => {
      const contract = createTestContract('player-2', 3, 3000, 7000);

      expect(contract.yearlyBreakdown.length).toBe(3);

      for (let i = 0; i < 3; i++) {
        const year = contract.yearlyBreakdown[i];
        expect(year.year).toBe(YEAR + i);
        expect(year.bonus).toBe(3000);
        expect(year.salary).toBe(7000);
        expect(year.capHit).toBe(10000);
        expect(year.isVoidYear).toBe(false);
      }
    });

    it('should create minimum contract correctly', () => {
      const contract = createMinimumContract(
        'player-min',
        'Player Min',
        TEAM_ID,
        Position.RB,
        3, // 3 years experience
        YEAR
      );

      expect(validatePlayerContract(contract)).toBe(true);
      expect(contract.totalYears).toBe(1);
      const expectedMin = getMinimumSalary(3);
      expect(contract.averageAnnualValue).toBe(expectedMin);
    });

    it('should handle no-trade clause', () => {
      const contractWithNTC = createTestContract('player-ntc', 4, 5000, 15000, {
        noTradeClause: true,
      });
      const contractNoNTC = createTestContract('player-no-ntc', 4, 5000, 15000);

      expect(contractWithNTC.hasNoTradeClause).toBe(true);
      expect(contractNoNTC.hasNoTradeClause).toBe(false);

      const ntcResult = canTradePlayer(contractWithNTC);
      expect(ntcResult.canTrade).toBe(false);

      const noNtcResult = canTradePlayer(contractNoNTC);
      expect(noNtcResult.canTrade).toBe(true);
    });

    it('createContractOffer should convert old-style params', () => {
      const offer = createContractOffer({
        years: 4,
        totalValue: 60000,
        guaranteedMoney: 30000,
      });

      expect(offer.years).toBe(4);
      expect(offer.bonusPerYear).toBe(7500); // 30000 / 4
      expect(offer.salaryPerYear).toBe(7500); // 15000 AAV - 7500 bonus
    });
  });

  // ======================================================
  // 2. Salary Cap Management
  // ======================================================
  describe('salary cap management', () => {
    let capState: SalaryCapState;
    let contract1: PlayerContract;
    let contract2: PlayerContract;

    beforeEach(() => {
      capState = createSalaryCapState(TEAM_ID, YEAR, SALARY_CAP);
      contract1 = createTestContract('player-1', 4, 5000, 10000);
      contract2 = createTestContract('player-2', 3, 3000, 7000);
    });

    it('should initialize with zero cap usage', () => {
      expect(validateSalaryCapState(capState)).toBe(true);
      expect(calculateCapUsage(capState, YEAR)).toBe(0);
      expect(getCapStatus(capState).capSpace).toBe(SALARY_CAP);
    });

    it('should track cap usage when contracts are added', () => {
      capState = addContract(capState, contract1);
      capState = addContract(capState, contract2);

      const usage = calculateCapUsage(capState, YEAR);
      expect(usage).toBe(25000); // 15000 + 10000

      const status = getCapStatus(capState);
      expect(status.currentCapUsage).toBe(25000);
      expect(status.capSpace).toBe(SALARY_CAP - 25000);
      expect(status.isOverCap).toBe(false);
    });

    it('should update cap when contract is removed', () => {
      capState = addContract(capState, contract1);
      capState = addContract(capState, contract2);
      capState = removeContract(capState, contract1.id);

      const usage = calculateCapUsage(capState, YEAR);
      expect(usage).toBe(10000); // Only contract2 remains
    });

    it('should detect when team is over cap', () => {
      // Create a massive contract to put team over cap
      const megaContract = createTestContract('mega', 1, 100000, 200000);
      capState = addContract(capState, megaContract);

      const status = getCapStatus(capState);
      expect(status.isOverCap).toBe(true);
      expect(status.capSpace).toBeLessThan(0);
    });

    it('should check if team can afford a new contract', () => {
      capState = addContract(capState, contract1);

      const canAffordSmall = canAffordContract(capState, 1000);
      expect(canAffordSmall).toBe(true);

      const canAffordHuge = canAffordContract(capState, SALARY_CAP);
      expect(canAffordHuge).toBe(false);
    });

    it('should calculate effective cap space accounting for roster minimums', () => {
      // With no contracts, need to reserve space for 53 roster spots
      const effectiveSpace = getEffectiveCapSpace(capState);
      const minimumReserve = 53 * 795; // 53 spots * minimum salary
      expect(effectiveSpace).toBe(SALARY_CAP - minimumReserve);
    });

    it('should project cap for future years', () => {
      capState = addContract(capState, contract1);
      const projections = projectCap(capState, 3);

      expect(projections.length).toBe(4); // Current + 3 future
      expect(projections[0].year).toBe(YEAR);
      expect(projections[0].committedSpend).toBe(15000);

      // Future years should show growing cap
      for (let i = 1; i < projections.length; i++) {
        expect(projections[i].projectedCap).toBeGreaterThan(projections[i - 1].projectedCap);
      }
    });

    it('should sort contracts by cap hit', () => {
      const smallContract = createTestContract('small', 2, 1000, 2000);
      capState = addContract(capState, contract1); // 15000
      capState = addContract(capState, contract2); // 10000
      capState = addContract(capState, smallContract); // 3000

      const sorted = getContractsByCapHit(capState);
      expect(sorted.length).toBe(3);
      expect(sorted[0].capHit).toBe(15000);
      expect(sorted[1].capHit).toBe(10000);
      expect(sorted[2].capHit).toBe(3000);
    });

    it('should find expiring contracts', () => {
      const expiringContract = createTestContract('expiring', 1, 1000, 2000);
      capState = addContract(capState, contract1); // 4 year
      capState = addContract(capState, expiringContract); // 1 year

      const expiring = getExpiringContracts(capState);
      expect(expiring.length).toBe(1);
      expect(expiring[0].playerId).toBe('expiring');
    });

    it('should handle cap rollover on year advance', () => {
      capState = addContract(capState, contract1); // 15000 cap hit
      const rollover = calculateRollover(capState);
      expect(rollover).toBe(SALARY_CAP - 15000);

      const nextYear = advanceCapYear(capState, SALARY_CAP);
      expect(nextYear.currentYear).toBe(YEAR + 1);
      expect(nextYear.rollover).toBeGreaterThan(0);
      expect(nextYear.salaryCap).toBeGreaterThan(SALARY_CAP); // Baseline + rollover
    });

    it('should sync team finances from cap state', () => {
      capState = addContract(capState, contract1);
      const finances = createDefaultTeamFinances(TEAM_ID, SALARY_CAP);
      const synced = syncTeamFinances(finances, capState);

      expect(synced.salaryCap).toBe(SALARY_CAP);
      expect(synced.currentCapUsage).toBe(15000);
      expect(synced.capSpace).toBe(SALARY_CAP - 15000);
    });

    it('should handle cap penalties for dead money', () => {
      capState = addCapPenalty(capState, {
        id: 'penalty-1',
        playerId: 'cut-player',
        playerName: 'Cut Player',
        reason: 'cut',
        amount: 5000,
        year: YEAR,
        yearsRemaining: 1,
      });

      const usage = calculateCapUsage(capState, YEAR);
      expect(usage).toBe(5000);
    });
  });

  // ======================================================
  // 3. Contract Restructure
  // ======================================================
  describe('contract restructuring', () => {
    it('should calculate max restructure amount', () => {
      const contract = createTestContract('player-r', 3, 3000, 12000);
      const maxAmount = getMaxRestructureAmount(contract, YEAR);
      // Max is salary minus veteran minimum (1215)
      expect(maxAmount).toBe(12000 - 1215);
    });

    it('should preview restructure correctly', () => {
      const contract = createTestContract('player-r', 3, 3000, 12000);
      const preview = previewRestructure(contract, YEAR, 6000);

      expect(preview.originalCapHit).toBe(15000);
      expect(preview.capSavings).toBeGreaterThan(0);
      expect(preview.newCapHit).toBeLessThan(preview.originalCapHit);
    });

    it('should execute restructure and create new contract', () => {
      const contract = createTestContract('player-r', 3, 3000, 12000);
      const result = restructureContract(contract, YEAR, 6000);

      expect(result.success).toBe(true);
      expect(result.newContract).not.toBeNull();
      expect(result.details).not.toBeNull();

      const newContract = result.newContract!;
      const newCapHit = getCapHitForYear(newContract, YEAR);
      const originalCapHit = getCapHitForYear(contract, YEAR);

      // Current year cap hit should decrease
      expect(newCapHit).toBeLessThan(originalCapHit);

      // Future years should increase due to proration
      const futureCapHit = getCapHitForYear(newContract, YEAR + 1);
      const originalFutureCapHit = getCapHitForYear(contract, YEAR + 1);
      expect(futureCapHit).toBeGreaterThan(originalFutureCapHit);
    });

    it('should reject restructure exceeding max amount', () => {
      const contract = createTestContract('player-r', 3, 3000, 12000);
      const maxAmount = getMaxRestructureAmount(contract, YEAR);
      const result = restructureContract(contract, YEAR, maxAmount + 1000);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should get restructure options', () => {
      const contract = createTestContract('player-r', 3, 3000, 12000);
      const options = getRestructureOptions(contract, YEAR);

      expect(options.canRestructure).toBe(true);
      expect(options.maxConversion).toBeGreaterThan(0);
      expect(options.suggestedConversions.length).toBeGreaterThan(0);
    });

    it('should execute pay cut', () => {
      const contract = createTestContract('player-pc', 3, 3000, 12000);
      const result = executePayCut(contract, YEAR, 8000); // Cut from 12000 to 8000

      expect(result.success).toBe(true);
      expect(result.newContract).not.toBeNull();
      expect(result.details!.payCutAmount).toBe(4000);
    });
  });

  // ======================================================
  // 4. Franchise Tag System
  // ======================================================
  describe('franchise tag system', () => {
    it('should calculate correct franchise tag values', () => {
      const qbTag = getFranchiseTagValue(Position.QB, 1, YEAR);
      const rbTag = getFranchiseTagValue(Position.RB, 1, YEAR);

      // QB should be most expensive
      expect(qbTag).toBeGreaterThan(rbTag);
      expect(qbTag).toBeGreaterThan(0);
    });

    it('should calculate transition tag as less than franchise tag', () => {
      const franchiseValue = getFranchiseTagValue(Position.WR, 1, YEAR);
      const transitionValue = getTransitionTagValue(Position.WR, YEAR);

      expect(transitionValue).toBeLessThan(franchiseValue);
      expect(transitionValue).toBeGreaterThan(0);
    });

    it('should apply franchise tag and create 1-year contract', () => {
      let tagStatus = createTeamTagStatus(TEAM_ID, YEAR);
      expect(canUseFranchiseTag(tagStatus).canUse).toBe(true);

      const result = applyFranchiseTag(
        tagStatus,
        'player-tag',
        'Player Tag',
        Position.DE,
        'exclusive'
      );

      expect(result.success).toBe(true);
      expect(result.tag).not.toBeNull();
      expect(result.contract).not.toBeNull();
      expect(result.updatedStatus).not.toBeNull();

      // Validate the tag
      expect(validateFranchiseTag(result.tag!)).toBe(true);
      expect(result.tag!.type).toBe('exclusive');
      expect(result.tag!.isTagged).toBe(true);

      // Verify contract is 1 year
      const contract = result.contract!;
      expect(validatePlayerContract(contract)).toBe(true);
      expect(contract.totalYears).toBe(1);
      expect(contract.type).toBe('franchise_tag');

      // Tag salary should match position tag value
      const expectedSalary = getFranchiseTagValue(Position.DE, 1, YEAR);
      expect(result.tag!.salary).toBe(expectedSalary);
    });

    it('should prevent using two franchise tags in same year', () => {
      let tagStatus = createTeamTagStatus(TEAM_ID, YEAR);

      // Apply first tag
      const result1 = applyFranchiseTag(
        tagStatus,
        'player-1',
        'Player 1',
        Position.QB,
        'exclusive'
      );
      expect(result1.success).toBe(true);
      tagStatus = result1.updatedStatus!;

      // Try second franchise tag
      const result2 = applyFranchiseTag(
        tagStatus,
        'player-2',
        'Player 2',
        Position.WR,
        'exclusive'
      );
      expect(result2.success).toBe(false);
      expect(result2.error).toBeTruthy();
    });

    it('should allow transition tag after franchise tag (on different player)', () => {
      let tagStatus = createTeamTagStatus(TEAM_ID, YEAR);

      // Apply franchise tag
      const result1 = applyFranchiseTag(
        tagStatus,
        'player-1',
        'Player 1',
        Position.QB,
        'exclusive'
      );
      tagStatus = result1.updatedStatus!;

      // Apply transition tag
      const result2 = applyFranchiseTag(
        tagStatus,
        'player-2',
        'Player 2',
        Position.WR,
        'transition'
      );
      expect(result2.success).toBe(true);
    });

    it('should increase salary for consecutive tags', () => {
      const firstTag = getFranchiseTagValue(Position.QB, 1, YEAR);
      const secondTag = getFranchiseTagValue(Position.QB, 2, YEAR);
      const thirdTag = getFranchiseTagValue(Position.QB, 3, YEAR);

      expect(secondTag).toBeGreaterThan(firstTag);
      expect(thirdTag).toBeGreaterThan(secondTag);
    });

    it('should remove franchise tag when player signs long-term deal', () => {
      let tagStatus = createTeamTagStatus(TEAM_ID, YEAR);

      const result = applyFranchiseTag(
        tagStatus,
        'player-tag',
        'Player Tag',
        Position.QB,
        'exclusive'
      );
      tagStatus = result.updatedStatus!;

      const updated = removeFranchiseTag(tagStatus, 'player-tag', true);
      expect(updated.taggedPlayerId).toBeNull();
    });

    it('should reset tag status on year advance', () => {
      let tagStatus = createTeamTagStatus(TEAM_ID, YEAR);

      const result = applyFranchiseTag(
        tagStatus,
        'player-tag',
        'Player Tag',
        Position.QB,
        'exclusive'
      );
      tagStatus = result.updatedStatus!;
      expect(tagStatus.hasUsedFranchiseTag).toBe(true);

      const nextYear = advanceTagYear(tagStatus, YEAR + 1);
      expect(nextYear.hasUsedFranchiseTag).toBe(false);
      expect(nextYear.taggedPlayerId).toBeNull();
    });
  });

  // ======================================================
  // 5. Cut Calculator & Dead Money
  // ======================================================
  describe('player cuts and dead money', () => {
    it('should analyze standard cut correctly', () => {
      // Contract with guaranteed bonus and non-guaranteed salary
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      const analysis = analyzeStandardCut(contract, YEAR);

      expect(analysis.currentCapHit).toBe(15000);
      // Dead money = remaining bonus for all future years
      expect(analysis.deadMoney).toBe(15000); // 5000 * 3 years
      // Cap savings = non-guaranteed salary
      expect(analysis.capSavings).toBe(10000);
    });

    it('should analyze post-June 1 cut spreading dead money', () => {
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      const analysis = analyzePostJune1Cut(contract, YEAR);

      expect(analysis.deadMoney).toBeDefined();
      // Post-June 1 spreads dead money over 2 years
      expect(analysis.secondYearDeadMoney).toBeGreaterThanOrEqual(0);
    });

    it('should provide full cut breakdown with best option', () => {
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      const breakdown = getCutBreakdown(contract, YEAR);

      expect(breakdown.standardCut).toBeDefined();
      expect(breakdown.postJune1Cut).toBeDefined();
      expect(breakdown.designatedPostJune1Cut).toBeDefined();
      expect(breakdown.bestOption).toBeDefined();
      expect(breakdown.bestOptionReason).toBeTruthy();
    });

    it('should execute cut and create dead money penalties', () => {
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      const result = executeCut(contract, YEAR, 'standard');

      expect(result.success).toBe(true);
      expect(result.contract.status).toBe('voided');
      expect(result.contract.yearsRemaining).toBe(0);
      expect(result.capSavings).toBe(10000);
    });

    it('should create cap penalties from cut', () => {
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      const penalties = createCutPenalties(contract, YEAR, 'standard');

      expect(penalties.length).toBeGreaterThan(0);
      for (const penalty of penalties) {
        expect(penalty.reason).toBe('cut');
        expect(penalty.amount).toBeGreaterThan(0);
        expect(penalty.playerId).toBe('player-cut');
      }
    });

    it('should rank cut candidates', () => {
      const contracts = [
        createTestContract('expensive', 2, 2000, 20000), // High salary, moderate bonus
        createTestContract('cheap', 2, 1000, 3000), // Low savings
        createTestContract('golden', 2, 15000, 2000), // High bonus, low salary (bad to cut)
      ];

      const candidates = rankCutCandidates(contracts, YEAR);

      // Should rank by value score (least dead money per dollar saved is best)
      expect(candidates.length).toBeGreaterThanOrEqual(1);
      // The expensive contract with low guarantees should be a good cut candidate
      if (candidates.length > 1) {
        expect(candidates[0].valueScore).toBeLessThanOrEqual(candidates[1].valueScore);
      }
    });

    it('should integrate cuts with salary cap state', () => {
      let capState = createSalaryCapState(TEAM_ID, YEAR, SALARY_CAP);
      const contract = createTestContract('player-cut', 3, 5000, 10000);
      capState = addContract(capState, contract);

      const usageBefore = calculateCapUsage(capState, YEAR);
      expect(usageBefore).toBe(15000);

      // Execute cut
      const cutResult = executeCut(contract, YEAR, 'standard');
      expect(cutResult.success).toBe(true);

      // Remove contract from cap
      capState = removeContract(capState, contract.id);

      // Add dead money penalties
      for (const penalty of cutResult.penalties) {
        capState = addCapPenalty(capState, penalty);
      }

      // Cap usage should now be just the dead money
      const usageAfter = calculateCapUsage(capState, YEAR);
      // Dead money = 15000 (3 years * 5000 bonus), cap savings = 10000 salary
      expect(usageAfter).toBe(15000); // Dead money
    });
  });

  // ======================================================
  // 6. Contract Extensions
  // ======================================================
  describe('contract extensions', () => {
    it('should extend an active contract', () => {
      const contract = createTestContract('player-ext', 2, 3000, 8000);
      const result = extendContract(contract, 3, 6000, 12000, YEAR);

      expect(result.success).toBe(true);
      expect(result.yearsAdded).toBe(3);
      expect(result.newContract).not.toBeNull();

      const extended = result.newContract!;
      expect(extended.type).toBe('extension');
      expect(extended.totalYears).toBe(5); // 2 remaining + 3 new
      expect(extended.yearsRemaining).toBe(5);
    });

    it('should not extend expired contracts', () => {
      const contract = createTestContract('player-exp', 1, 3000, 8000);
      const expired: PlayerContract = {
        ...contract,
        status: 'expired',
        yearsRemaining: 0,
      };

      const result = extendContract(expired, 2, 5000, 10000, YEAR);
      expect(result.success).toBe(false);
    });

    it('should get extension-eligible contracts', () => {
      const eligible = createTestContract('eligible', 1, 3000, 8000); // Last year
      const notEligible = createTestContract('not-eligible', 4, 3000, 8000); // 4 years left
      const tagged: PlayerContract = {
        ...createTestContract('tagged', 1, 10000, 0),
        type: 'franchise_tag',
      };

      const contracts = [eligible, notEligible, tagged];
      const extensionEligible = getExtensionEligible(contracts, YEAR);

      expect(extensionEligible.length).toBe(1);
      expect(extensionEligible[0].playerId).toBe('eligible');
    });

    it('should calculate market value for extension pricing', () => {
      const valuation = calculateMarketValue(Position.QB, 90, 26, 4, YEAR);

      expect(valuation.marketTier).toBe('elite');
      expect(valuation.estimatedAAV).toBeGreaterThan(0);
      expect(valuation.estimatedYears).toBeGreaterThanOrEqual(1);
    });

    it('should generate and evaluate player demands', () => {
      const valuation = calculateMarketValue(Position.WR, 80, 27, 5, YEAR);
      const demands = generatePlayerDemands(valuation, {
        greedy: 50,
        loyal: 50,
        competitive: 50,
      });

      expect(demands.minimumAAV).toBeGreaterThan(0);
      expect(demands.preferredAAV).toBeGreaterThan(demands.minimumAAV);

      // Create an offer that meets demands
      const offer: ContractOffer = {
        years: demands.preferredYears,
        bonusPerYear: Math.round(demands.preferredAAV * 0.5),
        salaryPerYear: Math.round(demands.preferredAAV * 0.5),
        noTradeClause: demands.noTradeClause,
      };

      const negotiation = evaluateOffer(offer, demands);
      // Meeting preferred terms should be accepted or very close
      expect(negotiation.closeness).toBeGreaterThan(0.7);
    });

    it('should calculate recommended extension offer', () => {
      const valuation = calculateMarketValue(Position.DE, 85, 27, 5, YEAR);
      const contract = createTestContract('player-rec', 1, 3000, 8000);
      const recommended = calculateRecommendedOffer(valuation, contract);

      expect(recommended.years).toBeGreaterThanOrEqual(1);
      expect(recommended.bonusPerYear).toBeGreaterThan(0);
      expect(recommended.salaryPerYear).toBeGreaterThan(0);
    });
  });

  // ======================================================
  // 7. Contract Year Advancement
  // ======================================================
  describe('contract year advancement', () => {
    it('should advance contract year and reduce remaining', () => {
      const contract = createTestContract('player-adv', 4, 3000, 8000);
      const advanced = advanceContractYear(contract);

      expect(advanced).not.toBeNull();
      expect(advanced!.yearsRemaining).toBe(3);
      expect(advanced!.status).toBe('active');
    });

    it('should expire contract when no years remain', () => {
      const contract = createTestContract('player-exp', 1, 3000, 8000);
      const advanced = advanceContractYear(contract);

      expect(advanced).not.toBeNull();
      expect(advanced!.yearsRemaining).toBe(0);
      expect(advanced!.status).toBe('expired');
    });

    it('should detect expiring contracts', () => {
      const expiring = createTestContract('player-1yr', 1, 3000, 8000);
      const multi = createTestContract('player-3yr', 3, 3000, 8000);

      expect(isExpiringContract(expiring)).toBe(true);
      expect(isExpiringContract(multi)).toBe(false);
    });

    it('should calculate contract end year', () => {
      const contract = createTestContract('player-end', 4, 3000, 8000);
      expect(getContractEndYear(contract)).toBe(YEAR + 3); // signed in 2025, 4 years = 2028 (end of 2028)
    });

    it('should provide contract summary for display', () => {
      const contract = createTestContract('player-sum', 3, 5000, 10000);
      const summary = getContractSummary(contract, YEAR);

      expect(summary.years).toBe(3);
      expect(summary.yearsRemaining).toBe(3);
      expect(summary.statusDescription).toBe('Active');
      expect(summary.totalValue).toContain('$');
      expect(summary.guaranteed).toContain('$');
      expect(summary.aav).toContain('$');
    });
  });

  // ======================================================
  // 8. Full Contract Lifecycle
  // ======================================================
  describe('full contract lifecycle: create -> use -> restructure -> cut', () => {
    it('should handle a complete contract lifecycle with cap tracking', () => {
      let capState = createSalaryCapState(TEAM_ID, YEAR, SALARY_CAP);

      // Step 1: Sign player
      const contract = createTestContract('lifecycle', 4, 5000, 15000);
      capState = addContract(capState, contract);

      let status = getCapStatus(capState);
      expect(status.currentCapUsage).toBe(20000);

      // Step 2: Restructure to free cap space
      const restructureResult = restructureContract(contract, YEAR, 8000);
      expect(restructureResult.success).toBe(true);

      // Update cap with restructured contract
      capState = removeContract(capState, contract.id);
      capState = addContract(capState, restructureResult.newContract!);

      status = getCapStatus(capState);
      const newCapHit = getCurrentCapHit(restructureResult.newContract!, YEAR);
      expect(newCapHit).toBeLessThan(20000);
      expect(status.currentCapUsage).toBe(newCapHit);

      // Step 3: Advance year
      capState = advanceCapYear(capState, SALARY_CAP);
      expect(capState.currentYear).toBe(YEAR + 1);

      // Step 4: Cut player
      const activeContracts = Array.from(capState.contracts.values());
      if (activeContracts.length > 0) {
        const remainingContract = activeContracts[0];
        const cutResult = executeCut(remainingContract, YEAR + 1, 'standard');
        expect(cutResult.success).toBe(true);

        capState = removeContract(capState, remainingContract.id);
        for (const penalty of cutResult.penalties) {
          capState = addCapPenalty(capState, penalty);
        }

        // Dead money should be recorded
        const finalStatus = getCapStatus(capState);
        expect(finalStatus.currentCapUsage).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
