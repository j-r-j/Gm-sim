/**
 * Owner Models Index
 * Exports all owner-related models, types, and utilities
 */

// Owner Personality
export {
  OwnerTraits,
  SecondaryTrait,
  ALL_SECONDARY_TRAITS,
  InterventionTriggers,
  OwnerPersonality,
  validateOwnerTraits,
  validateInterventionTriggers,
  validateOwnerPersonality,
  createDefaultOwnerPersonality,
  getSecondaryTraitDescription,
} from './OwnerPersonality';

// Patience Meter
export {
  PatienceModifier,
  PATIENCE_POSITIVE,
  PATIENCE_NEGATIVE,
  ALL_PATIENCE_MODIFIERS,
  JobSecurityLevel,
  PatienceThreshold,
  PATIENCE_THRESHOLDS,
  getJobSecurityLevel,
  getJobSecurityStatus,
  findPatienceModifier,
  calculatePatienceImpact,
  applyPatienceChange,
  wouldBeFired,
  getNextDangerThreshold,
  validatePatienceValue,
} from './PatienceMeter';

// Owner Entity
export {
  OwnerDemandType,
  OwnerDemand,
  NetWorth,
  ALL_NET_WORTH_LEVELS,
  Owner,
  PatienceDescription,
  SpendingDescription,
  ControlDescription,
  LoyaltyDescription,
  OwnerViewModel,
  getPatienceDescription,
  getSpendingDescription,
  getControlDescription,
  getLoyaltyDescription,
  createOwnerViewModel,
  validateOwnerDemand,
  validateOwner,
  createDefaultOwner,
  getOwnerFullName,
  addOwnerDemand,
  removeOwnerDemand,
  updatePatienceMeter,
  updateTrustLevel,
  getNetWorthBudgetMultiplier,
} from './Owner';
