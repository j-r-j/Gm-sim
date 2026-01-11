/**
 * Career Module Index
 * Exports all career-related systems for owner personality and management
 */

// Owner Personality Engine
export {
  MarketSize,
  TeamContext,
  PersonalityArchetype,
  OwnerGenerationOptions,
  OwnerPersonalitySummary,
  selectArchetypeFromContext,
  generateOwnerTraits,
  generateSecondaryTraits,
  generateInterventionTriggers,
  generateOwnerPersonality,
  generateNetWorth,
  generateOwnerHistory,
  generateOwner,
  getOwnerPersonalitySummary,
  getArchetypeDescription,
} from './OwnerPersonalityEngine';

// Interference System
export {
  TeamState,
  InterventionTrigger,
  ComplianceRecord,
  InterferenceConsequence,
  InterferenceState,
  createInterferenceState,
  detectLosingStreakIntervention,
  detectFanApprovalIntervention,
  detectMediaScrutinyIntervention,
  detectSeasonPerformanceIntervention,
  detectEgoIntervention,
  detectAllInterventions,
  getMostSevereTrigger,
  recordCompliance,
  recordDefiance,
  trackNewDemand,
  calculateComplianceConsequence,
  calculateDefianceConsequence,
  checkExpiredDemands,
  applyInterferenceConsequence,
  getComplianceRate,
  getComplianceDescription,
  shouldGenerateDemand,
} from './InterferenceSystem';

// Owner Demand Generator
export {
  PlayerInfo,
  CoachInfo,
  ProspectInfo,
  DemandContext,
  selectDemandType,
  generateSignPlayerDemand,
  generateFireCoachDemand,
  generateDraftPlayerDemand,
  generateTradeForDemand,
  generateOtherDemand,
  generateDemand,
  getDemandUrgency,
  getDemandDisplayInfo,
  isDemandSatisfied,
} from './OwnerDemandGenerator';

// Owner Mood System
export {
  OwnerMood,
  MoodEventType,
  MoodEvent,
  OwnerMoodState,
  createOwnerMoodState,
  getMoodFromValue,
  getMoodDescription,
  createMoodEvent,
  processMoodEvent,
  getMoodTrend,
  getStreakDescription,
  applyMoodDecay,
  getRecentEventsSummary,
  getOwnerSentiment,
  shouldMakePublicStatement,
  generateOwnerStatement,
} from './OwnerMoodSystem';

// Ownership Change System
export {
  OwnershipChangeType,
  OwnershipChangeEvent,
  LeagueOwnershipState,
  createLeagueOwnershipState,
  generateOwnerName,
  calculateOwnershipChangeProbability,
  determineChangeType,
  generateChangeDescription,
  determineGMRetention,
  createNewOwner,
  processOwnershipChange,
  checkLeagueOwnershipChanges,
  getOwnershipChangeSummary,
  getTeamOwnershipHistory,
  initializeTeamOwnership,
} from './OwnershipChangeSystem';
