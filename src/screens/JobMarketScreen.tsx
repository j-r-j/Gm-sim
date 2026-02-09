/**
 * JobMarketScreen
 * Displays job openings, interviews, and contract offers during unemployment
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  JobOpening,
  TeamInterest,
  InterestLevel,
  TeamSituation,
  getTeamSituationDescription,
  JobMarketState,
} from '../core/career/JobMarketManager';
import {
  InterviewRecord,
  InterviewStatus,
  InterviewState,
  getOfferSummary,
} from '../core/career/InterviewSystem';

/**
 * Props for JobMarketScreen
 */
export interface JobMarketScreenProps {
  gameState: GameState;
  jobMarket: JobMarketState;
  interviewState: InterviewState;
  onBack: () => void;
  onRequestInterview?: (openingId: string) => void;
  onAcceptOffer?: (interviewId: string) => void;
  onDeclineOffer?: (interviewId: string) => void;
}

/**
 * Gets color for interest level
 */
function getInterestColor(interest: InterestLevel): string {
  switch (interest) {
    case 'elite':
      return colors.success;
    case 'high':
      return colors.primary;
    case 'moderate':
      return colors.warning;
    case 'low':
      return colors.textSecondary;
    case 'none':
      return colors.error;
  }
}

/**
 * Gets display text for interest level
 */
function getInterestText(interest: InterestLevel): string {
  const texts: Record<InterestLevel, string> = {
    elite: 'Elite Interest',
    high: 'High Interest',
    moderate: 'Moderate Interest',
    low: 'Low Interest',
    none: 'No Interest',
  };
  return texts[interest];
}

/**
 * Gets color for team situation
 */
function getSituationColor(situation: TeamSituation): string {
  switch (situation) {
    case 'contender':
      return colors.success;
    case 'playoff_team':
      return colors.primary;
    case 'mediocre':
      return colors.warning;
    case 'rebuilding':
      return colors.textSecondary;
    case 'full_rebuild':
      return colors.error;
  }
}

/**
 * Gets interview status display
 */
function getStatusDisplay(status: InterviewStatus): { text: string; color: string } {
  switch (status) {
    case 'not_requested':
      return { text: 'Not Requested', color: colors.textSecondary };
    case 'requested':
      return { text: 'Requested', color: colors.warning };
    case 'scheduled':
      return { text: 'Scheduled', color: colors.primary };
    case 'completed':
      return { text: 'Completed', color: colors.textSecondary };
    case 'offer_extended':
      return { text: 'Offer Received!', color: colors.success };
    case 'offer_accepted':
      return { text: 'Offer Accepted', color: colors.success };
    case 'offer_declined':
      return { text: 'Declined', color: colors.error };
    case 'rejected':
      return { text: 'Rejected', color: colors.error };
  }
}

/**
 * Job Opening Card Component
 */
function JobOpeningCard({
  opening,
  interest,
  onRequestInterview,
}: {
  opening: JobOpening;
  interest: TeamInterest | null;
  onRequestInterview?: () => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const canRequestInterview = interest && interest.interestLevel !== 'none' && !opening.isFilled;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>
            {opening.teamCity} {opening.teamName}
          </Text>
          {opening.isFilled && (
            <View style={[styles.badge, { backgroundColor: colors.textSecondary + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Filled</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSubtitle}>
          {opening.lastSeasonRecord.wins}-{opening.lastSeasonRecord.losses} • {opening.conference}{' '}
          {opening.division}
        </Text>
      </View>

      {/* Situation Badge */}
      <View style={styles.situationRow}>
        <View
          style={[
            styles.situationBadge,
            { backgroundColor: getSituationColor(opening.situation) + '20' },
          ]}
        >
          <Text style={[styles.situationText, { color: getSituationColor(opening.situation) }]}>
            {getTeamSituationDescription(opening.situation)}
          </Text>
        </View>
      </View>

      {/* Interest Level */}
      {interest && (
        <View style={styles.interestRow}>
          <Text style={styles.interestLabel}>Their Interest:</Text>
          <View
            style={[
              styles.interestBadge,
              { backgroundColor: getInterestColor(interest.interestLevel) + '20' },
            ]}
          >
            <Text
              style={[styles.interestText, { color: getInterestColor(interest.interestLevel) }]}
            >
              {getInterestText(interest.interestLevel)}
            </Text>
          </View>
        </View>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Opening Reason */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Position Opened:</Text>
            <Text style={styles.detailValue}>
              {opening.reason.charAt(0).toUpperCase() + opening.reason.slice(1).replace('_', ' ')}
            </Text>
          </View>

          {/* Owner Info */}
          <View style={styles.ownerSection}>
            <Text style={styles.sectionTitle}>Owner: {opening.ownerName}</Text>
            <View style={styles.ownerTraits}>
              <Text style={styles.ownerTrait}>Patience: {opening.ownerPatience}</Text>
              <Text style={styles.ownerTrait}>Spending: {opening.ownerSpending}</Text>
              <Text style={styles.ownerTrait}>Control: {opening.ownerControl}</Text>
            </View>
          </View>

          {/* Market Info */}
          <View style={styles.marketSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Market Size:</Text>
              <Text style={styles.detailValue}>{opening.marketSize}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Team Prestige:</Text>
              <Text style={styles.detailValue}>{opening.prestige}/100</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fan Expectations:</Text>
              <Text style={styles.detailValue}>{opening.fanbaseExpectations}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Roster Talent:</Text>
              <Text style={styles.detailValue}>{opening.currentRosterTalent}/100</Text>
            </View>
          </View>

          {/* Reasons for/against interest */}
          {interest && (
            <View style={styles.reasonsSection}>
              {interest.reasonsForInterest.length > 0 && (
                <View>
                  <Text style={styles.reasonsTitle}>Why They're Interested:</Text>
                  {interest.reasonsForInterest.map((reason, i) => (
                    <Text key={i} style={styles.reasonFor}>
                      + {reason}
                    </Text>
                  ))}
                </View>
              )}
              {interest.reasonsAgainstInterest.length > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.reasonsTitle}>Concerns:</Text>
                  {interest.reasonsAgainstInterest.map((reason, i) => (
                    <Text key={i} style={styles.reasonAgainst}>
                      - {reason}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Request Interview Button */}
          {canRequestInterview && onRequestInterview && (
            <TouchableOpacity style={styles.requestButton} onPress={onRequestInterview}>
              <Text style={styles.requestButtonText}>Request Interview</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Interview Card Component
 */
function InterviewCard({
  interview,
  onAccept,
  onDecline,
}: {
  interview: InterviewRecord;
  onAccept?: () => void;
  onDecline?: () => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const status = getStatusDisplay(interview.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{interview.teamName}</Text>
        <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {interview.scheduledFor && interview.status === 'scheduled' && (
        <Text style={styles.cardSubtitle}>
          Interview scheduled for Week {interview.scheduledFor}
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Interview Score */}
          {interview.interviewScore !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Interview Performance:</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: interview.interviewScore >= 60 ? colors.success : colors.warning },
                ]}
              >
                {interview.interviewScore}/100
              </Text>
            </View>
          )}

          {/* Owner Preview */}
          {interview.ownerPreview && (
            <View style={styles.ownerPreviewSection}>
              <Text style={styles.sectionTitle}>Owner Insights</Text>
              <Text style={styles.ownerName}>{interview.ownerPreview.fullName}</Text>
              <Text style={styles.ownerDetail}>
                {interview.ownerPreview.yearsAsOwner} years as owner •{' '}
                {interview.ownerPreview.championshipsWon} championships
              </Text>

              <View style={styles.ownerTraitsPreview}>
                <Text style={styles.ownerTrait}>
                  Patience: {interview.ownerPreview.patienceLevel.replace('_', ' ')}
                </Text>
                <Text style={styles.ownerTrait}>
                  Spending: {interview.ownerPreview.spendingLevel.replace('_', ' ')}
                </Text>
                <Text style={styles.ownerTrait}>
                  Control: {interview.ownerPreview.controlLevel.replace('_', ' ')}
                </Text>
              </View>

              <Text style={styles.ownerQuote}>"{interview.ownerPreview.keyQuote}"</Text>

              {interview.ownerPreview.warnings.length > 0 && (
                <View style={styles.warningsSection}>
                  <Text style={styles.warningsTitle}>Red Flags:</Text>
                  {interview.ownerPreview.warnings.map((warning, i) => (
                    <Text key={i} style={styles.warning}>
                      ⚠ {warning}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Contract Offer */}
          {interview.offer && (
            <View style={styles.offerSection}>
              <Text style={styles.sectionTitle}>Contract Offer</Text>
              <Text style={styles.offerSummary}>{getOfferSummary(interview.offer)}</Text>

              <View style={styles.offerDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Autonomy:</Text>
                  <Text style={styles.detailValue}>
                    {interview.offer.autonomyLevel.charAt(0).toUpperCase() +
                      interview.offer.autonomyLevel.slice(1)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Budget:</Text>
                  <Text style={styles.detailValue}>
                    {interview.offer.budgetLevel.charAt(0).toUpperCase() +
                      interview.offer.budgetLevel.slice(1)}
                  </Text>
                </View>
                {interview.offer.signingBonus > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Signing Bonus:</Text>
                    <Text style={styles.detailValue}>
                      ${(interview.offer.signingBonus / 1000).toFixed(0)}k
                    </Text>
                  </View>
                )}
              </View>

              {/* Accept/Decline Buttons */}
              {interview.status === 'offer_extended' && (
                <View style={styles.offerButtons}>
                  <TouchableOpacity
                    style={[styles.offerButton, styles.acceptButton]}
                    onPress={onAccept}
                  >
                    <Text style={styles.acceptButtonText}>Accept Offer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.offerButton, styles.declineButton]}
                    onPress={onDecline}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Rejection Reason */}
          {interview.rejectionReason && (
            <View style={styles.rejectionSection}>
              <Text style={styles.rejectionText}>{interview.rejectionReason}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Job Market Screen Component
 */
export function JobMarketScreen({
  jobMarket,
  interviewState,
  onBack,
  onRequestInterview,
  onAcceptOffer,
  onDeclineOffer,
}: JobMarketScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'openings' | 'interviews' | 'offers'>('openings');

  // Get open positions
  const openPositions = jobMarket.openings.filter((o) => !o.isFilled);
  const filledPositions = jobMarket.openings.filter((o) => o.isFilled);

  // Get interviews by status
  const scheduledInterviews = interviewState.interviews.filter((i) => i.status === 'scheduled');
  const completedInterviews = interviewState.interviews.filter(
    (i) => i.status === 'completed' || i.status === 'rejected'
  );
  const activeOffers = interviewState.interviews.filter(
    (i) => i.status === 'offer_extended' && i.offer !== null
  );

  // Get interest for an opening
  const getInterestForOpening = (openingId: string): TeamInterest | null => {
    return jobMarket.teamInterests.find((ti) => ti.openingId === openingId) || null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Job Market" onBack={onBack} testID="job-market-header" />

      {/* Reputation Info */}
      <View style={styles.reputationBar}>
        <Text style={styles.reputationLabel}>Your Reputation:</Text>
        <Text style={styles.reputationValue}>
          {jobMarket.playerReputationTier} ({jobMarket.playerReputationScore}/100)
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'openings' && styles.tabActive]}
          onPress={() => setActiveTab('openings')}
        >
          <Text style={[styles.tabText, activeTab === 'openings' && styles.tabTextActive]}>
            Openings ({openPositions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'interviews' && styles.tabActive]}
          onPress={() => setActiveTab('interviews')}
        >
          <Text style={[styles.tabText, activeTab === 'interviews' && styles.tabTextActive]}>
            Interviews ({scheduledInterviews.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.tabActive]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
            Offers ({activeOffers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Openings Tab */}
        {activeTab === 'openings' && (
          <View style={styles.section}>
            {openPositions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No open GM positions at this time</Text>
                <Text style={styles.emptyStateHint}>
                  Positions open during the offseason after firings or resignations
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionHeader}>
                  {openPositions.length} Open Position{openPositions.length !== 1 ? 's' : ''}
                </Text>
                {openPositions.map((opening) => (
                  <JobOpeningCard
                    key={opening.id}
                    opening={opening}
                    interest={getInterestForOpening(opening.id)}
                    onRequestInterview={
                      onRequestInterview ? () => onRequestInterview(opening.id) : undefined
                    }
                  />
                ))}

                {filledPositions.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
                      Recently Filled
                    </Text>
                    {filledPositions.map((opening) => (
                      <JobOpeningCard key={opening.id} opening={opening} interest={null} />
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Interviews Tab */}
        {activeTab === 'interviews' && (
          <View style={styles.section}>
            {scheduledInterviews.length === 0 && completedInterviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No interviews scheduled</Text>
                <Text style={styles.emptyStateHint}>
                  Request interviews from the Openings tab to begin the hiring process
                </Text>
              </View>
            ) : (
              <>
                {scheduledInterviews.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>Upcoming Interviews</Text>
                    {scheduledInterviews.map((interview) => (
                      <InterviewCard key={interview.id} interview={interview} />
                    ))}
                  </>
                )}

                {completedInterviews.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
                      Past Interviews
                    </Text>
                    {completedInterviews.map((interview) => (
                      <InterviewCard key={interview.id} interview={interview} />
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <View style={styles.section}>
            {activeOffers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No active offers</Text>
                <Text style={styles.emptyStateHint}>
                  Complete interviews to potentially receive contract offers
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionHeader}>
                  {activeOffers.length} Active Offer{activeOffers.length !== 1 ? 's' : ''}
                </Text>
                {activeOffers.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    onAccept={onAcceptOffer ? () => onAcceptOffer(interview.id) : undefined}
                    onDecline={onDeclineOffer ? () => onDeclineOffer(interview.id) : undefined}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  reputationBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  reputationLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reputationValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  situationRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  situationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  situationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  interestLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  interestBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  interestText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  ownerSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  ownerTraits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ownerTrait: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  marketSection: {
    marginTop: spacing.md,
  },
  reasonsSection: {
    marginTop: spacing.md,
  },
  reasonsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reasonFor: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  reasonAgainst: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  requestButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  requestButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  ownerPreviewSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  ownerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ownerDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  ownerTraitsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  ownerQuote: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: colors.text,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
  },
  warningsSection: {
    marginTop: spacing.md,
  },
  warningsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  warning: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  offerSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  offerSummary: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  offerDetails: {
    marginTop: spacing.sm,
  },
  offerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  offerButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  declineButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  rejectionSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
  },
  rejectionText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
