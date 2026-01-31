/**
 * Contract System
 * Complete contract system with salary cap, restructures, franchise tags, and dead money.
 */

// ============================================
// Contract Model
// ============================================
export {
  // Types
  ContractStatus,
  ContractType,
  ContractYear,
  PlayerContract,
  ContractOffer,
  ContractSummary,
  // Constants
  VETERAN_MINIMUM_SALARY,
  // Functions
  createContractId,
  calculateYearlyBreakdown,
  createPlayerContract,
  getCapHitForYear,
  getCurrentCapHit,
  getRemainingBonus,
  getRemainingGuaranteed,
  calculateDeadMoney,
  calculateCapSavings,
  advanceContractYear,
  isExpiringContract,
  getContractEndYear,
  getContractSummary,
  validatePlayerContract,
  getMinimumSalary,
  createMinimumContract,
  // Backward compatibility helpers
  calculatePostJune1DeadMoney,
  getOfferTotalValue,
  getOfferGuaranteedMoney,
  createContractOffer,
  // Trade clause enforcement
  canTradePlayer,
  hasNoTradeClauseApproval,
  // Types
  PostJune1DeadMoney,
} from './Contract';

// ============================================
// Salary Cap Manager
// ============================================
export {
  // Types
  CapPenalty,
  CapProjection,
  CapStatus,
  SalaryCapState,
  // Functions
  createSalaryCapState,
  addContract,
  removeContract,
  addCapPenalty,
  calculateCapUsage,
  getTop51CapHits,
  calculateDeadMoney as calculateCapDeadMoney,
  getCapStatus,
  projectCap,
  calculateRollover,
  advanceCapYear,
  getContractsByCapHit,
  getExpiringContracts,
  canAffordContract,
  getEffectiveCapSpace,
  getCapSummary,
  validateSalaryCapState,
  syncTeamFinances,
} from './SalaryCapManager';

// ============================================
// Restructure System
// ============================================
export {
  // Types
  RestructureType,
  RestructureDetails,
  RestructureResult,
  RestructurePreview,
  // Functions
  getMaxRestructureAmount,
  calculateProration,
  previewRestructure,
  restructureContract,
  executePayCut,
  getRestructureOptions,
  projectRestructureImpact,
} from './RestructureSystem';

// ============================================
// Franchise Tag System
// ============================================
export {
  // Types
  FranchiseTagType,
  FranchiseTag,
  TeamTagStatus,
  PositionTagComparison,
  TagDifferences,
  TagCapImpact,
  // Constants
  FRANCHISE_TAG_VALUES,
  // Functions
  getFranchiseTagValue,
  getTransitionTagValue,
  createTeamTagStatus,
  canUseFranchiseTag,
  canUseTransitionTag,
  applyFranchiseTag,
  removeFranchiseTag,
  getPositionTagComparisons,
  getTagDifferences,
  advanceTagYear,
  validateFranchiseTag,
  getTagStatusSummary,
} from './FranchiseTagSystem';

// ============================================
// Cut Calculator
// ============================================
export {
  // Types
  CutType,
  CutAnalysis,
  CutBreakdown,
  CutResult,
  CutCandidate,
  // Functions
  analyzeStandardCut,
  analyzePostJune1Cut,
  analyzeDesignatedPostJune1Cut,
  getCutBreakdown,
  createCutPenalties,
  executeCut,
  rankCutCandidates,
  getCutSummary,
  validateCut,
} from './CutCalculator';

// ============================================
// Extension System
// ============================================
export {
  // Types
  MarketTier,
  PlayerValuation,
  PlayerDemands,
  NegotiationResult,
  ExtensionResult,
  // Functions
  determineMarketTier,
  calculateMarketValue,
  generatePlayerDemands,
  evaluateOffer,
  extendContract,
  getExtensionEligible,
  calculateRecommendedOffer,
  getExtensionSummary,
} from './ExtensionSystem';

// ============================================
// Contract Generator
// ============================================
export {
  // Functions
  determineSkillTierFromPlayer,
  calculateContractValue,
  generatePlayerContract,
  generateRosterContracts,
  calculateTotalCapUsage,
  calculateFutureCommitments,
  getTeamContracts,
  validateTeamCapUsage,
} from './ContractGenerator';

// ============================================
// Offer Evaluation System
// ============================================
export {
  // Types
  InterestLevel,
  OfferEvaluation,
  PlayerExpectations,
  // Functions
  calculatePlayerExpectations,
  evaluateContractOffer,
  getPlayerPrioritiesDescription,
  suggestOfferImprovements,
  formatMoney,
  getOfferSummary,
} from './OfferEvaluation';
