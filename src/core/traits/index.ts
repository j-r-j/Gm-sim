/**
 * Trait Revelation System
 *
 * This module handles the discovery and revelation of hidden player traits
 * through in-game events and performance patterns.
 *
 * Key Principles:
 * - Traits are NEVER shown as labels until confirmed
 * - The "It" factor is NEVER directly revealed
 * - Revelations happen through gameplay events, not direct observation
 */

// Revelation Triggers - defines when traits can be revealed
export {
  GameEventType,
  GameEventContext,
  RevelationTrigger,
  ConfidenceLevel,
  getConfidenceLevel,
  getTriggersForEvent,
  getTriggerForTrait,
  CLUTCH_TRIGGER,
  IRON_MAN_TRIGGER,
  LEADER_TRIGGER,
  FILM_JUNKIE_TRIGGER,
  COOL_UNDER_PRESSURE_TRIGGER,
  MOTOR_TRIGGER,
  TEAM_FIRST_TRIGGER,
  SCHEME_VERSATILE_TRIGGER,
  CHOKES_TRIGGER,
  INJURY_PRONE_TRIGGER,
  HOT_HEAD_TRIGGER,
  LAZY_TRIGGER,
  LOCKER_ROOM_CANCER_TRIGGER,
  GLASS_HANDS_TRIGGER,
  DISAPPEARS_TRIGGER,
  SYSTEM_DEPENDENT_TRIGGER,
  DIVA_TRIGGER,
  POSITIVE_TRIGGERS,
  NEGATIVE_TRIGGERS,
  ALL_TRIGGERS,
} from './RevelationTriggers';

// Pattern Recognition System - tracks patterns over time
export {
  EventObservation,
  TraitEvidence,
  PlayerPatternData,
  PerformanceStats,
  createPlayerPatternData,
  recordObservation,
  getTraitConfidence,
  getHighConfidenceTraits,
  getAllTraitEvidence,
  shouldConfirmTrait,
  confirmTrait,
  applyEvidenceDecay,
  getPatternSummary,
  validatePlayerPatternData,
} from './PatternRecognitionSystem';

// News Event Generator - generates trait-revealing news
export {
  NewsEvent,
  NewsCategory,
  NewsPriority,
  generateTraitNews,
  generateGameEventNews,
  validateNewsEvent,
  sortNewsByPriority,
} from './NewsEventGenerator';

// Trait Revelation Engine - main engine
export {
  RevelationResult,
  ProcessedEvent,
  RevealedTrait,
  RevelationEngineOptions,
  DEFAULT_ENGINE_OPTIONS,
  getPlayerPatternData,
  setPlayerPatternData,
  clearAllPatternData,
  processGameEvent,
  processMultipleEvents,
  getPotentialTraits,
  getTraitRevelationStatus,
  applySeasonEndDecay,
  getRevealedTraitsSummary,
  processEndOfSeasonRevelations,
  validateRevelationResult,
} from './TraitRevelationEngine';
