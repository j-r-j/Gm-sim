/**
 * AI Trade Offer Generator
 *
 * Generates incoming trade offers from AI teams to the user.
 * AI teams evaluate their needs and the user's roster to propose trades.
 * Offers range from lowball to fair, with occasional great deals.
 */

import { GameState } from '../models/game/GameState';
import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { SkillValue } from '../models/player/TechnicalSkills';

/**
 * A trade offer proposed by an AI team to the user
 */
export interface AITradeOffer {
  id: string;
  /** The AI team making the offer */
  offeringTeamId: string;
  offeringTeamName: string;
  /** What the AI team is offering */
  offering: TradeAsset[];
  /** What the AI team wants from the user */
  requesting: TradeAsset[];
  /** How fair the trade is (0 = terrible for user, 50 = fair, 100 = steal) */
  fairnessScore: number;
  /** AI team's motivation */
  motivation: string;
  /** Expiration week (offer expires after this week) */
  expiresWeek: number;
  /** Whether the user has responded */
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'countered';
  /** When the offer was created */
  createdWeek: number;
}

/**
 * Trade asset (player or draft pick)
 */
export interface TradeAsset {
  type: 'player' | 'draftPick';
  playerId?: string;
  playerName?: string;
  position?: string;
  overallRating?: number;
  pickRound?: number;
  pickYear?: number;
  estimatedValue: number;
}

/**
 * Active trade offers state stored in GameState
 */
export interface TradeOffersState {
  /** Active offers awaiting user response */
  activeOffers: AITradeOffer[];
  /** History of past offers this season */
  offerHistory: AITradeOffer[];
  /** Week of last offer generation */
  lastGeneratedWeek: number;
}

/**
 * Create initial trade offers state
 */
export function createTradeOffersState(): TradeOffersState {
  return {
    activeOffers: [],
    offerHistory: [],
    lastGeneratedWeek: 0,
  };
}

/**
 * Position need mapping
 */
type PositionNeed = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'K';
const POSITION_GROUPS: Record<PositionNeed, string[]> = {
  QB: ['QB'],
  RB: ['RB', 'FB'],
  WR: ['WR'],
  TE: ['TE'],
  OL: ['LT', 'LG', 'C', 'RG', 'RT'],
  DL: ['DT', 'DE'],
  LB: ['MLB', 'OLB'],
  DB: ['CB', 'SS', 'FS'],
  K: ['K', 'P'],
};

/**
 * Evaluate a team's needs based on roster quality
 */
function evaluateTeamNeeds(
  team: Team,
  players: Record<string, Player>
): Array<{ position: PositionNeed; severity: number }> {
  const needs: Array<{ position: PositionNeed; severity: number }> = [];

  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    const groupPlayers = team.rosterPlayerIds
      .map((id) => players[id])
      .filter((p): p is Player => p != null && positions.includes(p.position));

    // Calculate average rating for the group
    const avgRating =
      groupPlayers.length > 0
        ? groupPlayers.reduce((sum, p) => {
            const skills = Object.values(p.skills || {});
            const skillValues = skills
              .filter(
                (s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s
              )
              .map((s) => s.trueValue);
            return (
              sum +
              (skillValues.length > 0
                ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length
                : 50)
            );
          }, 0) / groupPlayers.length
        : 30;

    // Low depth or low quality = high need
    const depthNeed = Math.max(0, 3 - groupPlayers.length) * 10;
    const qualityNeed = Math.max(0, 60 - avgRating);
    const severity = depthNeed + qualityNeed;

    if (severity > 15) {
      needs.push({ position: group as PositionNeed, severity });
    }
  }

  return needs.sort((a, b) => b.severity - a.severity);
}

/**
 * Estimate player trade value
 */
function estimatePlayerValue(player: Player): number {
  const skills = Object.values(player.skills || {});
  const skillValues = skills
    .filter((s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s)
    .map((s) => s.trueValue);
  const avgRating =
    skillValues.length > 0 ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length : 50;

  // Age factor (peak value at 25-28)
  let ageFactor = 1.0;
  if (player.age < 24) ageFactor = 0.85;
  else if (player.age > 30) ageFactor = 0.7;
  else if (player.age > 28) ageFactor = 0.85;

  // Position premium
  const positionPremium: Record<string, number> = {
    QB: 1.5,
    LT: 1.2,
    DE: 1.2,
    CB: 1.15,
    WR: 1.1,
  };
  const posFactor = positionPremium[player.position] || 1.0;

  return Math.round(avgRating * ageFactor * posFactor);
}

/**
 * Generate a unique ID for trade offers
 */
function generateOfferId(week: number, index: number): string {
  return `trade-offer-w${week}-${index}-${Date.now().toString(36)}`;
}

/**
 * Generate trade offers from AI teams for the current week
 * Returns 0-2 offers per week
 */
export function generateWeeklyTradeOffers(gameState: GameState): AITradeOffer[] {
  const offers: AITradeOffer[] = [];
  const week = gameState.league.calendar.currentWeek;
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return offers;

  // Only generate offers during regular season (weeks 1-12, before trade deadline)
  if (week > 12 || week < 1) return offers;

  // 60% chance of getting at least one offer per week
  if (Math.random() > 0.6) return offers;

  const aiTeams = Object.values(gameState.teams).filter((t) => t.id !== gameState.userTeamId);
  const userPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p): p is Player => p != null);

  // Pick 1-2 AI teams to make offers
  const numOffers = Math.random() > 0.5 ? 2 : 1;

  for (let i = 0; i < numOffers; i++) {
    const aiTeam = aiTeams[Math.floor(Math.random() * aiTeams.length)];
    if (!aiTeam) continue;

    const aiNeeds = evaluateTeamNeeds(aiTeam, gameState.players);
    if (aiNeeds.length === 0) continue;

    const topNeed = aiNeeds[0];

    // Find user players that match the AI's need
    const matchingPositions = POSITION_GROUPS[topNeed.position] || [];
    const targetPlayers = userPlayers
      .filter((p) => matchingPositions.includes(p.position))
      .sort((a, b) => estimatePlayerValue(b) - estimatePlayerValue(a));

    if (targetPlayers.length === 0) continue;

    // Pick a target (usually the 2nd or 3rd best, not the star)
    const targetIndex = Math.min(Math.floor(Math.random() * 2) + 1, targetPlayers.length - 1);
    const targetPlayer = targetPlayers[targetIndex];
    const targetValue = estimatePlayerValue(targetPlayer);

    // Generate what the AI team offers
    const offering: TradeAsset[] = [];

    // AI team offers a player from their roster
    const aiPlayers = aiTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null)
      .sort((a, b) => estimatePlayerValue(a) - estimatePlayerValue(b));

    // Offer a player + possibly a pick
    const fairnessRoll = Math.random();
    let fairnessScore: number;

    if (fairnessRoll < 0.2) {
      // Lowball offer (20% chance)
      fairnessScore = 25 + Math.floor(Math.random() * 15);
      const lowPlayer = aiPlayers[Math.floor(aiPlayers.length * 0.3)];
      if (lowPlayer) {
        offering.push({
          type: 'player',
          playerId: lowPlayer.id,
          playerName: `${lowPlayer.firstName} ${lowPlayer.lastName}`,
          position: lowPlayer.position,
          overallRating: estimatePlayerValue(lowPlayer),
          estimatedValue: estimatePlayerValue(lowPlayer),
        });
      }
    } else if (fairnessRoll < 0.7) {
      // Fair offer (50% chance)
      fairnessScore = 45 + Math.floor(Math.random() * 15);
      const fairPlayer = aiPlayers[Math.floor(aiPlayers.length * 0.5)];
      if (fairPlayer) {
        offering.push({
          type: 'player',
          playerId: fairPlayer.id,
          playerName: `${fairPlayer.firstName} ${fairPlayer.lastName}`,
          position: fairPlayer.position,
          overallRating: estimatePlayerValue(fairPlayer),
          estimatedValue: estimatePlayerValue(fairPlayer),
        });
      }

      // Add a pick to sweeten
      const pickRound =
        targetValue > 60 ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2);
      offering.push({
        type: 'draftPick',
        pickRound,
        pickYear: gameState.league.calendar.currentYear + 1,
        estimatedValue: Math.round(80 / pickRound),
      });
    } else {
      // Good offer (30% chance)
      fairnessScore = 60 + Math.floor(Math.random() * 20);
      const goodPlayer = aiPlayers[Math.floor(aiPlayers.length * 0.65)];
      if (goodPlayer) {
        offering.push({
          type: 'player',
          playerId: goodPlayer.id,
          playerName: `${goodPlayer.firstName} ${goodPlayer.lastName}`,
          position: goodPlayer.position,
          overallRating: estimatePlayerValue(goodPlayer),
          estimatedValue: estimatePlayerValue(goodPlayer),
        });
      }

      // Add a better pick
      const pickRound = Math.max(1, 2 + Math.floor(Math.random() * 2));
      offering.push({
        type: 'draftPick',
        pickRound,
        pickYear: gameState.league.calendar.currentYear + 1,
        estimatedValue: Math.round(80 / pickRound),
      });
    }

    const requesting: TradeAsset[] = [
      {
        type: 'player',
        playerId: targetPlayer.id,
        playerName: `${targetPlayer.firstName} ${targetPlayer.lastName}`,
        position: targetPlayer.position,
        overallRating: targetValue,
        estimatedValue: targetValue,
      },
    ];

    // Generate motivation text
    const motivations = [
      `${aiTeam.nickname} are looking to bolster their ${topNeed.position} group`,
      `${aiTeam.nickname} see ${targetPlayer.firstName} ${targetPlayer.lastName} as a missing piece`,
      `${aiTeam.nickname} are making a push and need ${topNeed.position} help`,
      `${aiTeam.nickname} want to address their ${topNeed.position} weakness before the deadline`,
    ];

    offers.push({
      id: generateOfferId(week, i),
      offeringTeamId: aiTeam.id,
      offeringTeamName: `${aiTeam.city} ${aiTeam.nickname}`,
      offering,
      requesting,
      fairnessScore,
      motivation: motivations[Math.floor(Math.random() * motivations.length)],
      expiresWeek: week + 1,
      status: 'pending',
      createdWeek: week,
    });
  }

  return offers;
}

/**
 * Accept a trade offer - swap players/picks between teams
 */
export function acceptTradeOffer(gameState: GameState, offerId: string): GameState {
  const tradeOffers = (gameState as GameState & { tradeOffers?: TradeOffersState }).tradeOffers;
  if (!tradeOffers) return gameState;

  const offer = tradeOffers.activeOffers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'pending') return gameState;

  let updatedTeams = { ...gameState.teams };
  const userTeam = updatedTeams[gameState.userTeamId];
  const aiTeam = updatedTeams[offer.offeringTeamId];

  if (!userTeam || !aiTeam) return gameState;

  // Swap players
  let userRoster = [...userTeam.rosterPlayerIds];
  let aiRoster = [...aiTeam.rosterPlayerIds];

  // Remove requested players from user and add to AI
  for (const asset of offer.requesting) {
    if (asset.type === 'player' && asset.playerId) {
      userRoster = userRoster.filter((id) => id !== asset.playerId);
      aiRoster.push(asset.playerId);
    }
  }

  // Remove offered players from AI and add to user
  for (const asset of offer.offering) {
    if (asset.type === 'player' && asset.playerId) {
      aiRoster = aiRoster.filter((id) => id !== asset.playerId);
      userRoster.push(asset.playerId);
    }
  }

  updatedTeams = {
    ...updatedTeams,
    [gameState.userTeamId]: { ...userTeam, rosterPlayerIds: userRoster },
    [offer.offeringTeamId]: { ...aiTeam, rosterPlayerIds: aiRoster },
  };

  // Update offer status
  const updatedOffers: TradeOffersState = {
    ...tradeOffers,
    activeOffers: tradeOffers.activeOffers.filter((o) => o.id !== offerId),
    offerHistory: [...tradeOffers.offerHistory, { ...offer, status: 'accepted' as const }],
  };

  return {
    ...gameState,
    teams: updatedTeams,
    tradeOffers: updatedOffers,
  } as GameState;
}

/**
 * Reject a trade offer
 */
export function rejectTradeOffer(gameState: GameState, offerId: string): GameState {
  const tradeOffers = (gameState as GameState & { tradeOffers?: TradeOffersState }).tradeOffers;
  if (!tradeOffers) return gameState;

  const offer = tradeOffers.activeOffers.find((o) => o.id === offerId);
  if (!offer) return gameState;

  const updatedOffers: TradeOffersState = {
    ...tradeOffers,
    activeOffers: tradeOffers.activeOffers.filter((o) => o.id !== offerId),
    offerHistory: [...tradeOffers.offerHistory, { ...offer, status: 'rejected' as const }],
  };

  return {
    ...gameState,
    tradeOffers: updatedOffers,
  } as GameState;
}

/**
 * Expire old trade offers
 */
export function expireOldOffers(gameState: GameState, currentWeek: number): GameState {
  const tradeOffers = (gameState as GameState & { tradeOffers?: TradeOffersState }).tradeOffers;
  if (!tradeOffers) return gameState;

  const expired = tradeOffers.activeOffers.filter(
    (o) => o.expiresWeek <= currentWeek && o.status === 'pending'
  );
  const stillActive = tradeOffers.activeOffers.filter(
    (o) => o.expiresWeek > currentWeek || o.status !== 'pending'
  );

  const updatedOffers: TradeOffersState = {
    ...tradeOffers,
    activeOffers: stillActive,
    offerHistory: [
      ...tradeOffers.offerHistory,
      ...expired.map((o) => ({ ...o, status: 'expired' as const })),
    ],
  };

  return {
    ...gameState,
    tradeOffers: updatedOffers,
  } as GameState;
}

/**
 * Process weekly trade offers - generates new offers and expires old ones
 */
export function processWeeklyTradeOffers(gameState: GameState): GameState {
  const week = gameState.league.calendar.currentWeek;

  // Expire old offers
  let updated = expireOldOffers(gameState, week);

  // Generate new offers
  const newOffers = generateWeeklyTradeOffers(updated);

  const currentOffers =
    (updated as GameState & { tradeOffers?: TradeOffersState }).tradeOffers ||
    createTradeOffersState();

  const updatedOffers: TradeOffersState = {
    ...currentOffers,
    activeOffers: [...currentOffers.activeOffers, ...newOffers],
    lastGeneratedWeek: week,
  };

  return {
    ...updated,
    tradeOffers: updatedOffers,
  } as GameState;
}
