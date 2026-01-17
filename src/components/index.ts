/**
 * Components Index
 * Export all UI components
 */

// Avatar components
export {
  Avatar,
  generateFaceFeatures,
  generateFaceFeaturesWithAge,
  SKIN_TONES,
  HAIR_COLORS,
  type AvatarProps,
  type AvatarSize,
  type AvatarContext,
  type FaceFeatures,
} from './avatar';

// Gamecast components
export {
  FieldVisualization,
  Scoreboard,
  PlayByPlayFeed,
  SimControls,
  type FieldVisualizationProps,
  type ScoreboardProps,
  type PlayByPlayFeedProps,
  type PlayItem,
  type SimControlsProps,
  type SimulationMode,
} from './gamecast';

// Player components
export {
  SkillRangeDisplay,
  TraitBadges,
  PlayerCard,
  PhysicalAttributesDisplay,
  CollegeStatsDisplay,
  type SkillRangeDisplayProps,
  type TraitBadgesProps,
  type PlayerCardProps,
  type PhysicalAttributesDisplayProps,
  type CollegeStatsDisplayProps,
} from './player';

// Draft components
export {
  ProspectListItem,
  DraftPickCard,
  TradeOfferCard,
  ComparisonModal,
  type ProspectListItemProps,
  type DraftPickCardProps,
  type TradeOfferCardProps,
  type ComparisonModalProps,
} from './draft';
